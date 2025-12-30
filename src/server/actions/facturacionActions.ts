'use server';

import { getDb } from '@/lib/firestore-admin';
import { createDTE } from '@/server/lioren';
import type { CotizacionFirestore } from '@/lib/types';

// --- 1. TEST DE CONEXIÓN ---
export async function probarConexionLioren() {
  const token = process.env.LIOREN_TOKEN;
  if (!token) return { success: false, error: "Token no encontrado" };
  try {
    const response = await fetch('https://www.lioren.cl/api/whoami', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token.trim()}` },
      cache: 'no-store',
    });
    const data = await response.json();
    return { success: response.ok, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- 2. FACTURACIÓN INDIVIDUAL ---
export async function ejecutarFacturacionSiiV2(cotizacionId: string) {
  let trace = "INICIO";
  try {
    trace = "1: DB Setup";
    const db = getDb();
    const docRef = db.collection('cotizaciones').doc(cotizacionId);
    const snap = await docRef.get();
    if (!snap.exists) throw new Error("ID no existe");
    
    const data = snap.data() as CotizacionFirestore;
    const detalles = (data.solicitudesData || []).flatMap((sol: any) => 
      (sol.examenes || []).map((ex: any) => ({
        nombre: `${ex.nombre} - ${sol.trabajador.nombre}`,
        cantidad: 1,
        precio: Math.round(Number(ex.valor)),
        exento: true 
      }))
    );

    const payload = {
      tipodoc: "34",
      receptor: {
        rut: "77102661-3", // Empresa de Pruebas
        rs: "EMPRESA DE PRUEBA ARAVAL",
        giro: "SERVICIOS MEDICOS",
        comuna: "SANTIAGO",
        ciudad: "SANTIAGO",
        dir: "SARGENTO ALDEA 387",
        email: "tu-correo@gmail.com"
      },
      detalles: detalles,
      montos: { neto: 0, exento: Math.round(data.total), iva: 0, total: Math.round(data.total) },
      expect_all: true
    };

    const result = await createDTE(payload);
    await docRef.update({
      status: 'FACTURADO',
      liorenFolio: result.folio.toString(),
      liorenPdfUrl: result.url_pdf_cedible || result.url_pdf,
      liorenFechaEmision: new Date().toISOString()
    });
    return { success: true, folio: result.folio };
  } catch (error: any) {
    return { success: false, error: `ERROR EN [${trace}]: ${error.message}` };
  }
}

// --- 3. FACTURACIÓN CONSOLIDADA ---
export async function emitirDTEConsolidado(rutCliente: string) {
  try {
    const db = getDb();
    const snapshot = await db.collection('cotizaciones')
      .where('empresaData.rut', '==', rutCliente)
      .where('status', '==', 'orden_examen_enviada')
      .get();

    if (snapshot.empty) throw new Error("No hay órdenes acumuladas.");

    const result = { folio: 999, url_pdf: "#" }; // Placeholder para no gastar folios en el build
    return { success: true, folio: result.folio };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
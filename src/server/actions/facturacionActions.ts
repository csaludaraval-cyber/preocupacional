'use server';

import { getDb } from '@/lib/firestore-admin';
import { createDTE } from '@/server/lioren';
import type { CotizacionFirestore } from '@/lib/types';

// 1. TEST DE CONEXIÓN (Diagnóstico)
export async function probarConexionLioren() {
  const token = process.env.LIOREN_TOKEN;
  if (!token) return { success: false, error: "Token no encontrado en Secret Manager" };
  try {
    const response = await fetch('https://www.lioren.cl/api/whoami', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token.trim()}`, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    const data = await response.json();
    return { success: response.ok, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. FACTURACIÓN V2 (Certificación)
export async function ejecutarFacturacionSiiV2(cotizacionId: string) {
  let trace = "INICIO";
  try {
    trace = "1: DB Setup";
    const db = getDb();
    trace = "2: Referencia";
    const docRef = db.collection('cotizaciones').doc(cotizacionId);
    trace = "3: Lectura";
    const snap = await docRef.get();
    if (!snap.exists) throw new Error("ID no existe");
    
    const data = snap.data() as CotizacionFirestore;
    trace = "6: Payload";
    const payload = {
      tipodoc: "34",
      receptor: {
        rut: "77102661-3", // Facturamos a la misma empresa de pruebas
        rs: "EMPRESA DE PRUEBA ARAVAL",
        giro: "SERVICIOS MEDICOS",
        comuna: "SANTIAGO",
        ciudad: "SANTIAGO",
        dir: "SARGENTO ALDEA 387",
        email: "tu-correo@gmail.com"
      },
      detalles: (data.solicitudesData || []).flatMap((sol: any) => 
        (sol.examenes || []).map((ex: any) => ({
          nombre: `${ex.nombre} - ${sol.trabajador.nombre}`,
          cantidad: 1,
          precio: Math.round(Number(ex.valor)),
          exento: true 
        }))
      ),
      montos: { 
        neto: 0, 
        exento: Math.round(Number(data.total)), 
        iva: 0, 
        total: Math.round(Number(data.total)) 
      },
      expect_all: true
    };

    trace = "7: API Lioren";
    const result = await createDTE(payload);

    trace = "8: Grabando";
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
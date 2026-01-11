'use server';

import { getDb } from '@/lib/firestore-admin';
import { createDTE, whoami } from '@/server/lioren';
import { cleanRut, normalizarUbicacionLioren } from '@/lib/utils';
import type { CotizacionFirestore } from '@/lib/types';

/**
 * 1. TEST DE CONEXIÓN (DIAGNÓSTICO)
 */
export async function probarConexionLioren() {
  try {
    const data = await whoami();
    const ubicacion = await normalizarUbicacionLioren("TALTAL");
    const nombreEmpresa = data.rs || data.razon_social || "Empresa Araval";
    return { 
      success: true, 
      message: `Conexión exitosa con Lioren. Empresa: ${nombreEmpresa}. ID Localidad Detectado: ${ubicacion.id}`
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 2. FACTURACIÓN INDIVIDUAL (MODALIDAD NORMAL)
 * Estrategia: SET MERGE para forzar escritura en Firestore.
 */
export async function ejecutarFacturacionSiiV2(cotizacionId: string) {
  let trace = "INICIO";
  try {
    const db = getDb();
    const docRef = db.collection('cotizaciones').doc(cotizacionId);
    const snap = await docRef.get();
    if (!snap.exists) throw new Error("Cotización no encontrada.");
    const data = snap.data() as CotizacionFirestore;

    trace = "Mapeo de Comuna";
    const ubicacion = await normalizarUbicacionLioren(data.empresaData?.comuna);

    trace = "Construyendo Payload";
    const payload = {
      tipodoc: "34",
      emisor: { tipodoc: "34", fecha: new Date().toISOString().split('T')[0], casilla: 0 },
      receptor: {
        rut: cleanRut(data.empresaData?.rut || ''),
        rs: (data.empresaData?.razonSocial || '').toUpperCase().substring(0, 100),
        giro: (data.empresaData?.giro || "SERVICIOS MEDICOS").toUpperCase().substring(0, 40),
        direccion: (data.empresaData?.direccion || "DIRECCION").toUpperCase().substring(0, 70),
        comuna: ubicacion.id, 
        ciudad: ubicacion.id,
        email: data.empresaData?.email || data.solicitanteData?.mail || "soporte@araval.cl"
      },
      detalles: (data.solicitudesData || []).flatMap((sol: any) =>
        (sol.examenes || []).map((ex: any) => ({
          nombre: `${ex.nombre} - ${sol.trabajador?.nombre || 'S/N'}`.substring(0, 80),
          cantidad: 1, precio: Math.round(Number(ex.valor || 0)), exento: true
        }))
      ),
      expect_all: true
    };

    trace = "Llamada a Lioren";
    const result = await createDTE(payload);

    // EXTRACCIÓN ROBUSTA DEL ID
    const finalId = result.id || result.dte_id || (result.dte && result.dte.id) || "";
    const finalFolio = result.folio || (result.dte && result.dte.folio) || "";

    if (!finalId) {
      console.error("LIOREN SIN ID:", result);
      throw new Error("Lioren no devolvió un ID de documento válido.");
    }

    trace = "Escribiendo en Firestore (SET MERGE)";
    // Usamos set({ ... }, { merge: true }) para garantizar la escritura
    await docRef.set({
      status: 'FACTURADO',
      liorenId: String(finalId),       // Principal
      liorenid: String(finalId),       // Respaldo minúsculas
      liorenFolio: String(finalFolio),
      liorenPdfUrl: result.url_pdf || result.url_pdf_cedible || "",
      liorenFechaEmision: new Date().toISOString(),
      liorenRawResponse: JSON.stringify(result) // Auditoría completa
    }, { merge: true });

    return { success: true, folio: finalFolio, liorenId: String(finalId) };
  } catch (error: any) {
    console.error(`ERROR EN FACTURACIÓN [${trace}]:`, error.message);
    throw new Error(error.message);
  }
}

/**
 * 3. FACTURACIÓN CONSOLIDADA (MODALIDAD FRECUENTE)
 * Agrupa múltiples órdenes en una sola factura masiva.
 */
export async function emitirDTEConsolidado(rutEmpresa: string) {
  let trace = "INICIO CONSOLIDACIÓN";
  try {
    const db = getDb();
    const snap = await db.collection('cotizaciones')
      .where('empresaData.rut', '==', rutEmpresa)
      .where('status', '==', 'PAGADO')
      .get();

    if (snap.empty) throw new Error("No hay órdenes PAGADAS para este RUT.");

    const docs = snap.docs;
    const base = docs[0].data() as CotizacionFirestore;
    
    trace = "Mapeo Ubicación Grupal";
    const ubicacion = await normalizarUbicacionLioren(base.empresaData?.comuna);

    trace = "Construyendo Payload Consolidado";
    const todosLosDetalles = docs.flatMap(doc => {
      const d = doc.data() as CotizacionFirestore;
      return (d.solicitudesData || []).flatMap((sol: any) =>
        (sol.examenes || []).map((ex: any) => ({
          nombre: `${ex.nombre} (Ref: ${doc.id.slice(-4)})`.substring(0, 80),
          cantidad: 1, precio: Math.round(Number(ex.valor || 0)), exento: true
        }))
      );
    });

    const result = await createDTE({
      tipodoc: "34",
      emisor: { tipodoc: "34", fecha: new Date().toISOString().split('T')[0], casilla: 0 },
      receptor: {
        rut: cleanRut(rutEmpresa),
        rs: (base.empresaData?.razonSocial || "CONSOLIDADO").toUpperCase(),
        giro: (base.empresaData?.giro || "SERVICIOS MEDICOS").toUpperCase(),
        direccion: (base.empresaData?.direccion || "DIRECCION").toUpperCase(),
        comuna: ubicacion.id,
        ciudad: ubicacion.id,
        email: base.empresaData?.email || "soporte@araval.cl"
      },
      detalles: todosLosDetalles,
      expect_all: true
    });

    // Extracción robusta ID Consolidado
    const finalId = result.id || result.dte_id || (result.dte && result.dte.id) || "";
    const finalFolio = result.folio || (result.dte && result.dte.folio) || "";

    if (!finalId) throw new Error("Consolidación exitosa pero sin ID de retorno.");

    trace = "Actualización Masiva (Batch)";
    const batch = db.batch();
    
    docs.forEach(d => {
      batch.update(d.ref, { 
        status: 'FACTURADO', 
        liorenFolio: String(finalFolio), 
        liorenId: String(finalId),
        liorenid: String(finalId), // Respaldo
        liorenPdfUrl: result.url_pdf || "", 
        liorenConsolidado: true,
        liorenFechaEmision: new Date().toISOString()
      });
    });
    
    await batch.commit();
    return { success: true, folio: finalFolio, count: docs.length, liorenId: String(finalId) };

  } catch (error: any) {
    console.error("ERROR CONSOLIDADO:", error.message);
    throw new Error(error.message);
  }
}
'use server';

import { getDb } from '@/lib/firestore-admin';
import { createDTE, whoami } from '@/server/lioren';
import { cleanRut, normalizarUbicacionLioren } from '@/lib/utils';
import type { CotizacionFirestore } from '@/lib/types';

/**
 * 1. TEST DE CONEXIÓN (MÁXIMA SIMPLICIDAD)
 */
export async function probarConexionLioren() {
  try {
    console.log("SERVER LOG: Iniciando whoami...");
    const data = await whoami();
    
    console.log("SERVER LOG: Iniciando mapeo Taltal...");
    const ubicacion = await normalizarUbicacionLioren("TALTAL");
    
    return { 
      success: true, 
      message: `Conexión exitosa con Lioren. Razón Social: ${data.rs}. ID Taltal detectado: ${ubicacion.id}`
    };
  } catch (error: any) {
    console.error("SERVER ERROR:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 2. FACTURACIÓN INDIVIDUAL
 */
export async function ejecutarFacturacionSiiV2(cotizacionId: string) {
  try {
    const db = getDb();
    const docRef = db.collection('cotizaciones').doc(cotizacionId);
    const snap = await docRef.get();
    if (!snap.exists) throw new Error("Cotización no encontrada.");
    const data = snap.data() as CotizacionFirestore;

    const ubicacion = await normalizarUbicacionLioren(data.empresaData?.comuna);

    const payload = {
      tipodoc: "34",
      emisor: { tipodoc: "34", fecha: new Date().toISOString().split('T')[0], casilla: 0 },
      receptor: {
        rut: cleanRut(data.empresaData?.rut || ''),
        rs: (data.empresaData?.razonSocial || '').toUpperCase().substring(0, 100),
        giro: (data.empresaData?.giro || "SERVICIOS MEDICOS").toUpperCase().substring(0, 40),
        direccion: (data.empresaData?.direccion || "DIRECCION").toUpperCase().substring(0, 70),
        comuna: ubicacion.id, // ID ENTERO
        ciudad: ubicacion.id,  // ID ENTERO
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

    const result = await createDTE(payload);
    const pdfUrl = result.url_pdf_cedible || result.url_pdf || "";

    await docRef.update({
      status: 'FACTURADO',
      liorenFolio: result.folio.toString(),
      liorenPdfUrl: pdfUrl,
      liorenFechaEmision: new Date().toISOString()
    });

    return { success: true, folio: result.folio };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * 3. FACTURACIÓN CONSOLIDADA
 */
export async function emitirDTEConsolidado(rutEmpresa: string) {
  try {
    const db = getDb();
    const snap = await db.collection('cotizaciones').where('empresaData.rut', '==', rutEmpresa).where('status', '==', 'PAGADO').get();
    if (snap.empty) throw new Error("Sin órdenes.");
    const docs = snap.docs;
    const base = docs[0].data() as CotizacionFirestore;
    const ubicacion = await normalizarUbicacionLioren(base.empresaData?.comuna);

    const result = await createDTE({
      tipodoc: "34",
      emisor: { tipodoc: "34", fecha: new Date().toISOString().split('T')[0], casilla: 0 },
      receptor: {
        rut: cleanRut(rutEmpresa), rs: (base.empresaData?.razonSocial || "CONSOLIDADO").toUpperCase(),
        giro: (base.empresaData?.giro || "SERVICIOS MEDICOS").toUpperCase(),
        direccion: (base.empresaData?.direccion || "DIRECCION").toUpperCase(),
        comuna: ubicacion.id, ciudad: ubicacion.id, email: base.empresaData?.email || "soporte@araval.cl"
      },
      detalles: docs.flatMap(d => (d.data().solicitudesData || []).flatMap((s:any) => s.examenes.map((e:any) => ({
        nombre: `${e.nombre} (Ref: ${d.id.slice(-4)})`,
        cantidad: 1, precio: Math.round(Number(e.valor || 0)), exento: true
      })))),
      expect_all: true
    });

    const batch = db.batch();
    docs.forEach(d => batch.update(d.ref, { 
      status: 'FACTURADO', liorenFolio: result.folio.toString(), 
      liorenPdfUrl: result.url_pdf_cedible || result.url_pdf || "", liorenConsolidado: true,
      liorenFechaEmision: new Date().toISOString()
    }));
    await batch.commit();
    return { success: true, folio: result.folio };
  } catch (error: any) { throw new Error(error.message); }
}
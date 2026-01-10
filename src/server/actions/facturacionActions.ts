'use server';

import { getDb } from '@/lib/firestore-admin';
import { createDTE, whoami } from '@/server/lioren';
import { cleanRut, normalizarUbicacionLioren } from '@/lib/utils';
import type { CotizacionFirestore } from '@/lib/types';

/**
 * TEST DE CONEXIÓN
 * Nos dirá qué ID está detectando para Taltal.
 */
export async function probarConexionLioren() {
  try {
    const data = await whoami();
    const ubicacion = await normalizarUbicacionLioren("TALTAL");
    return { 
      success: true, 
      data: { rs: `${data.rs} (ID Taltal detectado: ${ubicacion.id})`, rut: data.rut } 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function ejecutarFacturacionSiiV2(cotizacionId: string) {
  let trace = "INICIO";
  try {
    const db = getDb();
    const docRef = db.collection('cotizaciones').doc(cotizacionId);
    const snap = await docRef.get();
    if (!snap.exists) throw new Error("Cotización no encontrada.");
    const data = snap.data() as CotizacionFirestore;

    trace = "Normalizando Ubicación con API";
    const ubicacion = await normalizarUbicacionLioren(data.empresaData?.comuna);

    trace = "Construyendo Payload para Lioren";
    const payload = {
      tipodoc: "34", // Factura Exenta
      emisor: {
        tipodoc: "34",
        fecha: new Date().toISOString().split('T')[0],
        casilla: 0
      },
      receptor: {
        rut: cleanRut(data.empresaData?.rut || ''),
        rs: (data.empresaData?.razonSocial || '').toUpperCase().substring(0, 100),
        giro: (data.empresaData?.giro || "SERVICIOS MEDICOS").toUpperCase().substring(0, 40),
        dir: (data.empresaData?.direccion || "DIRECCION").toUpperCase().substring(0, 70),
        comuna: ubicacion.id, // ENVIAMOS EL NÚMERO ENTERO ENCONTRADO
        ciudad: ubicacion.id,  // ENVIAMOS EL NÚMERO ENTERO ENCONTRADO
        email: data.empresaData?.email || data.solicitanteData?.mail || "soporte@araval.cl"
      },
      detalles: (data.solicitudesData || []).flatMap((sol: any) =>
        (sol.examenes || []).map((ex: any) => ({
          nombre: `${ex.nombre} - ${sol.trabajador?.nombre || 'S/N'}`.substring(0, 80),
          cantidad: 1,
          precio: Math.round(Number(ex.valor || 0)),
          exento: true
        }))
      ),
      expect_all: true // Asegura que recibamos el PDF en la respuesta
    };

    trace = "Llamando a API Lioren";
    const result = await createDTE(payload);

    trace = "Guardando Datos en Firestore";
    // Atrapamos la URL del PDF según documentación oficial
    const pdfUrl = result.url_pdf_cedible || result.url_pdf || result.pdf || "";
    const folioDTE = result.folio ? result.folio.toString() : "0";

    await docRef.update({
      status: 'FACTURADO',
      liorenFolio: folioDTE,
      liorenId: result.id || "",
      liorenPdfUrl: pdfUrl,
      liorenFechaEmision: new Date().toISOString()
    });

    return { success: true, folio: folioDTE };
  } catch (error: any) {
    console.error(`ERROR EN [${trace}]:`, error.message);
    throw new Error(error.message);
  }
}

/**
 * EMITIR DTE CONSOLIDADO
 */
export async function emitirDTEConsolidado(rutEmpresa: string) {
  try {
    const db = getDb();
    const snap = await db.collection('cotizaciones').where('empresaData.rut', '==', rutEmpresa).where('status', '==', 'PAGADO').get();
    if (snap.empty) throw new Error("No hay órdenes pendientes.");
    const docs = snap.docs;
    const base = docs[0].data() as CotizacionFirestore;
    const ubicacion = await normalizarUbicacionLioren(base.empresaData?.comuna);

    const payload = {
      tipodoc: "34",
      emisor: { tipodoc: "34", fecha: new Date().toISOString().split('T')[0], casilla: 0 },
      receptor: {
        rut: cleanRut(rutEmpresa),
        rs: (base.empresaData?.razonSocial || "CONSOLIDADO").toUpperCase(),
        giro: (base.empresaData?.giro || "SERVICIOS MEDICOS").toUpperCase(),
        dir: (base.empresaData?.direccion || "DIRECCION").toUpperCase(),
        comuna: ubicacion.id,
        ciudad: ubicacion.id,
        email: base.empresaData?.email || "soporte@araval.cl"
      },
      detalles: docs.flatMap(d => (d.data().solicitudesData || []).flatMap((s:any) => s.examenes.map((e:any) => ({
        nombre: `${e.nombre} (Ref: ${d.id.slice(-4)})`,
        cantidad: 1, precio: Math.round(Number(e.valor || 0)), exento: true
      })))),
      expect_all: true
    };

    const result = await createDTE(payload);
    const pdfUrl = result.url_pdf_cedible || result.url_pdf || "";
    const batch = db.batch();
    docs.forEach(d => batch.update(d.ref, { 
      status: 'FACTURADO', liorenFolio: result.folio.toString(), 
      liorenPdfUrl: pdfUrl, liorenConsolidado: true, liorenFechaEmision: new Date().toISOString()
    }));
    await batch.commit();
    return { success: true, folio: result.folio };
  } catch (error: any) { throw new Error(error.message); }
}
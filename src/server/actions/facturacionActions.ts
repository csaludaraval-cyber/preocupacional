'use server';

import { getDb } from '@/lib/firestore-admin';
import { createDTE, whoami } from '@/server/lioren';
import { cleanRut, normalizarUbicacionLioren } from '@/lib/utils';
import type { CotizacionFirestore } from '@/lib/types';

export async function probarConexionLioren() {
  try {
    const data = await whoami();
    const ubicacion = await normalizarUbicacionLioren("TALTAL");
    return { success: true, message: `Conexión OK. ID Taltal: ${ubicacion.id}` };
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

    // EXTRACCIÓN DEL ID (Según tu log es result.id)
    const lId = (result.id || result.dte_id || "").toString();
    const lFolio = (result.folio || "").toString();

    if (!lId) {
        console.error("Respuesta sin ID:", result);
        throw new Error("Lioren no entregó un ID de documento.");
    }

    trace = "Actualizando Firestore";
    // GUARDADO REDUNDANTE PARA ASEGURAR LECTURA
    await docRef.update({
      status: 'FACTURADO',
      liorenFolio: lFolio,
      liorenId: lId,       // Nombre estándar
      liorenid: lId,       // Backup minúsculas
      lioren_id: lId,      // Backup snake_case
      liorenPdfUrl: result.url_pdf || "",
      liorenFechaEmision: new Date().toISOString()
    });

    console.log(`[EXITO] Cotización ${cotizacionId} facturada con ID Lioren: ${lId}`);

    return { success: true, folio: lFolio, liorenId: lId };
  } catch (error: any) {
    console.error(`ERROR EN FACTURACIÓN [${trace}]:`, error.message);
    throw new Error(error.message);
  }
}

export async function emitirDTEConsolidado(rutEmpresa: string) {
  try {
    const db = getDb();
    const snap = await db.collection('cotizaciones').where('empresaData.rut', '==', rutEmpresa).where('status', '==', 'PAGADO').get();
    if (snap.empty) throw new Error("No hay órdenes PAGADAS.");
    const docs = snap.docs;
    const base = docs[0].data() as CotizacionFirestore;
    const ubicacion = await normalizarUbicacionLioren(base.empresaData?.comuna);
    const todosLosDetalles = docs.flatMap(doc => {
      const d = doc.data() as CotizacionFirestore;
      return (d.solicitudesData || []).flatMap((sol: any) => (sol.examenes || []).map((ex: any) => ({
        nombre: `${ex.nombre} (Ref: ${doc.id.slice(-4)})`.substring(0, 80),
        cantidad: 1, precio: Math.round(Number(ex.valor || 0)), exento: true
      })));
    });
    const result = await createDTE({
      tipodoc: "34", emisor: { tipodoc: "34", fecha: new Date().toISOString().split('T')[0], casilla: 0 },
      receptor: { rut: cleanRut(rutEmpresa), rs: (base.empresaData?.razonSocial || "CONSOLIDADO").toUpperCase(), giro: (base.empresaData?.giro || "SERVICIOS MEDICOS").toUpperCase(), direccion: (base.empresaData?.direccion || "DIRECCION").toUpperCase(), comuna: ubicacion.id, ciudad: ubicacion.id, email: base.empresaData?.email || "soporte@araval.cl" },
      detalles: todosLosDetalles, expect_all: true
    });
    const lId = (result.id || result.dte_id || "").toString();
    const batch = db.batch();
    docs.forEach(d => {
      batch.update(d.ref, { status: 'FACTURADO', liorenFolio: (result.folio || "").toString(), liorenId: lId, liorenid: lId, liorenPdfUrl: result.url_pdf || "", liorenConsolidado: true, liorenFechaEmision: new Date().toISOString() });
    });
    await batch.commit();
    return { success: true, folio: result.folio, count: docs.length };
  } catch (error: any) { throw new Error(error.message); }
}
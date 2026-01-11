'use server';

import { getDb } from '@/lib/firestore-admin';
import { createDTE, whoami } from '@/server/lioren';
import { cleanRut, normalizarUbicacionLioren } from '@/lib/utils';
import type { CotizacionFirestore } from '@/lib/types';

export async function probarConexionLioren() {
  try {
    const data = await whoami();
    const ubicacion = await normalizarUbicacionLioren("TALTAL");
    return { 
      success: true, 
      message: `Conexión exitosa. Empresa: ${data.rs || 'Araval'}. ID Localidad: ${ubicacion.id}`
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

    // ANALIZAR ID DE LIOREN (EXTRACCIÓN QUIRÚRGICA)
    // Buscamos el ID en 'id', o en 'dte_id', o intentamos sacarlo de la URL si viene
    let lId = "";
    if (result.id) lId = result.id.toString();
    else if (result.dte_id) lId = result.dte_id.toString();
    else if (result.url_pdf) {
        // Intento desesperado: Extraer el ID de la URL si Lioren la mandó
        const parts = result.url_pdf.split('/');
        lId = parts[parts.length - 1];
    }

    // SI NO HAY ID, NO PODEMOS SEGUIR (EVITA EL ICONO NARANJA)
    if (!lId || lId === "undefined") {
        console.error("Respuesta Lioren sin ID:", result);
        throw new Error("Lioren no devolvió un ID de documento válido.");
    }

    trace = "Actualizando Firestore";
    await docRef.update({
      status: 'FACTURADO',
      liorenFolio: (result.folio || "").toString(),
      liorenId: lId, 
      liorenPdfUrl: result.url_pdf || result.url_pdf_cedible || "",
      liorenFechaEmision: new Date().toISOString(),
      liorenRawResponse: JSON.stringify(result) // GUARDAMOS TODO PARA AUDITORÍA
    });

    return { success: true, folio: result.folio, liorenId: lId };
  } catch (error: any) {
    console.error(`ERROR EN FACTURACIÓN [${trace}]:`, error.message);
    throw new Error(error.message);
  }
}

export async function emitirDTEConsolidado(rutEmpresa: string) {
  try {
    const db = getDb();
    const snap = await db.collection('cotizaciones')
      .where('empresaData.rut', '==', rutEmpresa)
      .where('status', '==', 'PAGADO')
      .get();

    if (snap.empty) throw new Error("No hay órdenes PAGADAS.");

    const docs = snap.docs;
    const base = docs[0].data() as CotizacionFirestore;
    const ubicacion = await normalizarUbicacionLioren(base.empresaData?.comuna);

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

    const lId = (result.id || result.dte_id || "").toString();
    if (!lId) throw new Error("Consolidación sin ID de retorno.");

    const batch = db.batch();
    docs.forEach(d => {
      batch.update(d.ref, { 
        status: 'FACTURADO', 
        liorenFolio: (result.folio || "").toString(), 
        liorenId: lId,
        liorenPdfUrl: result.url_pdf || "", 
        liorenConsolidado: true,
        liorenFechaEmision: new Date().toISOString()
      });
    });
    
    await batch.commit();
    return { success: true, folio: result.folio, count: docs.length };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
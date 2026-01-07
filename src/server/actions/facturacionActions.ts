'use server';

import { getDb } from '@/lib/firestore-admin';
import { createDTE, whoami, getLocalidades } from '@/server/lioren';
import type { CotizacionFirestore } from '@/lib/types';

/**
 * AYUDANTE: TRADUCTOR DE COMUNAS
 * Busca en la API de Lioren el ID interno necesario (ej: Taltal -> 58).
 */
async function obtenerIdComunaLioren(nombreComuna: string | undefined): Promise<number> {
  try {
    const localidades = await getLocalidades();
    const busca = (nombreComuna || "TALTAL").toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    const encontrada = localidades.find((l: any) => 
      l.nombre && l.nombre.toUpperCase().includes(busca)
    );

    // Fallback de seguridad: 58 es Taltal según nuestro escaneo exitoso
    return encontrada ? Number(encontrada.id) : 58;
  } catch (error) {
    console.error("Error traduciendo comuna, usando fallback 58:", error);
    return 58;
  }
}

/**
 * 1. TEST DE CONEXIÓN
 * Verifica el token y escanea el ID de Taltal.
 */
export async function probarConexionLioren() {
  try {
    const data = await whoami();
    const idTaltal = await obtenerIdComunaLioren("TALTAL");
    return { 
      success: true, 
      data: { 
        rs: `${data.rs} (ID Taltal Detectado: ${idTaltal})`, 
        rut: data.rut 
      } 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 2. FACTURACIÓN INDIVIDUAL (MODALIDAD NORMAL)
 * Emite una factura para una sola cotización.
 */
export async function ejecutarFacturacionSiiV2(cotizacionId: string) {
  try {
    const db = getDb();
    const docRef = db.collection('cotizaciones').doc(cotizacionId);
    const snap = await docRef.get();
    
    if (!snap.exists) throw new Error("Cotización no encontrada.");
    const data = snap.data() as CotizacionFirestore;
    if (!data.empresaData) throw new Error("La cotización no tiene datos de empresa.");

    const idLocalidad = await obtenerIdComunaLioren(data.empresaData.comuna);

    const payload = {
      emisor: {
        tipodoc: "34",
        fecha: new Date().toISOString().split('T')[0],
        casilla: 0
      },
      receptor: {
        rut: data.empresaData.rut.replace(/[.\s]/g, ''),
        rs: data.empresaData.razonSocial.toUpperCase().substring(0, 100),
        giro: (data.empresaData.giro || "SERVICIOS MEDICOS").toUpperCase().substring(0, 40),
        direccion: (data.empresaData.direccion || "DIRECCION").toUpperCase().substring(0, 70),
        comuna: idLocalidad,
        ciudad: idLocalidad,
        email: data.empresaData.email || data.solicitanteData?.mail || "soporte@araval.cl"
      },
      detalles: (data.solicitudesData || []).flatMap((sol: any) =>
        (sol.examenes || []).map((ex: any) => ({
          nombre: `${ex.nombre} - ${sol.trabajador?.nombre || 'S/N'}`.substring(0, 80),
          cantidad: 1,
          precio: Math.round(Number(ex.valor || 0)),
          exento: true
        }))
      ),
      esperar: true
    };

    const result = await createDTE(payload);

    // Captura robusta de la URL del PDF
    const pdfUrl = result.url_pdf || result.pdf || result.url_pdf_cedible || "";
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
    return { success: false, error: `LIOREN: ${error.message}` };
  }
}

/**
 * 3. FACTURACIÓN CONSOLIDADA (MODALIDAD FRECUENTE)
 * Toma todas las cotizaciones 'PAGADO' de un RUT y emite una sola factura.
 */
export async function emitirDTEConsolidado(rutEmpresa: string) {
  try {
    const db = getDb();
    
    // Buscar cotizaciones pagadas de este cliente específico
    const snap = await db.collection('cotizaciones')
      .where('empresaData.rut', '==', rutEmpresa)
      .where('status', '==', 'PAGADO')
      .get();

    if (snap.empty) throw new Error("No hay cotizaciones pendientes para este RUT.");

    const docs = snap.docs;
    const base = docs[0].data() as CotizacionFirestore;
    const idLocalidad = await obtenerIdComunaLioren(base.empresaData?.comuna);

    // Unimos todos los exámenes de todos los trabajadores en una sola factura
    const todosLosDetalles = docs.flatMap(doc => {
      const d = doc.data() as CotizacionFirestore;
      return (d.solicitudesData || []).flatMap((sol: any) =>
        (sol.examenes || []).map((ex: any) => ({
          nombre: `${ex.nombre} - ${sol.trabajador?.nombre || 'S/N'}`.substring(0, 80),
          cantidad: 1,
          precio: Math.round(Number(ex.valor || 0)),
          exento: true
        }))
      );
    });

    const payload = {
      emisor: {
        tipodoc: "34",
        fecha: new Date().toISOString().split('T')[0],
        casilla: 0
      },
      receptor: {
        rut: rutEmpresa.replace(/[.\s]/g, ''),
        rs: base.empresaData?.razonSocial.toUpperCase() || "CLIENTE CONSOLIDADO",
        giro: (base.empresaData?.giro || "SERVICIOS MEDICOS").toUpperCase(),
        direccion: (base.empresaData?.direccion || "DIRECCION").toUpperCase(),
        comuna: idLocalidad,
        ciudad: idLocalidad,
        email: base.empresaData?.email || "soporte@araval.cl"
      },
      detalles: todosLosDetalles,
      esperar: true
    };

    const result = await createDTE(payload);

    // Guardado masivo (Batch) para actualizar todas las cotizaciones
    const pdfUrl = result.url_pdf || result.pdf || result.url_pdf_cedible || "";
    const batch = db.batch();
    
    docs.forEach(d => {
      batch.update(d.ref, {
        status: 'FACTURADO',
        liorenFolio: result.folio.toString(),
        liorenPdfUrl: pdfUrl,
        liorenConsolidado: true,
        liorenFechaEmision: new Date().toISOString()
      });
    });
    await batch.commit();

    return { success: true, folio: result.folio, count: docs.length };

  } catch (error: any) {
    return { success: false, error: `LIOREN CONSOLIDADO: ${error.message}` };
  }
}
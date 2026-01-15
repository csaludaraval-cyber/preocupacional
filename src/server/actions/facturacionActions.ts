'use server';

import { getDb } from '@/lib/firestore-admin';
import { createDTE, whoami } from '@/server/lioren';
import { cleanRut, normalizarUbicacionLioren } from '@/lib/utils';
import type { CotizacionFirestore } from '@/lib/types';

const LIOREN_SLUG = "araval-fisioterapia-y-medicina-spa-pruebas-api";

export async function probarConexionLioren() {
  try {
    const data = await whoami();
    const ubicacion = await normalizarUbicacionLioren("TALTAL", "TALTAL");
    return { success: true, message: `Conexión OK. Taltal mapeado como C:${ubicacion.comunaId} CI:${ubicacion.ciudadId}` };
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

    trace = "Mapeo de Localidades";
    // ENVIAMOS COMUNA Y CIUDAD POR SEPARADO
    const ubicacion = await normalizarUbicacionLioren(
      data.empresaData?.comuna, 
      data.empresaData?.ciudad
    );

    trace = "Construyendo Payload";
    const payload = {
      tipodoc: "34",
      emisor: { tipodoc: "34", fecha: new Date().toISOString().split('T')[0], casilla: 0 },
      receptor: {
        rut: cleanRut(data.empresaData?.rut || ''),
        rs: (data.empresaData?.razonSocial || '').toUpperCase().substring(0, 100),
        giro: (data.empresaData?.giro || "SERVICIOS MEDICOS").toUpperCase().substring(0, 40),
        direccion: (data.empresaData?.direccion || "DIRECCION").toUpperCase().substring(0, 70),
        comuna: ubicacion.comunaId, // ID de la tabla Comunas
        ciudad: ubicacion.ciudadId, // ID de la tabla Ciudades
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
    const finalId = result.id || result.dte_id || (result.dte && result.dte.id) || "";
    const finalFolio = result.folio || (result.dte && result.dte.folio) || "";

    if (!finalId) throw new Error("ID no recibido.");

    const finalPdfUrl = `https://cl.lioren.enterprises/empresas/${LIOREN_SLUG}/dte/getpdf/${finalId}`;

    trace = "Escritura Firestore";
    await docRef.set({
      status: 'FACTURADO',
      liorenId: String(finalId),
      liorenFolio: String(finalFolio),
      liorenPdfUrl: finalPdfUrl,
      liorenFechaEmision: new Date().toISOString()
    }, { merge: true });

    return { success: true, folio: finalFolio, pdfUrl: finalPdfUrl };
  } catch (error: any) {
    console.error(`ERROR [${trace}]:`, error.message);
    throw new Error(error.message);
  }
}

export async function emitirDTEConsolidado(rutEmpresa: string) {
  try {
    const db = getDb();
    const snap = await db.collection('cotizaciones').where('empresaData.rut', '==', rutEmpresa).where('status', '==', 'PAGADO').get();
    if (snap.empty) throw new Error("No hay órdenes.");
    const docs = snap.docs;
    const base = docs[0].data() as CotizacionFirestore;
    
    // Mapeo doble para consolidado
    const ubicacion = await normalizarUbicacionLioren(base.empresaData?.comuna, base.empresaData?.ciudad);

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
        comuna: ubicacion.comunaId,
        ciudad: ubicacion.ciudadId,
        email: base.empresaData?.email || "soporte@araval.cl"
      },
      detalles: todosLosDetalles,
      expect_all: true
    });

    const finalId = result.id || result.dte_id || (result.dte && result.dte.id) || "";
    const finalFolio = result.folio || (result.dte && result.dte.folio) || "";
    const finalPdfUrl = `https://cl.lioren.enterprises/empresas/${LIOREN_SLUG}/dte/getpdf/${finalId}`;

    const batch = db.batch();
    docs.forEach(d => {
      batch.update(d.ref, { 
        status: 'FACTURADO', liorenFolio: String(finalFolio), liorenId: String(finalId),
        liorenPdfUrl: finalPdfUrl, liorenConsolidado: true, liorenFechaEmision: new Date().toISOString()
      });
    });
    await batch.commit();
    return { success: true, folio: finalFolio, count: docs.length, pdfUrl: finalPdfUrl };
  } catch (error: any) { throw new Error(error.message); }
}

export async function descargarMaestroLocalidades() {
  try {
    const token = process.env.LIOREN_TOKEN;
    const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token?.trim()}` };
    const [resRegiones, resComunas, resCiudades] = await Promise.all([
      fetch('https://www.lioren.cl/api/regiones', { method: 'GET', headers, cache: 'no-store' }),
      fetch('https://www.lioren.cl/api/comunas', { method: 'GET', headers, cache: 'no-store' }),
      fetch('https://www.lioren.cl/api/ciudades', { method: 'GET', headers, cache: 'no-store' })
    ]);
    const maestro = { fecha: new Date().toISOString(), regiones: await resRegiones.json(), comunas: await resComunas.json(), ciudades: await resCiudades.json() };
    return { success: true, data: maestro };
  } catch (error: any) { return { success: false, error: error.message }; }
}
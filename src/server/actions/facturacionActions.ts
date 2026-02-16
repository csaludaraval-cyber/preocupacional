'use server';

import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { firestore } from '@/lib/firebase'; // Asegurada la ruta estándar
import { createDTE, whoami } from '@/server/lioren';
import { cleanRut, normalizarUbicacionLioren } from '@/lib/utils';
import type { CotizacionFirestore } from '@/lib/types';

const LIOREN_SLUG = "araval-fisioterapia-y-medicina-spa";

/**
 * HELPER QUIRÚRGICO: Agrupa exámenes por nombre y suma cantidades
 */
function agruparDetallesFacturacion(examenesRaw: any[]) {
  const resumen = examenesRaw.reduce((acc: any, ex: any) => {
    const nombreLimpio = ex.nombre.toUpperCase().trim();
    const precio = Math.round(Number(ex.valor));

    if (acc[nombreLimpio]) {
      acc[nombreLimpio].cantidad += 1;
    } else {
      acc[nombreLimpio] = {
        nombre: nombreLimpio.substring(0, 80),
        cantidad: 1,
        precio: precio,
        exento: true
      };
    }
    return acc;
  }, {});

  return Object.values(resumen);
}

/**
 * 1. FACTURACIÓN INDIVIDUAL
 */
export async function ejecutarFacturacionSiiV2(cotizacionId: string) {
  try {
    const docRef = doc(firestore, 'cotizaciones', cotizacionId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("No existe la cotización.");
    const data = snap.data() as CotizacionFirestore;

    const ubicacion = await normalizarUbicacionLioren(data.empresaData?.comuna, data.empresaData?.ciudad);

    // 1. Extraemos todos los exámenes de todos los trabajadores de la orden
    const todosLosExamenes = (data.solicitudesData || []).flatMap((sol: any) =>
      (sol.examenes || []).filter((ex: any) => Number(ex.valor) > 0)
    );

    // 2. Aplicamos el agrupamiento
    const detallesFinales = agruparDetallesFacturacion(todosLosExamenes);

    const result = await createDTE({
      tipodoc: "34",
      emisor: { tipodoc: "34", fecha: new Date().toISOString().split('T')[0], casilla: 0 },
      receptor: {
        rut: cleanRut(data.empresaData?.rut || ''),
        rs: (data.empresaData?.razonSocial || '').toUpperCase().substring(0, 100).trim(),
        giro: (data.empresaData?.giro || "SERVICIOS MEDICOS").toUpperCase().substring(0, 40).trim(),
        direccion: (data.empresaData?.direccion || "DIRECCION").toUpperCase().substring(0, 70).trim(),
        comuna: Number(ubicacion.comunaId),
        ciudad: Number(ubicacion.ciudadId),
        email: (data.empresaData?.email || data.solicitanteData?.mail || "soporte@araval.cl").trim()
      },
      detalles: detallesFinales,
      expect_all: true
    });

    const finalId = result.id || result.dte_id || (result.dte && result.dte.id);
    const finalFolio = result.folio || (result.dte && result.dte.folio);
    const finalPdfUrl = "https://cl.lioren.enterprises/empresas/" + LIOREN_SLUG + "/dte/getpdf/" + finalId;

    await setDoc(docRef, {
      status: 'FACTURADO',
      liorenId: String(finalId),
      liorenFolio: String(finalFolio),
      liorenPdfUrl: finalPdfUrl,
      liorenFechaEmision: new Date().toISOString()
    }, { merge: true });

    return { success: true, folio: finalFolio, pdfUrl: finalPdfUrl };
  } catch (error: any) { throw new Error(error.message); }
}

/**
 * 2. FACTURACIÓN CONSOLIDADA (Múltiples Órdenes)
 */
export async function emitirDTEConsolidado(rutEmpresa: string) {
  try {
    const q = query(collection(firestore, 'cotizaciones'), 
      where('empresaData.rut', '==', rutEmpresa), 
      where('status', '==', 'PAGADO')
    );
    const snap = await getDocs(q);
    if (snap.empty) throw new Error("Sin órdenes pagadas para consolidar.");

    const docs = snap.docs;
    const base = docs[0].data() as CotizacionFirestore;
    const ubicacion = await normalizarUbicacionLioren(base.empresaData?.comuna, base.empresaData?.ciudad);

    // 1. Extraemos TODOS los exámenes de TODAS las cotizaciones encontradas
    const examenPool = docs.flatMap(docSnapshot => {
      const d = docSnapshot.data() as CotizacionFirestore;
      return (d.solicitudesData || []).flatMap((sol: any) =>
        (sol.examenes || []).filter((ex: any) => Number(ex.valor) > 0)
      );
    });

    // 2. Agrupamos por nombre para que si hay 50 alturas físicas, salga solo una línea con cantidad 50
    const detallesAgrupados = agruparDetallesFacturacion(examenPool);

    const result = await createDTE({
      tipodoc: "34",
      emisor: { tipodoc: "34", fecha: new Date().toISOString().split('T')[0], casilla: 0 },
      receptor: {
        rut: cleanRut(rutEmpresa),
        rs: (base.empresaData?.razonSocial || "CONSOLIDADO").toUpperCase().substring(0, 100).trim(),
        giro: (base.empresaData?.giro || "SERVICIOS MEDICOS").toUpperCase().substring(0, 40).trim(),
        direccion: (base.empresaData?.direccion || "DIRECCION").toUpperCase().substring(0, 70).trim(),
        comuna: Number(ubicacion.comunaId),
        ciudad: Number(ubicacion.ciudadId),
        email: (base.empresaData?.email || "soporte@araval.cl").trim()
      },
      detalles: detallesAgrupados,
      expect_all: true
    });

    const finalId = result.id || result.dte_id || (result.dte && result.dte.id);
    const finalFolio = result.folio || (result.dte && result.dte.folio);
    const finalPdfUrl = "https://cl.lioren.enterprises/empresas/" + LIOREN_SLUG + "/dte/getpdf/" + finalId;

    const batch = writeBatch(firestore);
    docs.forEach(docSnapshot => {
      batch.update(doc(firestore, 'cotizaciones', docSnapshot.id), { 
        status: 'FACTURADO', 
        liorenFolio: String(finalFolio), 
        liorenId: String(finalId), 
        liorenPdfUrl: finalPdfUrl,
        liorenConsolidado: true 
      });
    });
    await batch.commit();

    return { success: true, folio: finalFolio, pdfUrl: finalPdfUrl };
  } catch (error: any) { throw new Error(error.message); }
}

/**
 * 3. UTILITARIOS
 */
export async function descargarMaestroLocalidades() {
  try {
    const token = process.env.LIOREN_TOKEN || "";
    const headers = { 'Accept': 'application/json', 'Authorization': 'Bearer ' + token.trim() };
    const [resRegiones, resComunas, resCiudades] = await Promise.all([
      fetch('https://www.lioren.cl/api/regiones', { method: 'GET', headers }),
      fetch('https://www.lioren.cl/api/comunas', { method: 'GET', headers }),
      fetch('https://www.lioren.cl/api/ciudades', { method: 'GET', headers })
    ]);
    return { success: true, data: { regiones: await resRegiones.json(), comunas: await resComunas.json(), ciudades: await resCiudades.json() } };
  } catch (error: any) { return { success: false, error: error.message }; }
}

export async function probarConexionLioren() {
  try {
    await whoami();
    return { success: true, message: "Conexión con SII Lioren Exitosa." };
  } catch (error: any) { return { success: false, error: error.message }; }
}
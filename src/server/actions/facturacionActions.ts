'use server';

import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { firestore } from '@/lib/firebase'; // IMPORTACIÓN ÚNICA Y CORRECTA
import { createDTE, whoami } from '@/server/lioren';
import { cleanRut, normalizarUbicacionLioren } from '@/lib/utils';
import type { CotizacionFirestore } from '@/lib/types';

const LIOREN_SLUG = "araval-fisioterapia-y-medicina-spa";

/**
 * AGRUPADOR: Suma cantidades de exámenes iguales para un DTE limpio
 */
function agruparDetallesFacturacion(examenesRaw: any[]) {
  const resumen: Record<string, any> = {};
  examenesRaw.forEach((ex) => {
    const nombreLimpio = String(ex.nombre || "SERVICIO").toUpperCase().trim();
    const precio = Math.round(Number(ex.valor) || 0);
    if (resumen[nombreLimpio]) {
      resumen[nombreLimpio].cantidad += 1;
    } else {
      resumen[nombreLimpio] = {
        nombre: nombreLimpio.substring(0, 80),
        cantidad: 1,
        precio: precio,
        exento: true
      };
    }
  });
  return Object.values(resumen);
}

export async function ejecutarFacturacionSiiV2(cotizacionId: string) {
  try {
    if (!firestore) throw new Error("Error de inicializacion Firebase");
    const docRef = doc(firestore, 'cotizaciones', cotizacionId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Cotizacion no encontrada");
    const data = snap.data() as CotizacionFirestore;

    const ubicacion = await normalizarUbicacionLioren(data.empresaData?.comuna, data.empresaData?.ciudad);
    const todosLosExamenes = (data.solicitudesData || []).flatMap((sol: any) =>
      (sol.examenes || []).filter((ex: any) => Number(ex.valor) > 0)
    );

    const detallesFinales = agruparDetallesFacturacion(todosLosExamenes);

    const result = await createDTE({
      tipodoc: "34",
      emisor: { tipodoc: "34", fecha: new Date().toISOString().split('T')[0], casilla: 0 },
      receptor: {
        rut: cleanRut(data.empresaData?.rut || ''),
        rs: String(data.empresaData?.razonSocial || '').toUpperCase().substring(0, 100).trim(),
        giro: String(data.empresaData?.giro || "SERVICIOS MEDICOS").toUpperCase().substring(0, 40).trim(),
        direccion: String(data.empresaData?.direccion || "DIRECCION").toUpperCase().substring(0, 70).trim(),
        comuna: Number(ubicacion.comunaId),
        ciudad: Number(ubicacion.ciudadId),
        email: String(data.empresaData?.email || data.solicitanteData?.mail || "soporte@araval.cl").trim()
      },
      detalles: detallesFinales,
      expect_all: true
    });

    const finalId = result.id || result.dte_id || (result.dte && result.dte.id);
    const finalFolio = result.folio || (result.dte && result.dte.folio);
    const finalPdfUrl = "https://cl.lioren.enterprises/empresas/" + LIOREN_SLUG + "/dte/getpdf/" + String(finalId);

    await setDoc(docRef, {
      status: 'FACTURADO',
      liorenId: String(finalId),
      liorenFolio: String(finalFolio),
      liorenPdfUrl: finalPdfUrl,
      liorenFechaEmision: new Date().toISOString()
    }, { merge: true });

    return { success: true, folio: finalFolio, pdfUrl: finalPdfUrl };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function emitirDTEConsolidado(rutEmpresa: string) {
  try {
    if (!firestore) throw new Error("Error Firebase");
    const q = query(collection(firestore, 'cotizaciones'), where('empresaData.rut', '==', rutEmpresa), where('status', '==', 'PAGADO'));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error("Sin ordenes pagadas");

    const docs = snap.docs;
    const base = docs[0].data() as CotizacionFirestore;
    const ubicacion = await normalizarUbicacionLioren(base.empresaData?.comuna, base.empresaData?.ciudad);

    const examenPool = docs.flatMap(docSnapshot => {
      const d = docSnapshot.data() as CotizacionFirestore;
      return (d.solicitudesData || []).flatMap((sol: any) =>
        (sol.examenes || []).filter((ex: any) => Number(ex.valor) > 0)
      );
    });

    const detallesAgrupados = agruparDetallesFacturacion(examenPool);

    const result = await createDTE({
      tipodoc: "34",
      emisor: { tipodoc: "34", fecha: new Date().toISOString().split('T')[0], casilla: 0 },
      receptor: {
        rut: cleanRut(rutEmpresa),
        rs: String(base.empresaData?.razonSocial || "CONSOLIDADO").toUpperCase().substring(0, 100).trim(),
        giro: String(base.empresaData?.giro || "SERVICIOS MEDICOS").toUpperCase().substring(0, 40).trim(),
        direccion: String(base.empresaData?.direccion || "DIRECCION").toUpperCase().substring(0, 70).trim(),
        comuna: Number(ubicacion.comunaId),
        ciudad: Number(ubicacion.ciudadId),
        email: String(base.empresaData?.email || "soporte@araval.cl").trim()
      },
      detalles: detallesAgrupados,
      expect_all: true
    });

    const finalId = result.id || result.dte_id || (result.dte && result.dte.id);
    const finalFolio = result.folio || (result.dte && result.dte.folio);
    const finalPdfUrl = "https://cl.lioren.enterprises/empresas/" + LIOREN_SLUG + "/dte/getpdf/" + String(finalId);

    const batch = writeBatch(firestore);
    docs.forEach(docSnapshot => {
      batch.update(doc(firestore, 'cotizaciones', docSnapshot.id), { 
        status: 'FACTURADO', liorenFolio: String(finalFolio), liorenId: String(finalId), liorenPdfUrl: finalPdfUrl, liorenConsolidado: true 
      });
    });
    await batch.commit();
    return { success: true, folio: finalFolio, pdfUrl: finalPdfUrl };
  } catch (error: any) { throw new Error(error.message); }
}

export async function descargarMaestroLocalidades() {
  try {
    const token = process.env.LIOREN_TOKEN || "";
    const headers = { 'Accept': 'application/json', 'Authorization': 'Bearer ' + token.trim() };
    const [rReg, rCom, rCiu] = await Promise.all([
      fetch('https://www.lioren.cl/api/regiones', { method: 'GET', headers }),
      fetch('https://www.lioren.cl/api/comunas', { method: 'GET', headers }),
      fetch('https://www.lioren.cl/api/ciudades', { method: 'GET', headers })
    ]);
    return { success: true, data: { regiones: await rReg.json(), comunas: await rCom.json(), ciudades: await rCiu.json() } };
  } catch (error: any) { return { success: false, error: error.message }; }
}

export async function probarConexionLioren() {
  try { await whoami(); return { success: true, message: "SII Lioren OK" }; } 
  catch (error: any) { return { success: false, error: error.message }; }
}
'use server';

import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase'; 
import { createDTE, whoami } from '@/server/lioren';
import { cleanRut, normalizarUbicacionLioren } from '@/lib/utils';
import type { CotizacionFirestore } from '@/lib/types';

const LIOREN_SLUG = "araval-fisioterapia-y-medicina-spa";

function agruparDetallesFacturacion(examenesRaw: any[]) {
  const resumen: Record<string, any> = {};
  examenesRaw.forEach((ex) => {
    const nombreLimpio = String(ex.nombre || "SERVICIO MÉDICO").toUpperCase().trim();
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

// NUEVA VERSIÓN: Filtra por RUT, Mes y Año
export async function emitirDTEConsolidado(rutEmpresa: string, mes: number, anio: number) {
  try {
    const token = process.env.LIOREN_TOKEN;
    if (!token) return { success: false, error: "Token no configurado." };

    // 1. Definir rango de fechas para el mes
    const startDate = new Date(anio, mes, 1);
    const endDate = new Date(anio, mes + 1, 0, 23, 59, 59);

    // 2. Consulta filtrada por RUT, Estado y Rango de Fechas
    const q = query(
      collection(firestore, 'cotizaciones'), 
      where('empresaData.rut', '==', rutEmpresa), 
      where('status', '==', 'PAGADO'),
      where('fechaCreacion', '>=', Timestamp.fromDate(startDate)),
      where('fechaCreacion', '<=', Timestamp.fromDate(endDate))
    );

    const snap = await getDocs(q);
    if (snap.empty) return { success: false, error: "No hay órdenes para este periodo." };

    const docs = snap.docs;
    const base = docs[0].data() as CotizacionFirestore;
    
    let ubicacion;
    try {
      ubicacion = await normalizarUbicacionLioren(base.empresaData?.comuna, base.empresaData?.ciudad);
      if (!ubicacion.comunaId) ubicacion = { comunaId: 15, ciudadId: 8 };
    } catch (e) { ubicacion = { comunaId: 15, ciudadId: 8 }; }

    const examenPool = docs.flatMap(docSnapshot => {
      const d = docSnapshot.data() as CotizacionFirestore;
      return (d.solicitudesData || []).flatMap((sol: any) => (sol.examenes || []).filter((ex: any) => Number(ex.valor) > 0));
    });

    const result = await createDTE({
      tipodoc: "34",
      emisor: { tipodoc: "34", fecha: new Date().toISOString().split('T')[0], casilla: 0 },
      receptor: {
        rut: cleanRut(rutEmpresa),
        rs: String(base.empresaData?.razonSocial || "CONSOLIDADO").toUpperCase().trim(),
        giro: String(base.empresaData?.giro || "SERVICIOS MÉDICOS").toUpperCase().trim(),
        direccion: String(base.empresaData?.direccion || "DIRECCIÓN").toUpperCase().trim(),
        comuna: Number(ubicacion.comunaId),
        ciudad: Number(ubicacion.ciudadId),
        email: String(base.empresaData?.email || "pagos@aravalcsalud.cl").trim()
      },
      detalles: agruparDetallesFacturacion(examenPool),
      expect_all: true
    });

    const finalId = result.id || result.dte_id || (result.dte && result.dte.id);
    if (!finalId) return { success: false, error: result.message || "Rechazo de Lioren." };

    const finalFolio = result.folio || (result.dte && result.dte.folio);
    const finalPdfUrl = `https://cl.lioren.enterprises/empresas/${LIOREN_SLUG}/dte/getpdf/${finalId}`;

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
    return { success: true, folio: finalFolio };
  } catch (error: any) { 
    return { success: false, error: error.message }; 
  }
}

// ... (Resto de funciones: ejecutarFacturacionSiiV2, probarConexionLioren, descargarMaestroLocalidades se mantienen igual)
export async function ejecutarFacturacionSiiV2(cotizacionId: string) {
    try {
      const token = process.env.LIOREN_TOKEN;
      if (!token) return { success: false, error: "Token de Lioren no configurado en el servidor." };
  
      const docRef = doc(firestore, 'cotizaciones', cotizacionId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return { success: false, error: "Cotización no encontrada." };
      
      const data = snap.data() as CotizacionFirestore;
  
      // NORMALIZACIÓN CON FALLBACK TALTAL (15/8)
      let ubicacion;
      try {
        ubicacion = await normalizarUbicacionLioren(data.empresaData?.comuna, data.empresaData?.ciudad);
        if (!ubicacion.comunaId || ubicacion.comunaId === 0) ubicacion = { comunaId: 15, ciudadId: 8 };
      } catch (e) {
        ubicacion = { comunaId: 15, ciudadId: 8 };
      }
  
      const todosLosExamenes = (data.solicitudesData || []).flatMap((sol: any) =>
        (sol.examenes || []).filter((ex: any) => Number(ex.valor) > 0)
      );
  
      if (todosLosExamenes.length === 0) return { success: false, error: "No hay ítems valorizados para facturar." };
      const detallesFinales = agruparDetallesFacturacion(todosLosExamenes);
  
      const result = await createDTE({
        tipodoc: "34",
        emisor: { tipodoc: "34", fecha: new Date().toISOString().split('T')[0], casilla: 0 },
        receptor: {
          rut: cleanRut(data.empresaData?.rut || ''),
          rs: String(data.empresaData?.razonSocial || '').toUpperCase().substring(0, 100).trim(),
          giro: String(data.empresaData?.giro || "SERVICIOS MÉDICOS").toUpperCase().substring(0, 40).trim(),
          direccion: String(data.empresaData?.direccion || "DIRECCIÓN").toUpperCase().substring(0, 70).trim(),
          comuna: Number(ubicacion.comunaId),
          ciudad: Number(ubicacion.ciudadId),
          email: String(data.empresaData?.email || data.solicitanteData?.mail || "soporte@araval.cl").trim()
        },
        detalles: detallesFinales,
        expect_all: true
      });
  
      const finalId = result.id || result.dte_id || (result.dte && result.dte.id);
      if (!finalId) return { success: false, error: result.message || "Lioren rechazó el DTE." };
  
      const finalFolio = result.folio || (result.dte && result.dte.folio);
      const finalPdfUrl = `https://cl.lioren.enterprises/empresas/${LIOREN_SLUG}/dte/getpdf/${finalId}`;
  
      await setDoc(docRef, {
        status: 'FACTURADO',
        liorenId: String(finalId),
        liorenFolio: String(finalFolio),
        liorenPdfUrl: finalPdfUrl,
        liorenFechaEmision: new Date().toISOString()
      }, { merge: true });
  
      return { success: true, folio: finalFolio, pdfUrl: finalPdfUrl };
    } catch (error: any) {
      return { success: false, error: error.message || "Fallo en el servidor de facturación." };
    }
  }
  
  export async function probarConexionLioren() {
    try { await whoami(); return { success: true, message: "SII Lioren OK" }; } 
    catch (error: any) { return { success: false, error: error.message }; }
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
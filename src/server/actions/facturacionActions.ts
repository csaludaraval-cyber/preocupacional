'use server';

import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { firestore } from '@/lib/firebase'; 
import { createDTE, whoami } from '@/server/lioren';
import { cleanRut, normalizarUbicacionLioren } from '@/lib/utils';
import type { CotizacionFirestore } from '@/lib/types';

const LIOREN_SLUG = "araval-fisioterapia-y-medicina-spa";

// Utilidad para normalizar textos según reglas estrictas de Lioren/SII
function limpiarTextoDTE(texto: string, min: number, max: number): string {
  let limpio = String(texto || "").toUpperCase().trim();
  // Si es muy corto (ej: HSM), rellenamos para cumplir el mínimo de 5 caracteres
  if (limpio.length < min) {
    limpio = limpio.padEnd(min, "."); 
  }
  // Si es muy largo (ej: Giro), cortamos para cumplir el máximo de 40 caracteres
  return limpio.substring(0, max);
}

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

export async function emitirDTEConsolidado(rutEmpresa: string, mes: number, anio: number) {
  try {
    const token = process.env.LIOREN_TOKEN;
    if (!token) return { success: false, error: "LIOREN_TOKEN no configurado." };

    const q = query(
      collection(firestore, 'cotizaciones'), 
      where('empresaData.rut', '==', rutEmpresa), 
      where('status', '==', 'PAGADO')
    );

    const snap = await getDocs(q);
    if (snap.empty) return { success: false, error: "No hay órdenes pendientes." };

    const filteredDocs = snap.docs.filter(docSnap => {
      const data = docSnap.data();
      const fecha = data.fechaCreacion?.toDate ? data.fechaCreacion.toDate() : new Date();
      return fecha.getMonth() === mes && fecha.getFullYear() === anio;
    });

    if (filteredDocs.length === 0) return { success: false, error: "No hay órdenes para el mes seleccionado." };

    const base = filteredDocs[0].data() as CotizacionFirestore;
    let ubicacion;
    try {
      ubicacion = await normalizarUbicacionLioren(base.empresaData?.comuna, base.empresaData?.ciudad);
      if (!ubicacion.comunaId) ubicacion = { comunaId: 15, ciudadId: 8 };
    } catch (e) { ubicacion = { comunaId: 15, ciudadId: 8 }; }

    const examenPool = filteredDocs.flatMap(docSnapshot => {
      const d = docSnapshot.data() as CotizacionFirestore;
      return (d.solicitudesData || []).flatMap((sol: any) => (sol.examenes || []).filter((ex: any) => Number(ex.valor) > 0));
    });

    // LLAMADA A LIOREN CON DATOS LIMPIOS Y VALIDADOS
    const result = await createDTE({
      tipodoc: "34",
      emisor: { tipodoc: "34", fecha: new Date().toISOString().split('T')[0], casilla: 0 },
      receptor: {
        rut: cleanRut(rutEmpresa),
        // REGLA: Mínimo 5 caracteres para Razón Social
        rs: limpiarTextoDTE(base.empresaData?.razonSocial || "CONSOLIDADO", 5, 100),
        // REGLA: Máximo 40 caracteres para Giro
        giro: limpiarTextoDTE(base.empresaData?.giro || "SERVICIOS MÉDICOS", 5, 40),
        direccion: limpiarTextoDTE(base.empresaData?.direccion || "DIRECCIÓN", 1, 70),
        comuna: Number(ubicacion.comunaId),
        ciudad: Number(ubicacion.ciudadId),
        email: String(base.empresaData?.email || "pagos@aravalcsalud.cl").trim()
      },
      detalles: agruparDetallesFacturacion(examenPool),
      expect_all: true
    });

    const finalId = result.id || result.dte_id || (result.dte && result.dte.id);
    if (!finalId) return { success: false, error: `Error SII: ${result.message || JSON.stringify(result)}` };

    const finalFolio = result.folio || (result.dte && result.dte.folio);
    const finalPdfUrl = `https://cl.lioren.enterprises/empresas/${LIOREN_SLUG}/dte/getpdf/${finalId}`;

    const batch = writeBatch(firestore);
    filteredDocs.forEach(docSnapshot => {
      batch.update(doc(firestore, 'cotizaciones', docSnapshot.id), { 
        status: 'FACTURADO', 
        liorenFolio: String(finalFolio), 
        liorenId: String(finalId), 
        liorenPdfUrl: finalPdfUrl, 
        liorenConsolidado: true,
        liorenFechaEmision: new Date().toISOString()
      });
    });
    
    await batch.commit();
    return { success: true, folio: finalFolio };

  } catch (error: any) { 
    return { success: false, error: error.message }; 
  }
}

export async function ejecutarFacturacionSiiV2(cotizacionId: string) {
    try {
      const token = process.env.LIOREN_TOKEN;
      if (!token) return { success: false, error: "Token no configurado." };
  
      const docRef = doc(firestore, 'cotizaciones', cotizacionId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return { success: false, error: "Cotización no encontrada." };
      
      const data = snap.data() as CotizacionFirestore;
      let ubicacion;
      try {
        ubicacion = await normalizarUbicacionLioren(data.empresaData?.comuna, data.empresaData?.ciudad);
        if (!ubicacion.comunaId) ubicacion = { comunaId: 15, ciudadId: 8 };
      } catch (e) { ubicacion = { comunaId: 15, ciudadId: 8 }; }
  
      const todosLosExamenes = (data.solicitudesData || []).flatMap((sol: any) =>
        (sol.examenes || []).filter((ex: any) => Number(ex.valor) > 0)
      );
  
      const result = await createDTE({
        tipodoc: "34",
        emisor: { tipodoc: "34", fecha: new Date().toISOString().split('T')[0], casilla: 0 },
        receptor: {
          rut: cleanRut(data.empresaData?.rut || ''),
          rs: limpiarTextoDTE(data.empresaData?.razonSocial || "EMPRESA", 5, 100),
          giro: limpiarTextoDTE(data.empresaData?.giro || "SERVICIOS MÉDICOS", 5, 40),
          direccion: limpiarTextoDTE(data.empresaData?.direccion || "DIRECCIÓN", 1, 70),
          comuna: Number(ubicacion.comunaId),
          ciudad: Number(ubicacion.ciudadId),
          email: String(data.empresaData?.email || data.solicitanteData?.mail || "soporte@araval.cl").trim()
        },
        detalles: agruparDetallesFacturacion(todosLosExamenes),
        expect_all: true
      });
  
      const finalId = result.id || result.dte_id || (result.dte && result.dte.id);
      if (!finalId) return { success: false, error: result.message || "Error SII" };
  
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
      return { success: false, error: error.message };
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
'use server';

import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
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

// VERSIÓN BLINDADA: Filtra por código para evitar errores de índice en Firebase
export async function emitirDTEConsolidado(rutEmpresa: string, mes: number, anio: number) {
  console.log(`Iniciando Facturación Consolidada: RUT ${rutEmpresa} | Periodo ${mes + 1}/${anio}`);
  
  try {
    const token = process.env.LIOREN_TOKEN;
    if (!token) return { success: false, error: "LIOREN_TOKEN no configurado en Secret Manager." };

    // 1. Consulta base por RUT y Estado (Filtro seguro que no requiere índices complejos)
    const q = query(
      collection(firestore, 'cotizaciones'), 
      where('empresaData.rut', '==', rutEmpresa), 
      where('status', '==', 'PAGADO')
    );

    const snap = await getDocs(q);
    if (snap.empty) return { success: false, error: "No hay órdenes pendientes para esta empresa." };

    // 2. Filtrado por Periodo en Memoria (Más robusto y rápido)
    const filteredDocs = snap.docs.filter(docSnap => {
      const data = docSnap.data();
      const fecha = data.fechaCreacion?.toDate ? data.fechaCreacion.toDate() : new Date();
      return fecha.getMonth() === mes && fecha.getFullYear() === anio;
    });

    if (filteredDocs.length === 0) return { success: false, error: "No hay órdenes que coincidan con el mes seleccionado." };

    console.log(`Procesando ${filteredDocs.length} órdenes para el DTE.`);

    const base = filteredDocs[0].data() as CotizacionFirestore;
    
    // 3. Ubicación con Fallback Taltal
    let ubicacion;
    try {
      ubicacion = await normalizarUbicacionLioren(base.empresaData?.comuna, base.empresaData?.ciudad);
      if (!ubicacion.comunaId) ubicacion = { comunaId: 15, ciudadId: 8 };
    } catch (e) { ubicacion = { comunaId: 15, ciudadId: 8 }; }

    // 4. Agrupación de Ítems
    const examenPool = filteredDocs.flatMap(docSnapshot => {
      const d = docSnapshot.data() as CotizacionFirestore;
      return (d.solicitudesData || []).flatMap((sol: any) => (sol.examenes || []).filter((ex: any) => Number(ex.valor) > 0));
    });

    if (examenPool.length === 0) return { success: false, error: "Las órdenes no contienen exámenes con valor mayor a $0." };

    // 5. Llamada a Lioren
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
    if (!finalId) return { success: false, error: result.message || "Lioren rechazó los datos del envío." };

    const finalFolio = result.folio || (result.dte && result.dte.folio);
    const finalPdfUrl = `https://cl.lioren.enterprises/empresas/${LIOREN_SLUG}/dte/getpdf/${finalId}`;

    // 6. Actualización Firestore en Batch (Todo o nada)
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
    console.error("CRITICAL_CONSOLIDATED_ERROR:", error.message);
    return { success: false, error: "Error en el servidor de facturación: " + error.message }; 
  }
}

// ... (Las demás funciones se mantienen igual que en el bloque anterior)
export async function ejecutarFacturacionSiiV2(cotizacionId: string) {
    try {
      const token = process.env.LIOREN_TOKEN;
      if (!token) return { success: false, error: "Token de Lioren no configurado en el servidor." };
  
      const docRef = doc(firestore, 'cotizaciones', cotizacionId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return { success: false, error: "Cotización no encontrada." };
      
      const data = snap.data() as CotizacionFirestore;
  
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
          rs: String(data.empresaData?.razonSocial || '').toUpperCase().trim(),
          giro: String(data.empresaData?.giro || "SERVICIOS MÉDICOS").toUpperCase().trim(),
          direccion: String(data.empresaData?.direccion || "DIRECCIÓN").toUpperCase().trim(),
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
'use server';

import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { firestore } from '@/firebase/config'; 
import { createDTE, whoami } from '@/server/lioren';
import { cleanRut, normalizarUbicacionLioren } from '@/lib/utils';
import type { CotizacionFirestore } from '@/lib/types';

const LIOREN_SLUG = "araval-fisioterapia-y-medicina-spa";

/**
 * 1. TEST DE CONEXIÓN
 */
export async function probarConexionLioren() {
  try {
    await whoami();
    const ubicacion = await normalizarUbicacionLioren("TALTAL", "TALTAL");
    return { success: true, message: "Conexión OK. Taltal: C:" + ubicacion.comunaId + " CI:" + ubicacion.ciudadId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 2. FACTURACIÓN INDIVIDUAL
 */
export async function ejecutarFacturacionSiiV2(cotizacionId: string) {
  let trace = "INICIO";
  try {
    if (!firestore) throw new Error("Firestore no inicializado.");
    
    const docRef = doc(firestore, 'cotizaciones', cotizacionId);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) throw new Error("Cotización no encontrada.");
    const data = snap.data() as CotizacionFirestore;

    trace = "Mapeo Ubicación";
    const ubicacion = await normalizarUbicacionLioren(data.empresaData?.comuna, data.empresaData?.ciudad);

    trace = "Construyendo Payload";
    const detalles = (data.solicitudesData || []).flatMap((sol: any) =>
      (sol.examenes || [])
        .filter((ex: any) => Number(ex.valor) > 0)
        .map((ex: any) => ({
          nombre: (ex.nombre + " - " + (sol.trabajador?.nombre || 'S/N')).substring(0, 80).trim(),
          cantidad: 1, 
          precio: Math.round(Number(ex.valor)), 
          exento: true
        }))
    );

    if (detalles.length === 0) throw new Error("No hay ítems con valor mayor a 0 para facturar.");

    const payload = {
      test: false, // <--- BANDERAZO DE PRODUCCIÓN REAL
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
      detalles,
      expect_all: true
    };

    trace = "Llamada a Lioren";
    const result = await createDTE(payload);
    
    const finalId = result.id || result.dte_id || (result.dte && result.dte.id);
    const finalFolio = result.folio || (result.dte && result.dte.folio);

    if (!finalId) throw new Error("Lioren no devolvió ID.");

    // CONCATENACIÓN SIMPLE PARA EVITAR ERROR TS1109
    const finalPdfUrl = "https://cl.lioren.enterprises/empresas/" + LIOREN_SLUG + "/dte/getpdf/" + finalId;

    trace = "Firestore Write";
    await setDoc(docRef, {
      status: 'FACTURADO',
      liorenId: String(finalId),
      liorenFolio: String(finalFolio),
      liorenPdfUrl: finalPdfUrl,
      liorenFechaEmision: new Date().toISOString()
    }, { merge: true });

    return { success: true, folio: finalFolio, pdfUrl: finalPdfUrl };
  } catch (error: any) {
    console.error("ERROR EN TRACE [" + trace + "]:", error.message);
    throw new Error(error.message);
  }
}

/**
 * 3. FACTURACIÓN CONSOLIDADA
 */
export async function emitirDTEConsolidado(rutEmpresa: string) {
  let trace = "INICIO CONSOLIDACIÓN";
  try {
    if (!firestore) throw new Error("Firestore no inicializado.");

    const q = query(
      collection(firestore, 'cotizaciones'),
      where('empresaData.rut', '==', rutEmpresa),
      where('status', 'in', ['PAGADO', 'CORREO_ENVIADO', 'orden_examen_enviada'])
    );

    const snap = await getDocs(q);
    if (snap.empty) throw new Error("No hay órdenes pendientes.");

    const docs = snap.docs;
    const base = docs[0].data() as CotizacionFirestore;
    const ubicacion = await normalizarUbicacionLioren(base.empresaData?.comuna, base.empresaData?.ciudad);

    const todosLosDetalles = docs.flatMap(docSnapshot => {
      const d = docSnapshot.data() as CotizacionFirestore;
      return (d.solicitudesData || []).flatMap((sol: any) =>
        (sol.examenes || [])
          .filter((ex: any) => Number(ex.valor) > 0)
          .map((ex: any) => ({
            nombre: (ex.nombre + " (Ref: " + docSnapshot.id.slice(-4) + ")").substring(0, 80).trim(),
            cantidad: 1, 
            precio: Math.round(Number(ex.valor)), 
            exento: true
          }))
      );
    });

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
      detalles: todosLosDetalles,
      expect_all: true
    });

    const finalId = result.id || result.dte_id || (result.dte && result.dte.id);
    const finalFolio = result.folio || (result.dte && result.dte.folio);
    
    // CONCATENACIÓN SIMPLE PARA EVITAR ERROR TS1109
    const finalPdfUrl = "https://cl.lioren.enterprises/empresas/" + LIOREN_SLUG + "/dte/getpdf/" + finalId;

    const batch = writeBatch(firestore);
    docs.forEach(docSnapshot => {
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
    return { success: true, folio: finalFolio, count: docs.length, pdfUrl: finalPdfUrl };
  } catch (error: any) { 
    console.error("ERROR CONSOLIDADO:", error.message);
    throw new Error(error.message); 
  }
}

/**
 * 4. DESCARGAR MAESTRO
 */
export async function descargarMaestroLocalidades() {
  try {
    const token = process.env.LIOREN_TOKEN || "";
    const headers = { 
      'Accept': 'application/json', 
      'Authorization': 'Bearer ' + token.trim() 
    };
    
    const [resRegiones, resComunas, resCiudades] = await Promise.all([
      fetch('https://www.lioren.cl/api/regiones', { method: 'GET', headers, cache: 'no-store' }),
      fetch('https://www.lioren.cl/api/comunas', { method: 'GET', headers, cache: 'no-store' }),
      fetch('https://www.lioren.cl/api/ciudades', { method: 'GET', headers, cache: 'no-store' })
    ]);

    const regionesData = await resRegiones.json();
    const comunasData = await resComunas.json();
    const ciudadesData = await resCiudades.json();

    return { 
      success: true, 
      data: { 
        regiones: regionesData, 
        comunas: comunasData, 
        ciudades: ciudadesData 
      } 
    };
  } catch (error: any) { 
    return { success: false, error: error.message }; 
  }
}
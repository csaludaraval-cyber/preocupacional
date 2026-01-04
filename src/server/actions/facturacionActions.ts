'use server';

import { getDb } from '@/lib/firestore-admin';
import { createDTE, whoami } from '@/server/lioren';
import type { CotizacionFirestore } from '@/lib/types';
import { cleanRut } from '@/lib/utils';

export async function probarConexionLioren() {
  // Esta función ahora no fallará con 500, siempre devolverá un objeto.
  const result = await whoami();
  return result; 
}

export async function ejecutarFacturacionSiiV2(cotizacionId: string) {
  try {
    // 1. Verificación Quirúrgica del Token
    const token = process.env.LIOREN_TOKEN;
    if (!token || token.trim() === "") {
      return { success: false, error: "CONFIG_ERROR: El LIOREN_TOKEN no está definido en el servidor." };
    }

    // 2. Conexión a DB
    const db = getDb();
    if (!db) return { success: false, error: "DB_ERROR: No se pudo inicializar Firestore Admin." };

    const docRef = db.collection('cotizaciones').doc(cotizacionId);
    const snap = await docRef.get();
    
    if (!snap.exists) return { success: false, error: "DATA_ERROR: Cotización no encontrada en la base de datos." };
    
    const data = snap.data() as CotizacionFirestore;

    // 3. Validación de campos críticos antes de procesar
    if (!data.empresaData?.rut) return { success: false, error: "VALIDACION: Falta el RUT de la empresa." };
    if (!data.empresaData?.giro) return { success: false, error: "VALIDACION: Falta el GIRO de la empresa." };

    // 4. Construcción del Payload
    const payload = {
      emisor: {
        tipodoc: "34",
        casilla: "0"
      },
      receptor: {
        rut: cleanRut(data.empresaData.rut),
        rs: (data.empresaData.razonSocial || "Empresa de Prueba").substring(0, 100),
        giro: (data.empresaData.giro || "Servicios").substring(0, 40),
        comuna: data.empresaData.comuna || "Santiago",
        ciudad: data.empresaData.ciudad || data.empresaData.comuna || "Santiago",
        dir: data.empresaData.direccion || "Dirección pendiente",
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

    // 5. Llamada a Lioren
    const result = await createDTE(payload);

    // 6. Guardado de resultado
    await docRef.update({
      status: 'FACTURADO',
      liorenFolio: result.folio.toString(),
      liorenId: result.id,
      liorenPdfUrl: result.url_pdf_cedible || result.url_pdf,
      liorenFechaEmision: new Date().toISOString()
    });

    return { success: true, folio: result.folio };

  } catch (error: any) {
    // Si llegamos aquí, el error es capturado y enviado al frontend como texto
    console.error("CRASH_LOG:", error);
    return { 
      success: false, 
      error: `SERVER_CRASH: ${error.message || "Error desconocido en el servidor"}` 
    };
  }
}
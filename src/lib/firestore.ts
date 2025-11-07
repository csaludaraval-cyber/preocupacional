'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import type { StatusCotizacion } from '@/lib/types';

// --- INICIALIZACIÓN DE FIREBASE ADMIN (SOLO PARA SERVIDOR) ---

// Esta sección asegura que la app de Admin se inicialice una sola vez.
if (!getApps().length) {
    try {
        // Intenta inicializar con credenciales de servicio desde variables de entorno.
        // Esto es crucial para que el entorno de servidor tenga los permisos correctos.
        initializeApp({
            credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!))
        });
        console.log("Firebase Admin SDK inicializado correctamente.");
    } catch (e: any) {
        console.error("Error CRÍTICO al inicializar Firebase Admin SDK:", e);
        // En un entorno de producción, la app no funcionaría sin esto.
        // El fallback a initializeApp() sin credenciales no funcionará para operaciones de escritura.
        if (process.env.NODE_ENV !== 'production') {
            console.log("Fallback: intentando inicialización por defecto (puede no tener permisos de escritura).");
            initializeApp();
        }
    }
}


const db = getFirestore();

// --- FIN DE LA INICIALIZACIÓN ---


/**
 * Server Action para actualizar el estado de una cotización usando Firebase Admin SDK.
 * Este es el enfoque correcto para operaciones de escritura desde el servidor en Next.js.
 * @param cotizacionId - El ID del documento de la cotización.
 * @param nuevoEstado - El nuevo estado a asignar.
 */
export async function updateCotizacionStatus(
  cotizacionId: string,
  nuevoEstado: StatusCotizacion
): Promise<{ success: boolean; message: string }> {
  if (!cotizacionId || !nuevoEstado) {
    return { success: false, message: 'El ID de la cotización y el nuevo estado son requeridos.' };
  }

  try {
    const cotizacionRef = db.collection('cotizaciones').doc(cotizacionId);

    // Verificar si el documento existe antes de intentar actualizarlo
    const docSnap = await cotizacionRef.get();
    if (!docSnap.exists) {
        console.error(`[Admin SDK] Documento no encontrado: cotizaciones/${cotizacionId}`);
        return { success: false, message: `El documento con ID ${cotizacionId} no fue encontrado.` };
    }

    await cotizacionRef.update({
      status: nuevoEstado,
    });

    console.log(`[Admin SDK] Estado de cotización ${cotizacionId} actualizado a ${nuevoEstado}.`);
    return { success: true, message: `Estado actualizado a ${nuevoEstado}` };
  } catch (error: any) {
    console.error(`[Admin SDK] Error al actualizar el estado para ${cotizacionId}:`, error);
    // Devuelve un mensaje de error más genérico pero informativo al cliente
    return { success: false, message: `Fallo al actualizar el estado: ${error.code || error.message}` };
  }
}
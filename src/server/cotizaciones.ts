
'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import type { StatusCotizacion } from '@/lib/types';

// --- INICIALIZACIÓN DE FIREBASE ADMIN (SOLO PARA SERVIDOR) ---

let serviceAccount;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }
} catch (e) {
    console.error("Error al parsear FIREBASE_SERVICE_ACCOUNT:", e);
}

if (!getApps().length) {
    if (serviceAccount) {
         initializeApp({
            credential: cert(serviceAccount)
        });
    } else {
        // Fallback para desarrollo local. En producción, la variable de entorno DEBE estar configurada.
        initializeApp();
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

    await cotizacionRef.update({
      status: nuevoEstado,
    });

    console.log(`[Admin SDK] Estado de cotización ${cotizacionId} actualizado a ${nuevoEstado}.`);
    return { success: true, message: `Estado actualizado a ${nuevoEstado}` };
  } catch (error: any) {
    console.error("Error al actualizar el estado con Admin SDK:", error);
    return { success: false, message: `Fallo al actualizar el estado: ${error.message}` };
  }
}

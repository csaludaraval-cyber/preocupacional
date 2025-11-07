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
        initializeApp();
        console.warn("ADVERTENCIA: No se encontró la variable de entorno FIREBASE_SERVICE_ACCOUNT. Usando credenciales de entorno por defecto.");
    }
}

const db = getFirestore();

/**
 * Server Action para actualizar el estado de una cotización.
 * Utilizado por el administrador para forzar el estado de 'ACEPTADA'
 * y probar la facturación inmediata (DTE 34).
 * @param cotizacionId - El ID del documento de la cotización.
 * @param nuevoEstado - El nuevo estado a asignar.
 */
export async function updateCotizacionStatus(
  cotizacionId: string,
  nuevoEstado: StatusCotizacion
): Promise<{ success: boolean; message: string }> {
  try {
    const cotizacionRef = db.collection('cotizaciones').doc(cotizacionId);

    // Se actualiza solo el campo de estado
    await cotizacionRef.update({
      status: nuevoEstado,
    });

    console.log(`Estado de cotización ${cotizacionId} actualizado a ${nuevoEstado}`);
    return { success: true, message: `Estado actualizado a ${nuevoEstado}` };
  } catch (error) {
    console.error("Error al actualizar el estado de la cotización:", error);
    // Devolver un error amigable
    return { success: false, message: 'Fallo al actualizar el estado.' };
  }
}

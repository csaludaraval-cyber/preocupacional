
'use server';

import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import type { StatusCotizacion } from '@/lib/types';

// This is a global variable that is injected by the hosting environment.
// It contains the Firebase configuration for the project.
declare const __firebase_config: any;

/**
 * Server Action para actualizar el estado de una cotización.
 * Utiliza el SDK de cliente de Firebase pero se ejecuta en el servidor.
 * La inicialización se maneja de forma segura para evitar duplicados.
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
    // Inicialización segura de Firebase en el entorno del servidor
    const app = getApps().length ? getApp() : initializeApp(__firebase_config);
    const db = getFirestore(app);

    const collectionPath = 'cotizaciones';
    const cotizacionRef = doc(db, collectionPath, cotizacionId);
    
    await updateDoc(cotizacionRef, {
      status: nuevoEstado,
    });

    return { success: true, message: `Estado actualizado a ${nuevoEstado}` };
  } catch (error: any) {
    console.error(`[Server Action Error] al actualizar ${cotizacionId}:`, error);
    
    // Proporciona un mensaje de error más detallado para la depuración
    const errorMessage = `Fallo al actualizar el estado: ${error.code || error.message}`;
    return { success: false, message: errorMessage };
  }
}

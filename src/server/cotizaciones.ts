
'use server';

import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import type { StatusCotizacion } from '@/lib/types';
import { firebaseConfig } from '@/firebase/config'; // Importar la configuración explícita

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
    // Inicialización segura de Firebase en el entorno del servidor usando la configuración importada
    const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
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

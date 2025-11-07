
'use server';

// Usa la instancia de DB del SDK de Admin, que es el correcto para Server Actions
import { db } from '@/lib/firestore-admin';
import type { StatusCotizacion } from '@/lib/types';

/**
 * Server Action para actualizar el estado de una cotización.
 * Utiliza el SDK de Firebase Admin para ejecutarse de forma segura en el servidor.
 * @param cotizacionId - El ID del documento de la cotización a actualizar.
 * @param nuevoEstado - El nuevo estado a asignar.
 */
export async function updateCotizacionStatus(
  cotizacionId: string,
  nuevoEstado: StatusCotizacion
): Promise<{ success: boolean; message: string }> {

  if (!cotizacionId || !nuevoEstado) {
    return { success: false, message: 'El ID de la cotización y el nuevo estado son requeridos.' };
  }

  // Ruta de Super-Usuario requerida por el entorno para el Admin SDK
  // La variable __APP_ID es inyectada por el sistema.
  const collectionPath = `/artifacts/${process.env.__APP_ID}/public/data/cotizaciones`;

  try {
    const cotizacionRef = db.collection(collectionPath).doc(cotizacionId);
    
    await cotizacionRef.update({
      status: nuevoEstado,
    });

    return { success: true, message: `Estado actualizado a ${nuevoEstado}` };
  } catch (error: any) {
    console.error(`[Server Action Error] al actualizar ${cotizacionId} a ${nuevoEstado}:`, error);
    
    // Proporciona un mensaje de error más detallado para la depuración
    const errorMessage = `Fallo al actualizar el estado: ${error.code || error.message}. Ruta intentada: ${collectionPath}`;
    return { success: false, message: errorMessage };
  }
}

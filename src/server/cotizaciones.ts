
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

  // Se usa la ruta de colección raíz simple: 'cotizaciones'.
  const collectionPath = 'cotizaciones';

  try {
    const cotizacionRef = db.collection(collectionPath).doc(cotizacionId);
    
    // Se utiliza la sintaxis nativa del Admin SDK: .update() sobre la referencia del documento.
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

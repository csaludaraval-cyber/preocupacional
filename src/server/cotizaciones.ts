
'use server';

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firestore-admin'; // Importar la instancia de admin
import type { StatusCotizacion } from '@/lib/types';

/**
 * Server Action para actualizar el estado de una cotización usando una instancia
 * de Firestore para admin correctamente inicializada.
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
    const cotizacionRef = doc(db, 'cotizaciones', cotizacionId);
    
    // El SDK de Admin tiene permisos para verificar la existencia, pero para simplificar,
    // confiamos en que el error de la operación nos dirá si no existe.
    // La verificación explícita se puede añadir si es necesario con getDoc.
    
    await updateDoc(cotizacionRef, {
      status: nuevoEstado,
    });

    console.log(`[Admin] Estado de cotización ${cotizacionId} actualizado a ${nuevoEstado}.`);
    return { success: true, message: `Estado actualizado a ${nuevoEstado}` };
  } catch (error: any) {
    console.error(`[Admin] Error al actualizar el estado para ${cotizacionId}:`, error);
    // Devuelve un mensaje de error más genérico pero informativo al cliente
    return { success: false, message: `Fallo al actualizar el estado: ${error.code || error.message}` };
  }
}

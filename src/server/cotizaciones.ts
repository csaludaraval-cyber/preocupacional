
'use server';

import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase'; // Usar la instancia del cliente configurada
import type { StatusCotizacion } from '@/lib/types';

/**
 * Server Action para actualizar el estado de una cotización.
 * Utiliza el SDK del cliente de Firebase, que es compatible con Server Actions.
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
    // Usar la instancia de firestore del cliente importada
    const cotizacionRef = doc(firestore, 'cotizaciones', cotizacionId);

    await updateDoc(cotizacionRef, {
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


'use server';

import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase'; // Usar la instancia de cliente exportada
import type { StatusCotizacion } from '@/lib/types';

/**
 * Server Action para actualizar el estado de una cotización usando el SDK del cliente.
 * Este enfoque es compatible con el entorno de Server Actions de Next.js.
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
    const cotizacionRef = doc(firestore, 'cotizaciones', cotizacionId);

    // Usa las funciones del SDK del cliente para actualizar el documento.
    await updateDoc(cotizacionRef, {
      status: nuevoEstado,
    });

    console.log(`Estado de cotización ${cotizacionId} actualizado a ${nuevoEstado} usando el SDK del cliente.`);
    return { success: true, message: `Estado actualizado a ${nuevoEstado}` };
  } catch (error: any) {
    console.error("Error al actualizar el estado de la cotización (Client SDK en Server Action):", error);
    // Devuelve un mensaje de error genérico para el cliente.
    // El error detallado se registra en el servidor.
    return { success: false, message: 'Fallo al actualizar el estado.' };
  }
}

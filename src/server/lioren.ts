
'use server';
/**
 * @fileoverview Lógica de negocio para interactuar con la API de Lioren.
 */

import { LIOREN_CONFIG } from './config';

const LIOREN_API_URL = 'https://api.lioren.cl/v1/dtes';

export async function createDTE(dteData: any): Promise<any> {
  if (!LIOREN_CONFIG.token) {
    throw new Error('Error Crítico: El Token de Acceso Personal de Lioren (LIOREN_TOKEN) no está configurado en las variables de entorno.');
  }

  const response = await fetch(LIOREN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${LIOREN_CONFIG.token}`,
    },
    body: JSON.stringify(dteData),
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error('Error de Lioren al crear DTE:', responseData);
    let errorMessage = responseData.message || 'Error desconocido al crear el DTE.';
    
    // Mapeo de errores conocidos de Lioren a mensajes amigables
    if (responseData.message?.includes('caf_exhausted')) {
      errorMessage = 'No quedan folios disponibles para emitir este tipo de documento. Por favor, solicite más folios en el SII.';
    } else if (responseData.message?.includes('not_allowed_to_issue_dtes')) {
      errorMessage = 'El RUT del emisor no está autorizado para emitir DTEs. Verifique la configuración en Lioren y el SII.';
    }

    throw new Error(errorMessage);
  }

  return responseData;
}

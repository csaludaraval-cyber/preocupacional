
'use server';
/**
 * @fileoverview Lógica de negocio para interactuar con la API de Lioren.
 */

import { LIOREN_CONFIG } from './config';

const LIOREN_API_URL = 'https://api.lioren.io/api';

interface LiorenToken {
  token: string;
  exp: number;
}

let tokenCache: LiorenToken | null = null;

async function getAuthToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (tokenCache && tokenCache.exp > now + 60) {
    return tokenCache.token;
  }

  if (!LIOREN_CONFIG.apiKey) {
    throw new Error('Error Crítico: La API Key de Lioren (LIOREN_API_KEY) no está configurada en las variables de entorno.');
  }

  const response = await fetch(`${LIOREN_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ apikey: LIOREN_CONFIG.apiKey }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Error de autenticación con Lioren: ${response.status}`, errorBody);
    throw new Error(`Error al autenticar con Lioren: ${response.status}. Respuesta: ${errorBody}`);
  }

  const data = await response.json();
  tokenCache = {
    token: data.token,
    exp: data.exp,
  };

  return tokenCache.token;
}

export async function createDTE(dteData: any): Promise<any> {
  const token = await getAuthToken();

  const response = await fetch(`${LIOREN_API_URL}/dtes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
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

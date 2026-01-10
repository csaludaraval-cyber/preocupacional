/**
 * Cliente de integración con la API de Lioren
 * Módulo: Localidades y DTE
 */

export async function createDTE(dteData: any): Promise<any> {
  const token = process.env.LIOREN_TOKEN;
  if (!token) throw new Error('LIOREN_TOKEN no configurado en el servidor.');

  const response = await fetch('https://www.lioren.cl/api/dtes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token.trim()}`,
    },
    body: JSON.stringify(dteData),
    cache: 'no-store',
  });

  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.message || JSON.stringify(responseData));
  }
  return responseData;
}

/**
 * Obtiene la lista oficial de localidades (comunas/ciudades) desde Lioren.
 * Implementa caché de 24 horas para no saturar la API.
 */
export async function getLocalidades(): Promise<any[]> {
  const token = process.env.LIOREN_TOKEN;
  if (!token) throw new Error('LIOREN_TOKEN no configurado.');

  try {
    const response = await fetch('https://www.lioren.cl/api/localidades', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token.trim()}`,
      },
      next: { revalidate: 86400 } // Cache por 24 horas
    });

    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error("Error al obtener localidades de Lioren:", error);
    return [];
  }
}

export async function whoami(): Promise<any> {
  const token = process.env.LIOREN_TOKEN;
  if (!token) throw new Error('LIOREN_TOKEN no está configurado.');

  const response = await fetch('https://www.lioren.cl/api/whoami', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token.trim()}`,
    },
    cache: 'no-store',
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error en whoami.');
  return data;
}
/**
 * src/server/lioren.ts
 * Comunicación con API Lioren v1
 */

const LIOREN_BASE_URL = 'https://www.lioren.cl/api';

export async function createDTE(dteData: any): Promise<any> {
  const token = process.env.LIOREN_TOKEN;
  if (!token) throw new Error('LIOREN_TOKEN_MISSING');

  const response = await fetch(`${LIOREN_BASE_URL}/dtes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token.trim()}`,
    },
    body: JSON.stringify(dteData),
  });

  const responseData = await response.json();
  if (!response.ok) throw new Error(responseData.message || JSON.stringify(responseData));
  return responseData;
}

// Esta es la función que pide la documentación para obtener los IDs
export async function getLocalidades(): Promise<any[]> {
  const token = process.env.LIOREN_TOKEN;
  if (!token) throw new Error('LIOREN_TOKEN_MISSING');

  const response = await fetch(`${LIOREN_BASE_URL}/localidades`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token.trim()}`,
    },
  });

  if (!response.ok) return [];
  return await response.json();
}

export async function whoami(): Promise<any> {
  const token = process.env.LIOREN_TOKEN;
  const response = await fetch(`${LIOREN_BASE_URL}/whoami`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token?.trim()}`,
    },
  });
  return await response.json();
}
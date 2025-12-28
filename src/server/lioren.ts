
'use server';

/**
 * @fileoverview Lógica de negocio blindada para API Lioren v1.
 */

const LIOREN_API_URL = 'https://api.lioren.cl/v1/dtes';

export async function createDTE(dteData: any): Promise<any> {
  // Acceso directo a variable de entorno para evitar fallos de importación
  const token = process.env.LIOREN_TOKEN;

  if (!token) {
    throw new Error('LIOREN_TOKEN no configurado en el servidor.');
  }

  try {
    const response = await fetch(LIOREN_API_URL, {
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
      console.error('ERROR SII/LIOREN:', responseData);
      // Si Lioren devuelve errores específicos de validación, los mostramos
      const detail = responseData.errors 
        ? Object.values(responseData.errors).flat().join(', ') 
        : (responseData.message || 'Error desconocido en el SII');
      throw new Error(detail);
    }

    return responseData;
  } catch (error: any) {
    console.error('FALLO DE COMUNICACIÓN LIOREN:', error.message);
    throw error;
  }
}

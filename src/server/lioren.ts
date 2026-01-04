/**
 * src/server/lioren.ts
 * Versión de Diagnóstico Quirúrgico
 */
export async function whoami(): Promise<any> {
  const token = process.env.LIOREN_TOKEN;

  // Si el token no existe, este mensaje aparecerá en el alert del navegador
  if (!token) {
    return { 
      success: false, 
      error: "ERROR_CRITICO: El servidor no tiene acceso a LIOREN_TOKEN. Revisa apphosting.yaml" 
    };
  }

  try {
    const response = await fetch('https://www.lioren.cl/api/whoami', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token.trim()}`,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: `LIOREN_REJECT: ${data.message || 'Token inválido o expirado'}` 
      };
    }

    // Si todo está bien, devolvemos la data con un flag de éxito
    return { success: true, ...data };

  } catch (err: any) {
    return { 
      success: false, 
      error: `CONEXION_FAIL: No se pudo contactar a Lioren. ${err.message}` 
    };
  }
}

export async function createDTE(dteData: any): Promise<any> {
  const token = process.env.LIOREN_TOKEN;
  if (!token) throw new Error('TOKEN_MISSING');

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
  if (!response.ok) throw new Error(responseData.message || JSON.stringify(responseData));
  return responseData;
}
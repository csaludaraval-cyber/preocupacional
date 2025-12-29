/**
 * Llama a la API de Lioren para crear un Documento Tributario Electrónico (DTE).
 * @param dteData El payload con los datos del DTE.
 * @returns La respuesta de la API de Lioren.
 */
export async function createDTE(dteData: any): Promise<any> {
  const token = process.env.LIOREN_TOKEN;
  if (!token) throw new Error('LIOREN_TOKEN no configurado en el entorno del servidor.');

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
    // Para errores, lanzamos el objeto completo de la respuesta de Lioren.
    // El 'message' suele contener el detalle del campo que falló.
    throw new Error(responseData.message || JSON.stringify(responseData));
  }

  return responseData;
}

/**
 * Llama al endpoint "whoami" de Lioren para verificar las credenciales del token.
 * @returns La información de la empresa asociada al token.
 */
export async function whoami(): Promise<any> {
    const token = process.env.LIOREN_TOKEN;
    if (!token) {
        throw new Error('LIOREN_TOKEN no está configurado en el servidor.');
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
            throw new Error(data.message || 'Respuesta no válida de Lioren al verificar credenciales.');
        }

        return data;

    } catch (error: any) {
        console.error("Error al conectar con Lioren (whoami):", error);
        throw new Error(`Fallo de conexión con Lioren: ${error.message}`);
    }
}

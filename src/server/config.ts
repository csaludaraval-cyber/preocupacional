/**
 * @fileoverview Archivo de configuración centralizado para el lado del servidor.
 * ATENCIÓN: NO exponga este archivo al lado del cliente.
 *
 * INSTRUCCIONES:
 * Ahora dependemos estrictamente de las variables de entorno.
 * Si alguna credencial sensible no está presente, el flow fallará inmediatamente
 * con un mensaje de error claro en el archivo 'enviar-cotizacion-flow.ts'.
 */
// Función auxiliar para parsear el puerto de forma segura.
const getSmtpPort = (envPort: string | undefined): number => {
  const port = parseInt(envPort || '587', 10);
  // 587 es un buen puerto por defecto para TLS.
  return isNaN(port) ? 587 : port;
}

export const SMTP_CONFIG = {
  // Eliminamos el fallback hardcodeado. Debe provenir de process.env.
  host: process.env.SMTP_HOST,
  // Utilizamos el puerto de ENV.
  port: getSmtpPort(process.env.SMTP_PORT),
  // Eliminamos el fallback hardcodeado. Debe provenir de process.env.
  user: process.env.SMTP_USER,
  // Eliminamos el secret hardcodeado. Debe provenir de process.env.
  pass: process.env.SMTP_PASS,
  // El 'from' puede tener un fallback por defecto que no es sensible.
  from: process.env.SMTP_FROM || '"Equipo Araval" <preocupacional@aravalcsalud.cl>',
};

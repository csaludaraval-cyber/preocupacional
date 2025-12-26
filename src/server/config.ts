
/**
 * @fileoverview Archivo de configuración centralizado para el lado del servidor.
 * ATENCIÓN: NO exponga este archivo al lado del cliente.
 *
 * INSTRUCCIONES:
 * Dependemos estrictamente de las variables de entorno para las credenciales SMTP y Lioren.
 * Si alguna variable sensible no está presente, el flow fallará con un error claro.
 */

// Función auxiliar para parsear el puerto de forma segura.
const getSmtpPort = (envPort: string | undefined): number => {
  const port = parseInt(envPort || '465', 10); // 465 es el puerto por defecto para SSL
  return isNaN(port) ? 465 : port;
}

export const SMTP_CONFIG = {
  // Las credenciales deben provenir exclusivamente de process.env.
  host: process.env.SMTP_HOST,
  port: getSmtpPort(process.env.SMTP_PORT),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  // El 'from' puede tener un fallback que no es sensible.
  from: process.env.SMTP_FROM || `"Equipo Araval" <preocupacional@aravalcsalud.cl>`,
};

export const LIOREN_CONFIG = {
  token: process.env.LIOREN_TOKEN,
  // RUT del emisor para las facturas, debe estar en las variables de entorno
  emisorRut: process.env.EMISOR_RUT,
};

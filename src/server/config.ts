/**
 * @fileoverview Archivo de configuración centralizado para el lado del servidor.
 * ATENCIÓN: NO exponga este archivo al lado del cliente.
 *
 * INSTRUCCIONES:
 * Este archivo está ahora configurado para usar Gmail como proveedor SMTP por defecto.
 * Asegúrese de que su archivo .env contenga las variables correctas.
 * Ejemplo para Gmail:
 * SMTP_HOST=smtp.gmail.com
 * SMTP_PORT=587
 * SMTP_USER=su_correo@gmail.com
 * SMTP_PASS=su_contraseña_de_aplicacion
 */
// Función auxiliar para parsear el puerto de forma segura.
const getSmtpPort = (envPort: string | undefined): number => {
  // 587 es el puerto estándar para SMTP con STARTTLS (usado por Gmail).
  const port = parseInt(envPort || '587', 10);
  return isNaN(port) ? 587 : port;
}

export const SMTP_CONFIG = {
  // Por defecto, usamos el host de Gmail.
  host: process.env.SMTP_HOST,
  // Puerto estándar para STARTTLS.
  port: getSmtpPort(process.env.SMTP_PORT),
  // Usuario (correo completo de Gmail).
  user: process.env.SMTP_USER,
  // Contraseña (preferiblemente una contraseña de aplicación de Google).
  pass: process.env.SMTP_PASS,
  // El 'from' puede tener un fallback. Gmail lo reescribirá con el correo del usuario autenticado.
  from: process.env.SMTP_FROM || `"Equipo Araval" <no-reply@araval.cl>`,
};

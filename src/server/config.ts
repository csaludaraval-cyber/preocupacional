/**
 * @fileoverview Archivo de configuración centralizado para el lado del servidor.
 * ATENCIÓN: NO exponga este archivo al lado del cliente.
 * 
 * INSTRUCCIONES:
 * Reemplace los valores de ejemplo a continuación con sus credenciales reales del servidor de correo.
 */

export const SMTP_CONFIG = {
  // El host de su proveedor de correo (ej: 'smtp.gmail.com', 'live.smtp.com')
  host: process.env.SMTP_HOST || 'mail.aravalcsalud.cl',

  // El puerto de conexión. 587 es el más común (para TLS), 465 es para SSL.
  port: parseInt(process.env.SMTP_PORT || '465', 10),

  // Su nombre de usuario o dirección de correo completa.
  user: process.env.SMTP_USER || 'preocupacional@aravalcsalud.cl',

  // Su contraseña de correo o una contraseña de aplicación si usa 2FA (muy recomendado).
  pass: process.env.SMTP_PASS || 'Araval123456a',

  // El nombre y correo que aparecerán como remitente en los emails.
  from: process.env.SMTP_FROM || '"Equipo Araval" <preocupacional@aravalcsalud.cl>',
};

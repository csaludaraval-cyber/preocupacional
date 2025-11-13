/**
 * @fileoverview Archivo de configuración centralizado para el lado del servidor.
 * ATENCIÓN: NO exponga este archivo al lado del cliente.
 */

// ADVERTENCIA: Reemplace estos valores con sus credenciales SMTP reales.
// Estos son solo ejemplos y no funcionarán en producción.
export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  user: process.env.SMTP_USER || 'user@example.com',
  pass: process.env.SMTP_PASS || 'your-password',
  from: process.env.SMTP_FROM || '"Equipo Araval" <no-reply@example.com>',
};

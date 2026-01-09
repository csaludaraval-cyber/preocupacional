// src/server/config.ts
export const SMTP_CONFIG = {
  // Probaremos con el host directo. 
  // Si esto falla, te sugeriré usar la IP del servidor de correo.
  host: "mail.aravalcsalud.cl", 
  port: 465, // Cambiamos a 465 (SSL Directo)
  user: (process.env.SMTP_USER || "").trim(),
  pass: (process.env.SMTP_PASS || "").trim(),
  from: '"Araval Salud" <preocupacional@aravalcsalud.cl>',
};

export const LIOREN_CONFIG = {
  token: process.env.LIOREN_TOKEN,
  emisorRut: "77102661-3",
};
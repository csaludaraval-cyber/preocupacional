// src/server/config.ts
export const SMTP_CONFIG = {
  // Usamos el valor del ENV o el valor fijo si el ENV falla
  host: process.env.SMTP_HOST || "mail.aravalcsalud.cl",
  port: Number(process.env.SMTP_PORT || 465),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || '"Araval Salud" <preocupacional@aravalcsalud.cl>',
};

export const LIOREN_CONFIG = {
  token: process.env.LIOREN_TOKEN,
  emisorRut: "77102661-3",
};

'use server';

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function enviarConfirmacionPago(quote: any) {
  const { id, empresaData, solicitanteData, solicitudesData, total } = quote;
  
  // 1. Construir lista dinámica de trabajadores e IDs
  const listaTrabajadores = (solicitudesData || []).map((s: any) => (
    `<li style="margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
      <span style="color: #64748b; font-size: 10px; display: block; text-transform: uppercase; font-weight: bold;">ID de Orden: #${id.slice(-6).toUpperCase()}</span>
      <strong style="color: #0f172a; font-size: 14px;">${s.trabajador?.nombre || 'S/N'}</strong>
    </li>`
  )).join('');

  // 2. Formatear Monto y Fecha
  const montoFormateado = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(total);
  const fechaRaw = solicitudesData?.[0]?.trabajador?.fechaAtencion;
  const fechaAtencion = fechaRaw ? new Date(fechaRaw).toLocaleDateString('es-CL') : 'Pendiente';

  const mailOptions = {
    from: `"Administración ARAVAL" <${process.env.SMTP_FROM}>`,
    to: solicitanteData?.mail || solicitanteData?.email,
    subject: `✅ PAGO CONFIRMADO - Orden #${id.slice(-6).toUpperCase()} - ARAVAL`,
    html: `
      <div style="font-family: sans-serif; color: #334155; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: white;">
        <div style="background-color: #0a0a4d; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">Confirmación de Pago</h1>
        </div>
        <div style="padding: 30px;">
          <p>Estimado/a <strong>${solicitanteData?.nombre || 'Solicitante'}</strong>,</p>
          <p>Confirmamos la recepción exitosa del pago por los servicios médicos de la empresa <strong>${empresaData?.razonSocial}</strong>.</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #f1f5f9;">
            <p style="margin-top: 0; font-weight: bold; font-size: 10px; color: #94a3b8; text-transform: uppercase; margin-bottom: 15px;">Resumen de Órdenes Habilitadas:</p>
            <ul style="padding: 0; margin: 0; list-style: none;">
              ${listaTrabajadores}
            </ul>
          </div>

          <p style="margin-bottom: 5px;"><strong>Monto Recibido:</strong> ${montoFormateado}</p>
          <p style="margin-top: 0;"><strong>Fecha de Atención:</strong> ${fechaAtencion}</p>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />

          <h3 style="font-size: 14px; text-transform: uppercase; color: #0a0a4d; margin-bottom: 10px;">Instrucciones de Presentación:</h3>
          <p style="margin: 0;"><strong>Hora:</strong> 09:00 hrs</p>
          <p style="margin: 5px 0;"><strong>Dirección:</strong> Juan Martínez 235, Taltal.</p>
          <p style="margin-top: 10px; font-size: 13px; color: #475569;">* Cada trabajador debe presentar su Cédula de Identidad y seguir estrictamente las indicaciones de ayuno y preparación enviadas en el correo anterior.</p>
          
          <p style="font-size: 11px; color: #94a3b8; margin-top: 40px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
            Este es un mensaje automático del sistema de gestión ARAVAL. No es necesario responder.
          </p>
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
}
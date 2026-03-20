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

// FUNCIÓN 1: ENVIAR COTIZACIÓN FORMAL (Para Clientes Normales - Estado CONFIRMADA)
export async function enviarCotizacionFormal(input: { clienteEmail: string, cotizacionId: string, pdfBase64: string }) {
  const mailOptions = {
    from: `"Administración ARAVAL" <${process.env.SMTP_FROM}>`,
    to: input.clienteEmail,
    subject: `Cotización Araval Salud N° ${input.cotizacionId}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0a0a4d; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px; text-transform: uppercase;">Cotización de Servicios</h1>
        </div>
        <div style="padding: 30px;">
          <p>Estimado/a,</p>
          <p>Adjunto encontrará la cotización formal detallada para los servicios médicos solicitados en nuestro Centro de Salud Araval.</p>
          
          <h3 style="color: #0a0a4d;">Pasos para concretar la atención:</h3>
          <ol>
            <li>Realizar el pago mediante transferencia bancaria (datos adjuntos abajo).</li>
            <li>Enviar el comprobante de pago a <strong>pagos@aravalcsalud.cl</strong> indicando el ID de cotización <strong>#${input.cotizacionId}</strong>.</li>
            <li>Una vez validado, recibirá un correo de confirmación con las instrucciones finales de la cita.</li>
          </ol>

          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #0a0a4d; margin-top: 0;">Datos de Transferencia</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Nombre:</strong> Araval Fisioterapia y Medicina Spa.</li>
              <li><strong>RUT:</strong> 77.102.661-3</li>
              <li><strong>Banco:</strong> Banco Estado</li>
              <li><strong>Cuenta corriente N°:</strong> 027-0-002475-2</li>
            </ul>
          </div>

          <p style="font-size: 12px; color: #64748b;">* El detalle de preparación para los exámenes (ayuno, etc.) se encuentra en la hoja 2 del PDF adjunto.</p>
          <br/>
          <p>Saludos cordiales,<br/><strong>Equipo Araval</strong></p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `Cotizacion-${input.cotizacionId}.pdf`,
        content: input.pdfBase64,
        encoding: 'base64',
      },
    ],
  };

  try {
    return await transporter.sendMail(mailOptions);
  } catch (error: any) {
    console.error("Error SMTP Cotizacion:", error);
    throw new Error("No se pudo despachar el correo: " + error.message);
  }
}

// FUNCIÓN 2: CONFIRMACIÓN DE PAGO / CITA (Para ambos clientes - Estado PAGADO)
export async function enviarConfirmacionPago(quote: any) {
  const { id, empresaData, solicitanteData, solicitudesData, total } = quote;
  const esFrecuente = (empresaData?.modalidadFacturacion || '').toLowerCase() === 'frecuente';

  const listaTrabajadores = (solicitudesData || []).map((s: any) => (
    `<li style="margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
      <span style="color: #64748b; font-size: 10px; display: block; text-transform: uppercase; font-weight: bold;">ID: #${id.slice(-6).toUpperCase()}</span>
      <strong style="color: #0a0a4d; font-size: 14px;">${s.trabajador?.nombre || 'S/N'}</strong>
    </li>`
  )).join('');

  const fechaRaw = solicitudesData?.[0]?.trabajador?.fechaAtencion;
  const fechaAtencion = fechaRaw ? new Date(fechaRaw).toLocaleDateString('es-CL') : 'Pendiente';

  const config = {
    asunto: esFrecuente ? `📅 CITA CONFIRMADA - ${empresaData?.razonSocial}` : `✅ PAGO CONFIRMADO - Orden #${id.slice(-6).toUpperCase()}`,
    titulo: esFrecuente ? "Cita Médica Agendada" : "Confirmación de Pago",
    bienvenida: esFrecuente 
      ? `Atenciones médicas agendadas exitosamente bajo su <strong>Convenio de Facturación Mensual</strong>.`
      : `Hemos recibido el pago por los servicios de <strong>${empresaData?.razonSocial}</strong>.`,
  };

  const mailOptions = {
    from: `"Administración ARAVAL" <${process.env.SMTP_FROM}>`,
    to: solicitanteData?.mail || solicitanteData?.email,
    subject: config.asunto,
    html: `
      <div style="font-family: Arial, sans-serif; color: #334155; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: white;">
        <div style="background-color: #0a0a4d; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0; font-size: 20px;">${config.titulo}</h1></div>
        <div style="padding: 30px;">
          <p>Estimado/a <strong>${solicitanteData?.nombre}</strong>,</p>
          <p>${config.bienvenida}</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #f1f5f9;">
            <p style="margin-top: 0; font-weight: bold; font-size: 10px; color: #0a0a4d; text-transform: uppercase;">Pacientes Habilitados:</p>
            <ul style="padding: 0; margin: 0; list-style: none;">${listaTrabajadores}</ul>
          </div>
          <p><strong>Fecha de Atención:</strong> ${fechaAtencion}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
          <h3 style="color: #0a0a4d; font-size: 15px;">Instrucciones para el Paciente:</h3>
          <ul style="font-size: 13px; color: #475569;">
            <li>Ayuno obligatorio: Mínimo 8 horas (solo agua).</li>
            <li>Hidratación: Beber abundante agua para el examen de orina.</li>
            <li>Documentación: Presentar Cédula de Identidad física.</li>
            <li>Restricciones: Sin alcohol ni drogas 48 horas antes.</li>
          </ul>
          <div style="margin-top: 25px; background-color: #f1f5f9; padding: 15px; border-radius: 8px;">
            <p style="margin: 0; font-size: 13px;">📍 Juan Martínez Nº 235, Taltal. ⏰ 09:00 hrs.</p>
          </div>
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
}
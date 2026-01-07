'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as nodemailer from 'nodemailer';
import { SMTP_CONFIG } from '@/server/config';
import { EnviarCotizacionInputSchema, type EnviarCotizacionInput } from '@/lib/types';

const EnviarCotizacionOutputSchema = z.object({
  status: z.enum(['success', 'error']),
  message: z.string(),
});

type EnviarCotizacionOutput = z.infer<typeof EnviarCotizacionOutputSchema>;

const enviarCotizacionFlow = ai.defineFlow(
  {
    name: 'enviarCotizacionFlow',
    inputSchema: EnviarCotizacionInputSchema,
    outputSchema: EnviarCotizacionOutputSchema,
  },
  async (input): Promise<EnviarCotizacionOutput> => {
    const { clienteEmail, cotizacionId, pdfBase64 } = input;
    const { host, port, user, pass, from } = SMTP_CONFIG;

    console.log(`Intentando enviar correo a: ${clienteEmail} para la cotización: ${cotizacionId}`);

    if (!host || !user || !pass) {
      return { status: 'error', message: 'Configuración SMTP incompleta.' };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    try {
      await transporter.sendMail({
        from,
        to: clienteEmail,
        subject: `Cotización Araval Salud N° ${cotizacionId}`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #000;">Cotización de Servicios Médicos</h2>
            <p>Estimado/a,</p>
            <p>Adjuntamos la cotización solicitada para el Centro de Salud <b>ARAVAL</b>.</p>
            <h3 style="border-bottom: 2px solid #eee; padding-bottom: 10px;">Pasos para concretar:</h3>
            <ol>
              <li>Realizar transferencia bancaria (datos adjuntos abajo).</li>
              <li>Enviar comprobante a <b>pagos@aravalcsalud.cl</b> indicando el ID: <b>${cotizacionId}</b>.</li>
            </ol>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 10px;">
              <p><b>Datos de Transferencia:</b><br/>
              Araval Fisioterapia y Medicina Spa<br/>
              RUT: 77.102.661-3<br/>
              Banco Estado | Cuenta Corriente: 027-0-002475-2</p>
            </div>
            <p style="margin-top: 20px;">Dirección: Juan Martínez Nº 235 - Taltal.</p>
            <p>Saludos cordiales,<br/><b>Equipo Araval Salud</b></p>
          </div>
        `,
        attachments: [
          {
            filename: `Cotizacion-Araval-${cotizacionId}.pdf`,
            content: pdfBase64,
            encoding: 'base64',
            contentType: 'application/pdf',
          },
        ],
      });

      return { status: 'success', message: 'Correo enviado.' };
    } catch (error: any) {
      console.error('Error en Nodemailer:', error);
      return { status: 'error', message: error.message || 'Error al enviar email.' };
    }
  }
);

export async function enviarCotizacion(input: EnviarCotizacionInput): Promise<EnviarCotizacionOutput> {
    try {
      return await enviarCotizacionFlow(input);
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
}
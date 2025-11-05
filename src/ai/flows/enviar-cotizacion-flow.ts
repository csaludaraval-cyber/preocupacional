'use server';
/**
 * @fileOverview Flow de Genkit para el envío de cotizaciones por correo electrónico.
 *
 * - enviarCotizacion - La función exportada que el frontend llamará.
 * - EnviarCotizacionInput - El tipo de entrada para la función.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as nodemailer from 'nodemailer';

// Esquema de entrada para el flow
export const EnviarCotizacionInputSchema = z.object({
  clienteEmail: z.string().email().describe('Correo electrónico del cliente destinatario.'),
  cotizacionId: z.string().describe('ID de la cotización para el asunto y nombre del archivo.'),
  pdfBase64: z.string().describe('Contenido del archivo PDF codificado en Base64.'),
});
export type EnviarCotizacionInput = z.infer<typeof EnviarCotizacionInputSchema>;

// El flow de Genkit (no se exporta directamente)
const enviarCotizacionFlow = ai.defineFlow(
  {
    name: 'enviarCotizacionFlow',
    inputSchema: EnviarCotizacionInputSchema,
    outputSchema: z.object({
      status: z.string(),
      message: z.string(),
    }),
  },
  async (input) => {
    const { clienteEmail, cotizacionId, pdfBase64 } = input;

    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = process.env.SMTP_PORT;
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      console.error('SMTP environment variables not set');
      throw new Error('Las variables de entorno del servidor de correo (SMTP) no están configuradas.');
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: parseInt(SMTP_PORT, 10) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    try {
      const info = await transporter.sendMail({
        from: `"Equipo Araval" <${process.env.SMTP_USER || 'preocupacional@aravalcsalud.cl'}>`,
        to: clienteEmail,
        subject: `Cotización de Servicios Araval N° ${cotizacionId}`,
        html: `
          <p>Estimado/a,</p>
          <p>Junto con saludar, adjuntamos la cotización de servicios solicitada.</p>
          <p>Para cualquier consulta o para coordinar la toma de exámenes, no dude en contactarnos.</p>
          <br/>
          <p>Saludos cordiales,</p>
          <p><b>Equipo Araval</b></p>
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

      console.log('Correo enviado exitosamente:', info.messageId);
      return {
        status: 'success',
        message: `Cotización ${cotizacionId} enviada a ${clienteEmail}.`,
      };
    } catch (error: any) {
      console.error('Error detallado de Nodemailer:', error);
      throw new Error(`Error al contactar el servidor de correo: ${error.message}`);
    }
  }
);

// Función contenedora asíncrona que SÍ se exporta
export async function enviarCotizacion(input: EnviarCotizacionInput): Promise<{ status: string; message: string; }> {
    return await enviarCotizacionFlow(input);
}

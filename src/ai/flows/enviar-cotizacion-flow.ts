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
    const { host, port, user, pass, from } = SMTP_CONFIG;

    if (!host || !user || !pass) {
      return {
        status: 'error',
        message: `Faltan credenciales en el servidor (SMTP_CONFIG).`,
      };
    }

    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: port === 465,
      auth: {
        user: user,
        pass: pass,
      },
      tls: {
        rejectUnauthorized: false,
        servername: host,
      }
    });

    try {
      await transporter.sendMail({
        from,
        to: input.clienteEmail,
        subject: `Cotización Araval Salud N° ${input.cotizacionId}`,
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155;">
          <p>Estimado/a,</p>
          <p>Gracias por su interés en nuestros servicios. Para coordinar la atención de los pacientes en nuestro Centro de Salud Araval, le detallamos los pasos a seguir:</p>
          
          <h3 style="color: #0a0a4d; text-transform: uppercase;">Pasos para agendar una hora</h3>
          <ol>
              <li>
                  <strong>Realizar el pago</strong>
                  <p>Los datos de transferencia se encuentran más abajo en este correo.</p>
                  <p><strong>IMPORTANTE:</strong> En el correo de confirmación, indicar el número de Documento (ID), para agilizar el proceso de validación y agendamiento.</p>
              </li>
          </ol>

          <p style="color: #0a0a4d;"><strong>RECUERDA: EL HORARIO DE RECEPCIÓN PARA VALIDAR SU SOLICITUD DE EXAMEN SERA VALIDO ENTRE: 08.00 AM A 19:00 PM.</strong></p>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 20px;">
              <h3 style="color: #0a0a4d; margin-top: 0; text-transform: uppercase; font-size: 14px;">Datos de Transferencia</h3>
              <ul style="list-style-type: none; padding: 0; margin: 0; font-size: 13px;">
                  <li><strong>Nombre:</strong> Araval Fisioterapia y Medicina Spa.</li>
                  <li><strong>RUT:</strong> 77.102.661-3</li>
                  <li><strong>Banco:</strong> Banco Estado</li>
                  <li><strong>Cuenta corriente N°:</strong> 027-0-002475-2</li>
                  <li style="margin-top: 10px;"><strong>CORREO PARA ENVÍO DEL COMPROBANTE: CONTACTO@ARAVALCENTRODESALUD.CL</strong></li>
              </ul>
          </div>

          <div style="margin-top: 25px;">
              <p><strong>Dirección de nuestra sucursal en TALTAL es:</strong><br/>
              Juan Martínez Nº 235 - Taltal.<br/>
              (CENTRO DE SALUD ARAVAL)</p>
              <p><strong>Horario de atención:</strong> 08:00 - 12:00, 15:00 - 17:00 Hrs</p>
          </div>

          <div style="margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              <h3 style="color: #0a0a4d; text-transform: uppercase; font-size: 14px;">Indicaciones para el paciente el día del examen:</h3>
              <ul style="font-size: 13px; color: #475569;">
                  <li><strong>Ayuno obligatorio:</strong> mínimo 8 horas, máximo 12 horas.</li>
                  <li>Llevar cédula de identidad física.</li>
                  <li>Usar lentes ópticos, en caso de necesitarlos.</li>
                  <li>Presentar licencia de conducir, si tiene agendado un examen psicotécnico.</li>
                  <li>No suspender la ingesta de medicamentos según tratamiento médico.</li>
              </ul>
          </div>

          <p style="margin-top: 25px;">Si tiene alguna consulta adicional o necesita más información, estamos disponibles para asistirle.</p>
          <p>Quedamos atentos a su confirmación.</p>
          <br/>
          <p>Saludos cordiales,</p>
          <p><strong>Equipo Araval</strong></p>
      </div>`,
        attachments: [
          {
            filename: `Cotizacion-${input.cotizacionId}.pdf`,
            content: input.pdfBase64,
            encoding: 'base64',
          },
        ],
      });

      return { status: 'success', message: 'Correo enviado correctamente.' };
    } catch (error: any) {
      console.error('Error SMTP:', error);
      return { status: 'error', message: `Error del servidor de correo: ${error.message}` };
    }
  }
);

export async function enviarCotizacion(input: EnviarCotizacionInput): Promise<EnviarCotizacionOutput> {
    return await enviarCotizacionFlow(input);
}

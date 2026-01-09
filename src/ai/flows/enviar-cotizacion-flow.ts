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
      const faltantes = [];
      if (!host) faltantes.push("HOST");
      if (!user) faltantes.push("USER");
      if (!pass) faltantes.push("PASS");
      
      return {
        status: 'error',
        message: `Faltan credenciales en el servidor: ${faltantes.join(', ')}`,
      };
    }

    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: port === 465, // True para 465, false para otros puertos
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
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <p>Estimado/a,</p>
          <p>Gracias por su interés en nuestros servicios. Para coordinar la atención de los pacientes en nuestro Centro de Salud Araval, le detallamos los pasos a seguir:</p>
          
          <h3 style="color: #0303b5;">Pasos para agendar una hora</h3>
          <ol>
              <li>
                  <strong>Realizar el pago</strong>
                  <p>Los datos de transferencia se encuentran más abajo en este correo.</p>
                  <p><strong>IMPORTANTE:</strong> En el correo de confirmación, indicar el número de Documento (ID), para agilizar el proceso de validación y agendamiento.</p>
              </li>
          </ol>

          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <h3 style="color: #0303b5;">Datos de Transferencia</h3>
              <ul style="list-style-type: none; padding: 0;">
                  <li><strong>Nombre:</strong> Araval Fisioterapia y Medicina Spa.</li>
                  <li><strong>RUT:</strong> 77.102.661-3</li>
                  <li><strong>Banco:</strong> Banco Estado</li>
                  <li><strong>Cuenta corriente N°:</strong> 027-0-002475-2</li>
                  <li><strong>Correo para envío del comprobante:</strong> pagos@aravalcsalud.cl</li>
              </ul>
          </div>

          <div style="margin-top: 20px;">
              <p><strong>Dirección de nuestra sucursal en TALTAL es:</strong><br/>
              Dirección: Juan Martínez Nº 235 - Taltal.<br/>
              (CENTRO DE SALUD ARAVAL)</p>
              <p><strong>Horario de atención:</strong> 08:00 - 12:00, 15:00 - 17:00 Hrs</p>
          </div>

          <div style="margin-top: 20px;">
              <h3 style="color: #0303b5;">Indicaciones para el paciente el día del examen:</h3>
              <ul style="list-style-type: '• '; padding-left: 20px;">
                  <li><strong>Ayuno obligatorio:</strong> mínimo 8 horas, máximo 12 horas.</li>
                  <li>Llevar cédula de identidad.</li>
                  <li>Usar lentes ópticos, en caso de necesitarlos.</li>
                  <li>Presentar licencia de conducir, si tiene agendado un examen psicotécnico.</li>
                  <li>No suspender la ingesta de medicamentos según tratamiento médico.</li>
              </ul>
          </div>

          <p>Si tiene alguna consulta adicional o necesita más información, estamos disponibles para asistirle.</p>
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

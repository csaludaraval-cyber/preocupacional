
'use server';
/**
 * @fileOverview Flow de Genkit para el envío de cotizaciones por correo electrónico.
 *
 * - enviarCotizacion - La función exportada que el frontend llamará.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as nodemailer from 'nodemailer';
import { EnviarCotizacionInputSchema, type EnviarCotizacionInput } from '@/lib/types';
import { SMTP_CONFIG } from '@/server/config';


const EnviarCotizacionOutputSchema = z.object({
  status: z.enum(['success', 'error']),
  message: z.string(),
});

// El flow de Genkit (no se exporta directamente)
const enviarCotizacionFlow = ai.defineFlow(
  {
    name: 'enviarCotizacionFlow',
    inputSchema: EnviarCotizacionInputSchema,
    outputSchema: EnviarCotizacionOutputSchema,
  },
  async (input) => {
    const { clienteEmail, cotizacionId, pdfBase64 } = input;

    // FASE 1: VALIDACIÓN ESTRICTA de variables de entorno.
    const { host, port, user, pass, from } = SMTP_CONFIG;

    if (!host || !port || !user || !pass) {
      const errorMessage = 'Error Crítico de Configuración: Faltan una o más variables de entorno del servidor de correo (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).';
      console.error(errorMessage);
      return {
        status: 'error',
        message: errorMessage,
      };
    }

    // FASE 2: TRANSPORTER CON TIMEOUT
    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user: user,
        pass: pass,
      },
      // AÑADIMOS TIMEOUT para evitar que la Server Action se cuelgue.
      connectionTimeout: 10000, // 10 segundos
    });

    try {
      const info = await transporter.sendMail({
        from: from,
        to: clienteEmail,
        subject: `Cotización de Servicios Araval N° ${cotizacionId}`,
        html: `
          <p>Estimado/a,</p>
          <p>Gracias por su interés en nuestros servicios. Para coordinar la atención de los pacientes en nuestro Laboratorio Clínico ARAVAL TALTAL, le detallamos los pasos a seguir:</p>
          
          <h3 style="font-weight: bold; margin-top: 20px;">Pasos para agendar una hora</h3>
          <ol>
            <li>
              <b>Realizar el pago</b>
              <p style="margin: 0; padding-left: 15px;">• Los datos de transferencia se encuentran más abajo en este correo.</p>
            </li>
          </ol>

          <p><b>IMPORTANTE:</b> En el correo de confirmación, indicar el número de folio de la cotización previamente enviada, para agilizar el proceso de validación y agendamiento.</p>

          <h3 style="font-weight: bold; margin-top: 20px;">Datos de Transferencia</h3>
          <ul style="list-style: none; padding: 0;">
            <li>• <b>Nombre:</b> Araval Fisioterapia y Medicina Spa.</li>
            <li>• <b>RUT:</b> 77.102.661-3</li>
            <li>• <b>Banco:</b> Banco Estado</li>
            <li>• <b>Cuenta corriente N°:</b> 027-0-002475-2</li>
            <li>• <b>Correo para envío del comprobante:</b> pagos@aravalcsalud.cl</li>
          </ul>

          <h3 style="font-weight: bold; margin-top: 20px;">Dirección de nuestra sucursal en TALTAL es:</h3>
          <p>
            <b>Dirección:</b> Juan Martínez Nº 235 - Taltal.<br>
            (CENTRO DE SALUD ARAVAL)
          </p>

          <p><b>Horario de atención:</b> 08:00 - 12:00, 15:00 - 17:00 Hrs</p>

          <h3 style="font-weight: bold; margin-top: 20px;">Indicaciones para el paciente el día del examen:</h3>
          <ul style="list-style: none; padding: 0;">
            <li>• <b>Ayuno obligatorio:</b> mínimo 8 horas, máximo 12 horas.</li>
            <li>• Llevar <b>cédula de identidad</b>.</li>
            <li>• Usar <b>lentes ópticos</b>, en caso de necesitarlos.</li>
            <li>• Presentar <b>licencia de conducir</b>, si tiene agendado un examen psicotécnico.</li>
            <li>• <b>No suspender la ingesta de medicamentos</b> según tratamiento médico.</li>
          </ul>

          <p>Si tiene alguna consulta adicional o necesita más información, estamos disponibles para asistirle.</p>
          <p>Quedamos atentos a su confirmación.</p>
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
      // Devolvemos un objeto de error estructurado al cliente.
      return {
          status: 'error',
          message: `Error al contactar el servidor de correo: ${error.message}`
      };
    }
  }
);

// ÚNICA EXPORTACIÓN: Función contenedora asíncrona que ahora devuelve el tipo de salida del flow.
export async function enviarCotizacion(input: EnviarCotizacionInput): Promise<z.infer<typeof EnviarCotizacionOutputSchema>> {
    const result = await enviarCotizacionFlow(input);
    
    // Si el flow devuelve un error estructurado, lo relanzamos para que el cliente lo capture en el catch.
    if (result.status === 'error') {
        throw new Error(result.message);
    }
    
    return result;
}


import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import type { Examen, Empresa, Trabajador, SolicitudTrabajador, Solicitante } from '@/types/models';

// Re-exporta los modelos base para consistencia
export type { Examen, Empresa, Trabajador, SolicitudTrabajador, Solicitante };

export type WithId<T> = T & { id: string };

// Tipos de estado estandarizados para el flujo de cotización y facturación
export type StatusCotizacion =
  | 'PENDIENTE'             // Solicitud pública recién creada, sin procesar.
  | 'CONFIRMADA'            // Cotización formal creada por un administrador, lista para enviar.
  | 'CORREO_ENVIADO'        // Cotización enviada por correo al cliente.
  | 'PAGADO'                // El cliente ha pagado, voucher subido, lista para facturar.
  | 'FACTURADO'             // Factura (DTE) emitida en Lioren.
  | 'RECHAZADA'             // El cliente rechazó la cotización.
  | 'orden_examen_enviada'  // Estado especial para clientes frecuentes, pendiente de facturación consolidada.
  | 'facturado_lioren';     // Estado legado, se migrará a FACTURADO.

export type Cotizacion = {
  id: string;
  empresa: Empresa; 
  solicitante: Solicitante; 
  solicitudes: SolicitudTrabajador[]; 
  total: number;
  fecha: string; 
  fechaCreacion: { seconds: number; nanoseconds: number; }; 
  status: StatusCotizacion;
  empresaData: Empresa;
  solicitanteData: Solicitante;
  solicitudesData: SolicitudTrabajador[];
  originalRequestId?: string | null;
  liorenFolio?: string;
  liorenId?: string;
  liorenFechaEmision?: string;
  liorenPdfUrl?: string;
  pagoVoucherUrl?: string;
};

export type CotizacionFirestore = {
  id: string;
  empresaId: string;
  solicitanteId: string;
  fechaCreacion: Timestamp;
  total: number;
  empresaData: Empresa;
  solicitanteData: Solicitante; 
  solicitudesData: SolicitudTrabajador[]; 
  status: StatusCotizacion;
  originalRequestId?: string | null;
  liorenFolio?: string;
  liorenId?: string;
  liorenFechaEmision?: string;
  liorenPdfUrl?: string;
  pagoVoucherUrl?: string;
}

export type SolicitudPublica = {
  id: string;
  empresa: Empresa;
  solicitante: Solicitante;
  solicitudes: SolicitudTrabajador[];
  fechaCreacion: Timestamp;
  estado: 'pendiente' | 'procesada' | 'orden_examen_enviada';
};

export const EnviarCotizacionInputSchema = z.object({
  clienteEmail: z.string().email().describe('Correo electrónico del cliente destinatario.'),
  cotizacionId: z.string().describe('ID de la cotización para el asunto y nombre del archivo.'),
  pdfBase64: z.string().describe('Contenido del archivo PDF codificado en Base64.'),
});
export type EnviarCotizacionInput = z.infer<typeof EnviarCotizacionInputSchema>;

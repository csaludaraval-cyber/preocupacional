
import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import type { Examen, Empresa, Trabajador, SolicitudTrabajador, Solicitante, StatusCotizacion } from '@/types/models';

export type { Examen, Empresa, Trabajador, SolicitudTrabajador, Solicitante, StatusCotizacion };

export type WithId<T> = T & { id: string };

// This is the primary type used throughout the application, combining Firestore data and UI needs.
export type Cotizacion = {
  id: string;
  empresa: Empresa; 
  solicitante: Solicitante; 
  solicitudes: SolicitudTrabajador[]; 
  total: number;
  fecha: string; // Formatted date for display
  fechaCreacion: { seconds: number; nanoseconds: number; }; 
  status: StatusCotizacion;
  // Denormalized data matching Firestore
  empresaData: Empresa;
  solicitanteData: Solicitante;
  solicitudesData: SolicitudTrabajador[];
  originalRequestId?: string | null;
  // Lioren fields, now correctly part of the main type
  liorenFolio?: string;
  liorenId?: string;
  liorenFechaEmision?: string;
  liorenPdfUrl?: string;
  // Payment confirmation
  pagoVoucherUrl?: string;
};


// This is the type that is stored in Firestore
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
  // Lioren fields
  liorenFolio?: string;
  liorenId?: string;
  liorenFechaEmision?: string;
  liorenPdfUrl?: string;
  // Payment confirmation
  pagoVoucherUrl?: string;
}

// Type for the entire public submission, as it will be stored in Firestore
export type SolicitudPublica = {
  id: string;
  empresa: Empresa;
  solicitante: Solicitante;
  solicitudes: SolicitudTrabajador[];
  fechaCreacion: Timestamp;
  estado: 'pendiente' | 'procesada' | 'orden_examen_enviada';
};

// Input schema for the email sending flow
export const EnviarCotizacionInputSchema = z.object({
  clienteEmail: z.string().email().describe('Correo electrónico del cliente destinatario.'),
  cotizacionId: z.string().describe('ID de la cotización para el asunto y nombre del archivo.'),
  pdfBase64: z.string().describe('Contenido del archivo PDF codificado en Base64.'),
});
export type EnviarCotizacionInput = z.infer<typeof EnviarCotizacionInputSchema>;

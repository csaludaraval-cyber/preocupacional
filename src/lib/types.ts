
import { type User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

export type WithId<T> = T & { id: string };

export type Examen = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  valor: number;
};

export type Empresa = {
  razonSocial: string;
  rut: string;
  direccion: string;
  giro: string;
  ciudad: string;
  comuna: string;
  region: string;
  email: string;
  modalidadFacturacion?: 'normal' | 'frecuente';
};

export type Trabajador = {
  nombre: string;
  rut: string;
  cargo: string;
  fechaNacimiento: string;
  fechaAtencion: string;
};

export type SolicitudTrabajador = {
  id: string; 
  trabajador: Trabajador;
  examenes: Examen[];
};

// This is a combination of Firestore data and derived data for UI
export type Cotizacion = {
  id: string;
  empresa: Empresa; 
  solicitante: Solicitante; 
  solicitudes: SolicitudTrabajador[]; 
  total: number;
  fecha: string; // Formatted date for display
  fechaCreacion: Timestamp; 
  status: StatusCotizacion;
  // Denormalized data matching Firestore
  empresaData: Empresa;
  solicitanteData: Solicitante;
  solicitudesData: SolicitudTrabajador[];
  simpleFacturaInvoiceId?: string;
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
  simpleFacturaInvoiceId?: string; // To store the invoice folio from SimpleFactura
}

export type StatusCotizacion = 
  | 'PENDIENTE' 
  | 'ENVIADA' 
  | 'ACEPTADA' 
  | 'RECHAZADA' 
  | 'orden_examen_enviada' 
  | 'facturado_simplefactura';

export interface User extends FirebaseUser {
  role?: 'admin' | 'standard';
}

export type Solicitante = {
  nombre: string;
  rut: string;
  cargo: string;
  centroDeCostos: string;
  mail: string;
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


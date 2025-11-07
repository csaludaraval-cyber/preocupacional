

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

// This type is for the frontend display and URL passing
export type Cotizacion = {
  id: string;
  empresa: Empresa;
  solicitante: Omit<Trabajador, 'fechaNacimiento' | 'fechaAtencion'> & { mail: string; centroDeCostos: string; }; // Solicitante has different fields
  solicitudes: SolicitudTrabajador[]; // Contains each worker with their specific exams
  total: number;
  fecha: string;
  fechaCreacion: Timestamp; // To keep the original timestamp for sorting
  status: 'PENDIENTE' | 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA' | 'orden_examen_enviada' | 'facturado_consolidado';
};

// This is the type that is stored in Firestore
export type CotizacionFirestore = {
  id: string;
  empresaId: string;
  solicitanteId: string;
  fechaCreacion: Timestamp;
  total: number;
  empresaData: Empresa;
  solicitanteData: Omit<Trabajador, 'fechaNacimiento' | 'fechaAtencion'> & { mail: string; centroDeCostos: string; }; // Main contact
  solicitudesData: SolicitudTrabajador[]; // All workers with their exams
  status: 'PENDIENTE' | 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA' | 'orden_examen_enviada' | 'facturado_consolidado';
}

export interface User extends FirebaseUser {
  role?: 'admin' | 'standard';
}

// Type for the entire public submission, as it will be stored in Firestore
export type SolicitudPublica = {
  id: string;
  empresa: Empresa;
  solicitante: Omit<Trabajador, 'fechaNacimiento' | 'fechaAtencion'> & { mail: string; centroDeCostos: string; }; // Added to store contact person's data
  solicitudes: {
    trabajador: Trabajador,
    examenes: Examen[]
  }[];
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

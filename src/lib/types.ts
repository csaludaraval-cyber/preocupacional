
import { type User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

export type Examen = {
  id: string;
  nombre: string;
  categoria: string;
  subcategoria: string;
  valor: number;
  unidad: 'CLP';
  descripcion: string;
  esBateria: boolean;
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
};

export type Trabajador = {
  nombre: string;
  rut: string;
  cargo: string;
  centroDeCostos: string;
  mail: string;
};

export type SolicitudTrabajador = {
  id: string; 
  trabajador: Trabajador;
  examenes: Examen[];
};

// This type is for the frontend display and URL passing
export type Cotizacion = {
  id?: string;
  empresa: Empresa;
  solicitante: Trabajador; // This is the main contact for the quote
  solicitudes: SolicitudTrabajador[]; // Contains each worker with their specific exams
  total: number;
  fecha: string;
};

// This is the type that is stored in Firestore
export type CotizacionFirestore = {
  id: string;
  empresaId: string;
  solicitanteId: string;
  fechaCreacion: Timestamp;
  total: number;
  empresaData: Empresa;
  solicitanteData: Trabajador; // Main contact
  solicitudesData: SolicitudTrabajador[]; // All workers with their exams
}

export interface User extends FirebaseUser {
  role?: 'admin' | 'standard';
}

// Type for the entire public submission, as it will be stored in Firestore
export type SolicitudPublica = {
  id: string;
  empresa: Empresa;
  solicitante: Trabajador; // Added to store contact person's data
  solicitudes: {
    trabajador: Trabajador,
    examenes: Examen[]
  }[];
  fechaCreacion: Timestamp;
  estado: 'pendiente' | 'procesada';
};

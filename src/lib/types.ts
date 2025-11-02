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
};

export type Trabajador = {
  nombre: string;
  rut: string;
  cargo: string;
  centroDeCostos: string;
  mail: string;
};

// This type is for the frontend display and URL passing
export type Cotizacion = {
  id?: string;
  empresa: Empresa;
  trabajador: Trabajador;
  examenes: Examen[];
  total: number;
  fecha: string;
};

// This is the type that is stored in Firestore
export type CotizacionFirestore = {
  id: string;
  empresaId: string;
  solicitanteId: string;
  fechaCreacion: Timestamp;
  examenIds: string[];
  total: number;
  empresaData: Empresa;
  solicitanteData: Trabajador;
  examenesData: Examen[];
}

export interface User extends FirebaseUser {
  role?: 'admin' | 'standard';
}

// Type for a single worker's exam request within a public submission
export type SolicitudTrabajador = {
  id: string; // A unique ID for the worker within the form, e.g., using crypto.randomUUID()
  trabajador: Trabajador;
  examenes: Examen[];
};

// Type for the entire public submission, as it will be stored in Firestore
export type SolicitudPublica = {
  id: string;
  empresa: Empresa;
  solicitudes: {
    trabajador: Trabajador,
    examenes: { id: string, nombre: string, categoria: string, subcategoria: string }[]
  }[];
  fechaCreacion: Timestamp;
  estado: 'pendiente' | 'procesada';
};

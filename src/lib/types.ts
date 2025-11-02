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
export type CotizacionDisplay = {
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

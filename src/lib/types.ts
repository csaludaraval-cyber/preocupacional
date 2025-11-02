import { type User as FirebaseUser } from 'firebase/auth';

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

export type Cotizacion = {
  empresa: Empresa;
  trabajador: Trabajador;
  examenes: Examen[];
  total: number;
  fecha: string;
};

export interface User extends FirebaseUser {
  role?: 'admin' | 'standard';
}

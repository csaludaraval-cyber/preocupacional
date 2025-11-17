
import { Timestamp } from 'firebase/firestore';

/**
 * Representa la estructura de un examen individual en el catálogo.
 * Utilizado para la selección y el cálculo de costos.
 */
export interface Examen {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  valor: number;
}

/**
 * Define la modalidad de facturación para una empresa.
 * - `normal`: El flujo estándar de cotización y envío de correo.
 * - `frecuente`: Acumula órdenes de examen para facturación consolidada.
 */
export type ModalidadFacturacion = 'normal' | 'frecuente';

/**
 * Representa la información de una empresa cliente.
 * El RUT se utiliza como ID único en Firestore.
 * El campo `modalidadFacturacion` es clave para el nuevo flujo.
 */
export interface Empresa {
  rut: string;
  razonSocial: string;
  direccion: string;
  giro: string;
  ciudad: string;
  comuna: string;
  region: string;
  email: string;
  modalidadFacturacion?: ModalidadFacturacion;
}

/**
 * Representa la información de un trabajador que será evaluado.
 */
export interface Trabajador {
  nombre: string;
  rut: string;
  cargo: string;
  fechaNacimiento: string;
  fechaAtencion: string;
}

/**
 * Representa al contacto principal que realiza la solicitud de exámenes.
 */
export interface Solicitante {
  nombre: string;
  rut: string;
  cargo: string;
  centroDeCostos: string;
  mail: string;
}

/**
 * Asocia un trabajador específico con una lista de exámenes solicitados.
 * Es la unidad fundamental de una solicitud.
 */
export interface SolicitudTrabajador {
  id: string;
  trabajador: Trabajador;
  examenes: Examen[];
}

/**
 * Representa el estado de una cotización a lo largo de su ciclo de vida.
 * - `PENDIENTE`: Creada pero no enviada.
 * - `ENVIADA`: Enviada al cliente normal.
 * - `ACEPTADA` / `RECHAZADA`: Estados finales para cliente normal.
 * - `orden_examen_enviada`: Estado especial para solicitudes de clientes frecuentes, pendiente de facturación.
 */
export type StatusCotizacion =
  | 'PENDIENTE'
  | 'ENVIADA'
  | 'ACEPTADA'
  | 'RECHAZADA'
  | 'orden_examen_enviada'
  | 'cotizacion_aceptada'
  | 'facturado_lioren';


/**
 * Representa el objeto de cotización que se guarda en Firestore y se utiliza
 * a lo largo de la aplicación.
 */
export interface Cotizacion {
  id: string;
  // Relaciones y metadatos
  empresaId: string;
  solicitanteId: string;
  fechaCreacion: Timestamp;
  status: StatusCotizacion;
  // Datos denormalizados para fácil acceso
  empresaData: Empresa;
  solicitanteData: Solicitante;
  solicitudesData: SolicitudTrabajador[];
  total: number;
}

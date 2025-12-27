import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import type { Examen, Empresa, Trabajador, SolicitudTrabajador, Solicitante } from '@/types/models';

export type { Examen, Empresa, Trabajador, SolicitudTrabajador, Solicitante };

// --- MÁQUINA DE ESTADOS BLINDADA ---
// Incluimos estados nuevos y viejos para evitar errores de compilación y runtime
export type StatusCotizacion =
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'CORREO_ENVIADO'
  | 'PAGADO'
  | 'FACTURADO'
  | 'RECHAZADA'
  | 'ACEPTADA'               // Legado
  | 'orden_examen_enviada'   // Legado (Clientes frecuentes)
  | 'facturado_lioren';      // Legado

// --- INTERFAZ DE CLIENTE (Segura para Next.js) ---
// Usamos strings para las fechas para evitar errores de serialización (Error 500)
export interface Cotizacion {
  id: string;
  total: number;
  status: StatusCotizacion;
  fechaCreacion?: string; // Fecha formateada para la UI
  
  // Usamos Optional Chaining en la lógica para estos datos
  empresaData?: Empresa;
  solicitanteData?: Solicitante;
  solicitudesData?: SolicitudTrabajador[];
  
  // Campos de integración
  liorenFolio?: string;
  liorenId?: string;
  liorenPdfUrl?: string;
  pagoVoucherUrl?: string;
  liorenFechaEmision?: string;
  originalRequestId?: string | null;
}

// --- INTERFAZ DE FIRESTORE (Datos crudos) ---
export interface CotizacionFirestore {
  id?: string;
  empresaId: string;
  solicitanteId: string;
  fechaCreacion: any; // Usamos any aquí para manejar Timestamps o objetos de milisegundos
  total: number;
  status: StatusCotizacion;
  
  // Datos denormalizados ( snapshots )
  empresaData?: Empresa;
  solicitanteData?: Solicitante;
  solicitudesData?: SolicitudTrabajador[];
  
  liorenFolio?: string;
  liorenId?: string;
  liorenPdfUrl?: string;
  pagoVoucherUrl?: string;
  originalRequestId?: string | null;
}

// --- ESQUEMAS DE VALIDACIÓN ---
export const EnviarCotizacionInputSchema = z.object({
  clienteEmail: z.string().email(),
  cotizacionId: z.string(),
  pdfBase64: z.string(),
});

export type EnviarCotizacionInput = z.infer<typeof EnviarCotizacionInputSchema>;
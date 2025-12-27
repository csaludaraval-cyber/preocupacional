export type StatusCotizacion = 'PENDIENTE' | 'CONFIRMADA' | 'CORREO_ENVIADO' | 'PAGADO' | 'FACTURADO' | 'RECHAZADA' | 'orden_examen_enviada';

export const mapLegacyStatus = (status: string | undefined | null): StatusCotizacion => {
  if (!status) return 'PENDIENTE';
  
  const normalized = status.toUpperCase();
  
  const map: Record<string, StatusCotizacion> = {
    'ACEPTADA': 'CONFIRMADA',
    'COTIZACION_ACEPTADA': 'CONFIRMADA',
    'ENVIADA': 'CORREO_ENVIADO',
    'FACTURADO_LIOREN': 'FACTURADO',
    'PAGADA': 'PAGADO',
    'ORDEN_EXAMEN_ENVIADA': 'orden_examen_enviada',
  };

  const newStatuses: StatusCotizacion[] = ['PENDIENTE', 'CONFIRMADA', 'CORREO_ENVIADO', 'PAGADO', 'FACTURADO', 'RECHAZADA', 'orden_examen_enviada'];

  if (map[normalized]) {
    return map[normalized];
  }

  if (newStatuses.includes(normalized as StatusCotizacion)) {
    return normalized as StatusCotizacion;
  }
  
  return 'PENDIENTE';
};

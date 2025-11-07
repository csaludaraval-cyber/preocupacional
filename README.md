# Sistema de Gestión y Facturación ARACORP (Integración SimpleFactura)

Este sistema gestiona el flujo de cotizaciones y la emisión de Documentos Tributarios Electrónicos (DTE) utilizando la API de SimpleFactura.

## Flujos de Facturación Implementados

Actualmente, todas las facturas emitidas son Factura No Afecta o Exenta (DTE Tipo 34), ya que los servicios prestados son exentos de IVA.

### 1. Modalidad Consolidada (Clientes Frecuentes)

Diseñada para clientes con los que existe un convenio de pago mensual o periódico.

| Estado Inicial                     | Acciones del Sistema                                     | DTE Final           |
| ---------------------------------- | -------------------------------------------------------- | ------------------- |
| `orden_examen_enviado` (acumulación) | El Administrador entra a Facturación Consolidada.        | Factura Exenta (34) |

**Flujo:** Las órdenes acumuladas se agrupan por RUT del cliente y se emite un único DTE que consolida el total de todas las órdenes. Todas las órdenes son actualizadas a `facturado_simplefactura`.

### 2. Modalidad Inmediata (Clientes Normales)

Diseñada para clientes que requieren la factura inmediatamente después de aceptar la cotización.

| Estado Inicial                        | Acciones del Sistema                                   | DTE Final           |
| ------------------------------------- | ------------------------------------------------------ | ------------------- |
| `cotizacion_aceptada` (modalidad normal) | El Administrador usa el botón "Facturar Ahora" en la gestión de cotizaciones. | Factura Exenta (34) |

**Flujo:** Se emite un DTE único por esa cotización individual. La cotización es actualizada a `facturado_simplefactura`.

## Tareas Pendientes y Escalabilidad (Próxima Fase)

El sistema está arquitecturado para una fácil expansión a futuros requerimientos fiscales.

| Requerimiento                      | Descripción                                                                                                                                                             | Archivos Impactados                                                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Implementar Factura Afecta (DTE 33)** | Se necesita añadir la lógica para calcular el monto Neto y el IVA (19%) para servicios o productos que sí estén afectos. La constante `DTE_TIPO.FACTURA_NORMAL` ya está definida en el archivo de configuración. | `src/server/simplefactura.ts` (modificar el payload para DTE 33), `src/lib/types.ts` (posiblemente modificar `totalNeto`), UI de Administración. |
| **Mejora en Gestión de Credenciales**  | Las credenciales de SimpleFactura (API Key) deben ser gestionadas como secretos del entorno de producción (`process.env.SIMPLEFACTURA_API_KEY`) y nunca hardcodeadas.      | `src/server/simplefactura.ts`                                                                                                                  |
| **Mejora UX Descarga PDF**           | Asegurar que la función `downloadPDF` en el frontend (`AdminFacturacionConsolidada.tsx` y `AdminCotizaciones.tsx`) utiliza un nombre de archivo claro: `FACTURA_DTE[Tipo]_[Folio]_[RUT].pdf`. | `src/components/admin/AdminFacturacionConsolidada.tsx`, `src/components/admin/AdminCotizaciones.tsx`                                           |

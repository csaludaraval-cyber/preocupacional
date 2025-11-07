/**
 * Configuración centralizada para la integración con la API de SimpleFactura.
 * Esto desacopla las credenciales y los tipos de DTE de la lógica de negocio.
 */

// URL Base de la API de SimpleFactura (asumiendo que se mantiene constante)
export const SIMPLEFACTURA_API_BASE_URL = 'https://api.simplefactura.cl/v1';

// Datos del Emisor (ARAVAL FISIOTERAPIA Y CARAVAL MEDICINA SPA)
// Obtenidos de la revisión de los PDFs de muestra.
export const RUT_EMISOR = '77.102.661-3';
export const RAZON_SOCIAL_EMISOR = 'ARAVAL FISIOTERAPIA Y CARAVAL MEDICINA SPA';
export const GIRO_EMISOR = 'SERVICIO MEDICO REHABILITACION KINESICA EJERCICIO FISICO Y CENTRO DE SALUD VENTA OTR';
export const DIR_ORIGEN = 'Juan Martinez 235';
export const CMNA_ORIGEN = 'Taltal';

// Definición de Tipos de Documentos Tributarios Electrónicos (DTE)
export const DTE_TIPO = {
    FACTURA_EXENTA: 34, // Factura No Afecta o Exenta (Usado actualmente)
    FACTURA_NORMAL: 33, // Factura Afecta a IVA (Para futura implementación)
    BOLETA_ELECTRONICA: 39, // Ejemplo de otro tipo DTE
};

// Parámetros de configuración general
export const DTE_AMBIENTE = 0; // 0 = Producción, 1 = Certificación
export const DTE_FORMA_PAGO = 1; // 1 = Contado (Defecto para este proyecto)

// NOTA: La API Key real debe seguir cargándose desde el entorno
// (e.g., process.env.SIMPLEFACTURA_API_KEY) o ser inyectada en la Server Action.

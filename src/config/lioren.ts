/**
 * Configuración centralizada para la integración con la API de Lioren.
 */

// URL Base de la API de Lioren
export const LIOREN_API_BASE_URL = 'https://www.lioren.cl/api';

// Definición de Tipos de Documentos Tributarios Electrónicos (DTE)
export const DTE_TIPO = {
    FACTURA_EXENTA: 34, // Factura No Afecta o Exenta
    FACTURA_AFECTA: 33, // Factura Afecta a IVA
};

// NOTA: El API Token real debe cargarse desde el entorno (process.env.LIOREN_API_KEY).

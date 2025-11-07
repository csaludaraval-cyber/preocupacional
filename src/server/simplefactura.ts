
'use server';

import { firestore } from '@/lib/firebase';
import type { CotizacionFirestore, Empresa } from '@/lib/types';
import { doc, writeBatch } from 'firebase/firestore';
import { 
    SIMPLEFACTURA_API_BASE_URL, 
    DTE_TIPO
} from '@/config/simplefactura';

const API_KEY = process.env.SIMPLEFACTURA_API_KEY;

interface SimpleFacturaResponse {
    success: boolean;
    message?: string;
    folio?: number;
    pdf?: string; // Base64
}

interface CreateInvoicePayload {
    invoice: {
        TipoDTE: number;
        RutReceptor: string;
        RznSocReceptor: string;
        GiroReceptor: string;
        DirReceptor: string;
        CmnaReceptor: string;
        CiudadReceptor: string;
        Detalles: {
            NmbItem: string;
            QtyItem: number;
            PrcItem: number;
        }[];
        MntExento: number;
    };
}


/**
 * Server Action para crear una factura en SimpleFactura y actualizar Firestore.
 * Funciona tanto para facturación consolidada (múltiples órdenes) como inmediata (una sola orden).
 * @param empresa La información de la empresa cliente.
 * @param quotes Las cotizaciones (órdenes) a facturar.
 * @param totalAmount El monto total a facturar.
 * @returns Un objeto con el PDF en base64 y el folio, o un error.
 */
export async function createSimpleFacturaInvoice(
    empresa: Empresa,
    quotes: CotizacionFirestore[],
    totalAmount: number
): Promise<{ pdfBase64: string; folio: number }> {
    if (!API_KEY) {
        throw new Error('La API Key de SimpleFactura no está configurada en las variables de entorno.');
    }

    const isImmediateBilling = quotes.length === 1;
    const detailDescription = isImmediateBilling 
        ? `Servicios de exámenes preocupacionales (Cotización N° ${quotes[0].id.slice(-6)})`
        : `Servicios de exámenes preocupacionales consolidados (${quotes.length} órdenes)`;


    // --- PASO 1: Crear el Payload para la API de SimpleFactura ---
    const payload: CreateInvoicePayload = {
        invoice: {
            TipoDTE: DTE_TIPO.FACTURA_EXENTA,
            RutReceptor: empresa.rut,
            RznSocReceptor: empresa.razonSocial,
            GiroReceptor: empresa.giro,
            DirReceptor: empresa.direccion,
            CmnaReceptor: empresa.comuna,
            CiudadReceptor: empresa.ciudad,
            Detalles: [
                {
                    NmbItem: detailDescription,
                    QtyItem: 1,
                    PrcItem: totalAmount,
                },
            ],
            MntExento: totalAmount,
        },
    };

    // --- PASO 2: Emitir el DTE en SimpleFactura ---
    const emissionResponse = await fetch(`${SIMPLEFACTURA_API_BASE_URL}/issue.aspx`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
        },
        body: JSON.stringify(payload),
    });

    if (!emissionResponse.ok) {
        const errorBody = await emissionResponse.text();
        throw new Error(`Error al emitir DTE: ${emissionResponse.status} - ${errorBody}`);
    }

    const emissionResult: SimpleFacturaResponse = await emissionResponse.json();

    if (!emissionResult.success || !emissionResult.folio) {
        throw new Error(`La API de SimpleFactura no pudo emitir la factura: ${emissionResult.message || 'Error desconocido'}`);
    }

    const folio = emissionResult.folio;

    // --- PASO 3: Obtener el PDF del DTE emitido ---
    const pdfResponse = await fetch(`${SIMPLEFACTURA_API_BASE_URL}/getpdf.aspx`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
            getpdf: {
                TipoDTE: DTE_TIPO.FACTURA_EXENTA,
                Folio: folio,
                RutReceptor: empresa.rut,
                Formato: 'rollo',
            },
        }),
    });
    
    if (!pdfResponse.ok) {
        throw new Error(`Error al obtener el PDF: ${pdfResponse.status}`);
    }

    const pdfResult: SimpleFacturaResponse = await pdfResponse.json();

    if (!pdfResult.success || !pdfResult.pdf) {
        throw new Error(`La API de SimpleFactura no pudo generar el PDF: ${pdfResult.message || 'Error desconocido'}`);
    }
    
    // --- PASO 4: Actualizar las órdenes en Firestore ---
    const batch = writeBatch(firestore);
    quotes.forEach(quote => {
        const quoteRef = doc(firestore, 'cotizaciones', quote.id);
        batch.update(quoteRef, {
            status: 'facturado_simplefactura',
            simpleFacturaInvoiceId: folio.toString(),
        });
    });

    try {
        await batch.commit();
    } catch (dbError: any) {
        // En un escenario real, aquí se debería manejar la compensación
        // (por ejemplo, intentar anular la factura emitida si la actualización de DB falla).
        console.error('CRÍTICO: La factura se emitió pero falló la actualización en Firestore.', dbError);
        throw new Error(`Factura emitida (Folio ${folio}) pero no se pudo actualizar la base de datos. Contacte a soporte.`);
    }

    // --- PASO 5: Retornar el PDF y el Folio al cliente ---
    return {
        pdfBase64: pdfResult.pdf,
        folio: folio,
    };
}


'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { Cotizacion, Empresa } from '@/lib/types';
import { LIOREN_API_BASE_URL, DTE_TIPO } from '@/config/lioren';

// --- INICIALIZACIÓN DE FIREBASE ADMIN (SOLO PARA SERVIDOR) ---
let serviceAccount;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }
} catch (e) {
    console.error("Error al parsear FIREBASE_SERVICE_ACCOUNT:", e);
}

if (!getApps().length) {
    initializeApp(serviceAccount ? { credential: cert(serviceAccount) } : undefined);
}
const firestore = getFirestore();
// --- FIN DE LA INICIALIZACIÓN ---


const API_TOKEN = process.env.LIOREN_API_KEY;

interface LiorenResponse {
    folio: number;
    links: {
        pdf: string;
        xml: string;
    };
    message?: string;
}

interface LiorenErrorResponse {
    message: string;
    attribute?: string;
    code?: number;
}


/**
 * Server Action para crear una factura en Lioren y actualizar Firestore.
 * @param empresa La información de la empresa cliente.
 * @param quotes Las cotizaciones (órdenes) a facturar.
 * @param totalAmount El monto total a facturar.
 * @returns Un objeto con el link al PDF y el folio, o un error.
 */
export async function createLiorenInvoice(
    empresa: Empresa,
    quotes: Cotizacion[], // <--- CORRECCIÓN: Se acepta el objeto Cotizacion completo.
    totalAmount: number
): Promise<{ pdfUrl: string; folio: number }> {
    if (!API_TOKEN) {
        throw new Error('La API Key de Lioren (LIOREN_API_KEY) no está configurada en las variables de entorno.');
    }

    const isImmediateBilling = quotes.length === 1;
    const detailDescription = isImmediateBilling 
        ? `Servicios de exámenes preocupacionales (Cotización N° ${quotes[0].id.slice(-6)})`
        : `Servicios de exámenes preocupacionales consolidados (${quotes.length} órdenes)`;
    
    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

    // --- PASO 1: Crear el Payload para la API de Lioren ---
    const payload = {
        fechaEmision: today,
        fechaVencimiento: today,
        tipo: DTE_TIPO.FACTURA_EXENTA,
        receptor: {
            rut: empresa.rut,
            razonSocial: empresa.razonSocial,
            giro: empresa.giro,
            direccion: empresa.direccion,
            comuna: empresa.comuna,
        },
        items: [
            {
                nombre: detailDescription,
                cantidad: 1,
                precio: totalAmount,
                exento: true, // Marcar ítem como exento
            },
        ],
        totales: {
            montoExento: totalAmount,
        },
    };

    // --- PASO 2: Emitir el DTE en Lioren ---
    const emissionResponse = await fetch(`${LIOREN_API_BASE_URL}/dtes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(payload),
    });

    if (!emissionResponse.ok) {
        const errorBody: LiorenErrorResponse = await emissionResponse.json();
        console.error("Error Body de Lioren:", errorBody);
        throw new Error(`Error al emitir DTE [${emissionResponse.status}]: ${errorBody.message || 'Error desconocido de Lioren.'}`);
    }

    const emissionResult: LiorenResponse = await emissionResponse.json();
    const { folio, links } = emissionResult;

    if (!folio || !links?.pdf) {
        throw new Error(`La API de Lioren no devolvió el folio o el link del PDF: ${emissionResult.message || 'Respuesta inesperada.'}`);
    }

    // --- PASO 3: Actualizar las órdenes en Firestore ---
    const batch = firestore.batch();
    quotes.forEach(quote => {
        const quoteRef = firestore.collection('cotizaciones').doc(quote.id);
        batch.update(quoteRef, {
            status: 'facturado_simplefactura', 
            simpleFacturaInvoiceId: folio.toString(), 
        });
    });

    try {
        await batch.commit();
    } catch (dbError: any) {
        console.error('CRÍTICO: La factura se emitió pero falló la actualización en Firestore.', dbError);
        throw new Error(`Factura emitida (Folio ${folio}) pero no se pudo actualizar la base de datos. Contacte a soporte.`);
    }

    // --- PASO 4: Retornar el link del PDF y el folio al cliente ---
    return {
        pdfUrl: links.pdf,
        folio: folio,
    };
}

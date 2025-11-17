'use server';

import { doc, getDoc, getDocs, collection, query, where, writeBatch } from 'firebase-admin/firestore';
import { db } from '@/lib/firestore-admin';
import { createDTE } from '@/server/lioren';
import { cleanRut } from '@/lib/utils';
import type { CotizacionFirestore, Empresa } from '@/lib/types';
import { LIOREN_CONFIG } from '@/server/config';

// Tipos de DTE según Lioren
const DTE_TIPO = {
    FACTURA_EXENTA: 34,
    FACTURA_NORMAL: 33,
};

/**
 * Emite un DTE consolidado para un cliente frecuente.
 * Agrupa todas las cotizaciones en estado 'orden_examen_enviada' para un RUT de cliente.
 * @param rutCliente - El RUT limpio del cliente a facturar.
 * @returns Un objeto con el resultado de la operación.
 */
export async function emitirDTEConsolidado(rutCliente: string): Promise<{ success: boolean; folio?: number; error?: string }> {
    if (!rutCliente) {
        return { success: false, error: 'RUT del cliente no proporcionado.' };
    }
    
    if (!LIOREN_CONFIG.emisorRut) {
        return { success: false, error: 'El RUT del emisor no está configurado en las variables de entorno (EMISOR_RUT).' };
    }

    try {
        const q = query(
            collection(db, 'cotizaciones'),
            where('empresaId', '==', rutCliente),
            where('status', '==', 'orden_examen_enviada')
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: 'No hay órdenes de examen pendientes para facturar para este cliente.' };
        }

        const cotizaciones = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CotizacionFirestore));
        const primeraCotizacion = cotizaciones[0];
        const empresaData = primeraCotizacion.empresaData;
        const totalNeto = cotizaciones.reduce((acc, curr) => acc + curr.total, 0);

        // Prepara los detalles para el DTE
        const detalles = cotizaciones.flatMap(c =>
            c.solicitudesData.flatMap(s => s.examenes.map(e => ({
                nombre: e.nombre,
                cantidad: 1,
                precio: e.valor,
            })))
        );

        const dteData = {
            tipo: DTE_TIPO.FACTURA_EXENTA,
            emisor: { rut: cleanRut(LIOREN_CONFIG.emisorRut) },
            receptor: {
                rut: cleanRut(empresaData.rut),
                razonSocial: empresaData.razonSocial,
                giro: empresaData.giro,
                direccion: empresaData.direccion,
                comuna: empresaData.comuna,
                ciudad: empresaData.ciudad,
            },
            detalles: detalles,
            montos: {
                neto: totalNeto,
                exento: totalNeto,
                iva: 0,
                total: totalNeto,
            },
            referencias: cotizaciones.map(c => ({
                tipo: 801, // Orden de Compra
                folio: c.id.slice(-10), // Folio de referencia (ID de cotización)
                fecha: c.fechaCreacion.toDate().toISOString().split('T')[0],
            })),
        };

        const response = await createDTE(dteData);
        if (!response || !response.folio) {
            throw new Error('La API de Lioren no devolvió un folio.');
        }

        // Actualizar el estado de todas las cotizaciones en un batch
        const batch = db.batch();
        const fechaEmision = new Date().toISOString();
        
        cotizaciones.forEach(cotizacion => {
            const docRef = doc(db, 'cotizaciones', cotizacion.id);
            batch.update(docRef, { 
                status: 'facturado_lioren',
                liorenFolio: response.folio.toString(),
                liorenId: response.id,
                liorenFechaEmision: fechaEmision,
                liorenPdfUrl: response.uri,
            });
        });

        await batch.commit();

        return { success: true, folio: response.folio };

    } catch (error: any) {
        console.error('Error al emitir DTE consolidado:', error);
        return { success: false, error: error.message };
    }
}


/**
 * Emite un DTE inmediato para una cotización única.
 * @param cotizacionId - El ID de la cotización a facturar.
 * @returns Un objeto con el resultado de la operación.
 */
export async function emitirDTEInmediato(cotizacionId: string): Promise<{ success: boolean; folio?: number; error?: string }> {
     if (!cotizacionId) {
        return { success: false, error: 'ID de cotización no proporcionado.' };
    }
    
    if (!LIOREN_CONFIG.emisorRut) {
        return { success: false, error: 'El RUT del emisor no está configurado en las variables de entorno (EMISOR_RUT).' };
    }

    try {
        const cotizacionRef = doc(db, 'cotizaciones', cotizacionId);
        const cotizacionSnap = await getDoc(cotizacionRef);

        if (!cotizacionSnap.exists()) {
             return { success: false, error: 'La cotización no existe.' };
        }

        const cotizacion = cotizacionSnap.data() as CotizacionFirestore;

        // CORRECCIÓN: Permitir ambos estados 'ACEPTADA' y 'cotizacion_aceptada'
        if (cotizacion.status !== 'cotizacion_aceptada' && cotizacion.status !== 'ACEPTADA') {
            return { success: false, error: `La cotización no está en un estado aceptado para facturar, sino '${cotizacion.status}'.` };
        }
        
        const empresaData = cotizacion.empresaData;
        const totalNeto = cotizacion.total;

        // Prepara los detalles para el DTE
        const detalles = cotizacion.solicitudesData.flatMap(s => s.examenes.map(e => ({
            nombre: e.nombre,
            cantidad: 1,
            precio: e.valor,
        })));

         const dteData = {
            tipo: DTE_TIPO.FACTURA_EXENTA,
            emisor: { rut: cleanRut(LIOREN_CONFIG.emisorRut) },
            receptor: {
                rut: cleanRut(empresaData.rut),
                razonSocial: empresaData.razonSocial,
                giro: empresaData.giro,
                direccion: empresaData.direccion,
                comuna: empresaData.comuna,
                ciudad: empresaData.ciudad,
            },
            detalles: detalles,
            montos: {
                neto: totalNeto,
                exento: totalNeto,
                iva: 0,
                total: totalNeto,
            },
        };

        const response = await createDTE(dteData);
        if (!response || !response.folio) {
            throw new Error('La API de Lioren no devolvió un folio.');
        }

        // Actualizar el estado de la cotización
        await cotizacionRef.update({
            status: 'facturado_lioren',
            liorenFolio: response.folio.toString(),
            liorenId: response.id,
            liorenFechaEmision: new Date().toISOString(),
            liorenPdfUrl: response.uri,
        });

        return { success: true, folio: response.folio };

    } catch (error: any) {
        console.error(`Error al emitir DTE para cotización ${cotizacionId}:`, error);
        return { success: false, error: error.message };
    }
}

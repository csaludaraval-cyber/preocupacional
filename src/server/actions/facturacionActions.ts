'use server';

import { getDb } from '@/lib/firestore-admin';
import { createDTE, whoami } from '@/server/lioren';
import { cleanRut } from '@/lib/utils';
import type { CotizacionFirestore } from '@/lib/types';


/**
 * Emite un Documento Tributario Electrónico (DTE) para una cotización específica.
 * Esta acción es para la facturación inmediata de un cliente normal.
 */
export async function emitirDTEInmediato(cotizacionId: string): Promise<{ success: boolean; folio?: number; error?: string; }> {
    const db = getDb();
    const cotizacionRef = db.collection('cotizaciones').doc(cotizacionId);

    try {
        const docSnap = await cotizacionRef.get();
        if (!docSnap.exists) {
            throw new Error('La cotización no fue encontrada en la base de datos.');
        }

        const cotizacion = docSnap.data() as CotizacionFirestore;
        const empresa = cotizacion.empresaData;
        const totalNeto = Math.round(cotizacion.total || 0);

        // --- VALIDACIONES CRÍTICAS ---
        if (!empresa?.giro) return { success: false, error: 'El Giro de la empresa es obligatorio para el SII.' };
        if (!empresa?.comuna) return { success: false, error: 'La Comuna de la empresa es obligatoria para el SII.' };
        if (!empresa?.rut) return { success: false, error: 'El RUT de la empresa es obligatorio.' };
        
        const detalles = (cotizacion.solicitudesData || []).flatMap(solicitud => 
            solicitud.examenes.map(examen => ({
                nombre: `${examen.nombre.substring(0, 40)} - ${solicitud.trabajador.nombre.substring(0, 30)}`,
                cantidad: 1,
                precio: Math.round(examen.valor),
                exento: true,
            }))
        );

        const payload = {
            tipodoc: "34", // Factura No Afecta o Exenta
            receptor: {
                rut: cleanRut(empresa.rut),
                rs: empresa.razonSocial,
                giro: empresa.giro,
                comuna: empresa.comuna,
                ciudad: empresa.ciudad || empresa.comuna,
                dir: empresa.direccion,
                email: empresa.email,
            },
            detalles,
            montos: {
                neto: 0,
                exento: totalNeto,
                iva: 0,
                total: totalNeto,
            },
        };

        const liorenResponse = await createDTE(payload);

        // --- ACTUALIZACIÓN EN FIRESTORE ---
        await cotizacionRef.update({
            status: 'FACTURADO',
            liorenFolio: liorenResponse.folio,
            liorenId: liorenResponse.id,
            liorenPdfUrl: liorenResponse.url_pdf_cedible || liorenResponse.url_pdf,
            liorenFechaEmision: new Date().toISOString(),
        });
        
        return { success: true, folio: liorenResponse.folio };

    } catch (error: any) {
        const detailedError = error.response?.data?.message || error.message;
        console.error('DETALLE LIOREN:', detailedError);
        return { success: false, error: `Error Lioren: ${detailedError}` };
    }
}


/**
 * Emite un DTE consolidado para todas las órdenes pendientes de un cliente frecuente.
 */
export async function emitirDTEConsolidado(rutCliente: string): Promise<{ success: boolean, folio?: number, error?: string }> {
  const db = getDb();
  const cotizacionesRef = db.collection('cotizaciones');

  try {
    const q = cotizacionesRef
      .where('empresaData.rut', '==', rutCliente)
      .where('status', '==', 'orden_examen_enviada');

    const snapshot = await q.get();

    if (snapshot.empty) {
      throw new Error('No hay órdenes pendientes para este cliente.');
    }

    let empresaData: any = null;
    let totalAcumulado = 0;
    const detallesConsolidados: any[] = [];
    const cotizacionesIds: string[] = [];

    snapshot.forEach(doc => {
      const cotizacion = doc.data() as CotizacionFirestore;
      if (!empresaData) {
        empresaData = cotizacion.empresaData;
      }
      totalAcumulado += Math.round(cotizacion.total || 0);
      
      const detalles = (cotizacion.solicitudesData || []).flatMap(solicitud => 
            solicitud.examenes.map(examen => ({
                nombre: `${examen.nombre.substring(0, 40)} - ${solicitud.trabajador.nombre.substring(0, 30)}`,
                cantidad: 1,
                precio: Math.round(examen.valor),
                exento: true,
            }))
        );
      detallesConsolidados.push(...detalles);
      cotizacionesIds.push(doc.id);
    });

    if (!empresaData?.giro) throw new Error('El Giro del cliente es obligatorio para el SII.');
    
    const payload = {
        tipodoc: "34", // Factura Exenta
        receptor: {
            rut: cleanRut(empresaData.rut),
            rs: empresaData.razonSocial,
            giro: empresaData.giro,
            comuna: empresaData.comuna,
            ciudad: empresaData.ciudad || empresaData.comuna,
            dir: empresaData.direccion,
            email: empresaData.email,
        },
        detalles: detallesConsolidados,
        montos: {
            neto: 0,
            exento: totalAcumulado,
            iva: 0,
            total: totalAcumulado,
        },
    };

    const liorenResponse = await createDTE(payload);

    // Actualizar todas las cotizaciones a 'facturado_lioren'
    const batch = db.batch();
    cotizacionesIds.forEach(id => {
      const docRef = cotizacionesRef.doc(id);
      batch.update(docRef, { 
          status: 'facturado_lioren',
          liorenFolio: liorenResponse.folio,
          liorenId: liorenResponse.id,
          liorenPdfUrl: liorenResponse.url_pdf_cedible || liorenResponse.url_pdf,
          liorenFechaEmision: new Date().toISOString(),
      });
    });
    await batch.commit();

    return { success: true, folio: liorenResponse.folio };
    
  } catch (error: any) {
    const detailedError = error.response?.data?.message || error.message;
    console.error('ERROR CONSOLIDADO LIOREN:', detailedError);
    return { success: false, error: `Error Lioren: ${detailedError}` };
  }
}

/**
 * Acción de servidor para probar la conexión con la API de Lioren y verificar el token.
 */
export async function probarConexionLioren(): Promise<{ success: boolean; data?: any; error?: string; }> {
  try {
    const companyInfo = await whoami();
    return { 
        success: true, 
        data: {
            razonSocial: companyInfo.razon_social,
            rut: companyInfo.rut
        }
    };
  } catch (error: any) {
    console.error("Error en probarConexionLioren:", error.message);
    return { success: false, error: error.message };
  }
}

export async function ejecutarFacturacionSiiV2(cotizacionId: string): Promise<{ success: boolean; folio?: number; error?: string; }> {
    const db = getDb();
    const cotizacionRef = db.collection('cotizaciones').doc(cotizacionId);

    // PASO 1: LECTURA DEL DOCUMENTO
    let cotizacion: CotizacionFirestore;
    try {
        const docSnap = await cotizacionRef.get();
        if (!docSnap.exists) {
            return { success: false, error: 'ERROR EN [PASO 1]: La cotización no existe.' };
        }
        cotizacion = docSnap.data() as CotizacionFirestore;
    } catch (e: any) {
        return { success: false, error: `ERROR EN [PASO 1]: ${e.message}` };
    }

    // PASO 2: VALIDACIONES PREVIAS
    const empresa = cotizacion.empresaData;
    if (!empresa?.giro || !empresa.comuna || !empresa.rut) {
        return { success: false, error: 'ERROR EN [PASO 2]: Datos de la empresa (RUT, Giro, Comuna) son obligatorios.' };
    }
    const totalNeto = Math.round(cotizacion.total || 0);

    // PASO 3: CONSTRUCCIÓN DE PAYLOAD
    let payload;
    try {
        const detalles = (cotizacion.solicitudesData || []).flatMap(solicitud =>
            solicitud.examenes.map(examen => ({
                nombre: `${examen.nombre.substring(0, 40)} - ${solicitud.trabajador.nombre.substring(0, 30)}`,
                cantidad: 1,
                precio: Math.round(examen.valor),
                exento: true,
            }))
        );

        payload = {
            tipodoc: "34", // Factura Exenta
            receptor: {
                rut: cleanRut(empresa.rut),
                rs: empresa.razonSocial,
                giro: empresa.giro,
                comuna: empresa.comuna,
                ciudad: empresa.ciudad || empresa.comuna,
                dir: empresa.direccion,
                email: empresa.email,
            },
            detalles,
            montos: {
                neto: 0,
                exento: totalNeto,
                iva: 0,
                total: totalNeto,
            },
        };
    } catch (e: any) {
        return { success: false, error: `ERROR EN [PASO 3]: Fallo al construir los detalles. ${e.message}` };
    }
    
    // PASO 4: LLAMADA A LIOREN
    let liorenResponse;
    try {
        liorenResponse = await createDTE(payload);
        if (!liorenResponse || !liorenResponse.folio) {
             throw new Error('La respuesta de Lioren no contiene el folio de la factura.');
        }
    } catch (error: any) {
        const detailedError = error.response?.data?.message || error.message;
        console.error('DETALLE LIOREN:', detailedError);
        return { success: false, error: `ERROR EN [PASO 4]: ${detailedError}` };
    }

    // PASO 5: ACTUALIZACIÓN EN FIRESTORE
    try {
        await cotizacionRef.update({
            status: 'FACTURADO',
            liorenFolio: liorenResponse.folio,
            liorenId: liorenResponse.id,
            liorenPdfUrl: liorenResponse.url_pdf_cedible || liorenResponse.url_pdf,
            liorenFechaEmision: new Date().toISOString(),
        });
    } catch (e: any) {
        return { success: false, error: `ERROR EN [PASO 5]: Fallo al actualizar la cotización. ${e.message}` };
    }
    
    return { success: true, folio: liorenResponse.folio };
}

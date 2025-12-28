
'use server';

import { db } from '@/lib/firestore-admin';
import { createDTE } from '@/server/lioren';
import { LIOREN_CONFIG } from '@/server/config';
import type { CotizacionFirestore, Empresa } from '@/lib/types';

// Limpieza de RUT para cumplir estándar Lioren
const cleanRut = (rut: string | undefined): string => {
  if (!rut) return '';
  // Elimina puntos y asegura el guion antes del dígito verificador
  const cleaned = rut.replace(/\./g, '').toUpperCase();
  if (cleaned.includes('-')) {
    return cleaned;
  }
  const index = cleaned.length - 1;
  return cleaned.slice(0, index) + '-' + cleaned.charAt(index);
};


// --- ACCIÓN PARA FACTURACIÓN INMEDIATA (DTE 34) ---
export async function emitirDTEInmediato(cotizacionId: string) {
  try {
    const cotRef = db.collection('cotizaciones').doc(cotizacionId);
    const snap = await cotRef.get();

    if (!snap.exists) throw new Error('Cotización no encontrada en la base de datos.');
    const data = snap.data() as CotizacionFirestore;

    // 1. VALIDACIONES PRE-VUELO (SII)
    const empresa = data.empresaData;
    if (!empresa?.giro) throw new Error('El GIRO de la empresa es obligatorio para el SII.');
    if (!empresa?.comuna) throw new Error('La COMUNA es obligatoria para el SII.');
    if (!empresa?.rut) throw new Error('El RUT del receptor es obligatorio.');

    // 2. PREPARAR DETALLES (Aplanamiento de exámenes y blindaje de strings)
    const detalles = (data.solicitudesData || []).flatMap((sol) => 
      (sol.examenes || []).map((ex) => ({
        nombre: `${String(ex.nombre).substring(0, 40)} - ${String(sol.trabajador.nombre).substring(0, 30)}`,
        cantidad: 1,
        precio: Math.round(Number(ex.valor)), // Aseguramos que sea un número entero
        exento: true 
      }))
    );

    if (detalles.length === 0) {
        throw new Error('La cotización no contiene exámenes para facturar.');
    }

    const montoTotal = Math.round(Number(data.total));

    // 3. PAYLOAD QUIRÚRGICO PARA DTE 34 (EXENTO)
    const payload = {
      tipodoc: "34", // Factura Exenta
      receptor: {
        rut: cleanRut(empresa.rut),
        rs: String(empresa.razonSocial).substring(0, 100),
        giro: String(empresa.giro).substring(0, 80),
        comuna: empresa.comuna,
        ciudad: empresa.ciudad || empresa.comuna, // Usamos Comuna como fallback si Ciudad falta
        dir: empresa.direccion || 'Sin dirección',
        email: empresa.email
      },
      detalles: detalles,
      montos: {
        neto: 0, // CRÍTICO: En DTE 34 el neto DEBE ser 0
        exento: montoTotal,
        iva: 0,
        total: montoTotal
      },
      expect_all: true
    };

    // 4. LLAMADA A LIOREN
    const result = await createDTE(payload);

    // 5. ACTUALIZAR FIRESTORE CON ÉXITO
    await cotRef.update({
      status: 'FACTURADO',
      liorenFolio: result.folio.toString(),
      liorenPdfUrl: result.url_pdf_cedible,
      liorenFechaEmision: new Date().toISOString()
    });

    return { success: true, folio: result.folio };

  } catch (error: any) {
    // Este es el error que llegará al toast en la pantalla
    const errorMessage = error.message || 'Error desconocido en la facturación.';
    console.error('ERROR en emitirDTEInmediato:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// --- ACCIÓN PARA FACTURACIÓN CONSOLIDADA (DTE 34) ---
export async function emitirDTEConsolidado(rutCliente: string) {
    try {
        const cleanedRut = cleanRut(rutCliente);
        
        // Obtenemos todas las órdenes pendientes para este RUT
        const q = db.collection('cotizaciones')
            .where('empresaId', '==', cleanedRut)
            .where('status', '==', 'orden_examen_enviada');
        
        const snapshot = await q.get();
        if (snapshot.empty) throw new Error('No hay órdenes pendientes para este cliente.');

        const quotesToBill = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CotizacionFirestore));
        
        const primeraCotizacion = quotesToBill[0];
        const empresa = primeraCotizacion.empresaData;

        // 1. VALIDACIONES (igual que en DTE inmediato)
        if (!empresa?.giro) throw new Error('El GIRO de la empresa es obligatorio para el SII.');
        if (!empresa?.comuna) throw new Error('La COMUNA es obligatoria para el SII.');

        // 2. CONSOLIDAR DETALLES Y TOTALES
        let detallesConsolidados: any[] = [];
        let montoTotalConsolidado = 0;
        
        quotesToBill.forEach(quote => {
            montoTotalConsolidado += Math.round(Number(quote.total));
            const detallesQuote = (quote.solicitudesData || []).flatMap((sol) =>
                (sol.examenes || []).map((ex) => ({
                    nombre: `${String(ex.nombre).substring(0, 35)} - ID ${quote.id.slice(-4)}`,
                    cantidad: 1,
                    precio: Math.round(Number(ex.valor)),
                    exento: true,
                }))
            );
            detallesConsolidados.push(...detallesQuote);
        });

        // 3. PAYLOAD PARA DTE 34 CONSOLIDADO
        const payload = {
            tipodoc: "34",
            receptor: {
                rut: cleanedRut,
                rs: String(empresa.razonSocial).substring(0, 100),
                giro: String(empresa.giro).substring(0, 80),
                comuna: empresa.comuna,
                ciudad: empresa.ciudad || empresa.comuna,
                dir: empresa.direccion || 'Sin dirección',
                email: empresa.email
            },
            detalles: detallesConsolidados,
            montos: {
                neto: 0,
                exento: montoTotalConsolidado,
                iva: 0,
                total: montoTotalConsolidado
            },
            expect_all: true
        };
        
        // 4. LLAMADA A LIOREN
        const result = await createDTE(payload);

        // 5. ACTUALIZAR TODAS LAS COTIZACIONES INVOLUCRADAS
        const batch = db.batch();
        const updateData = {
            status: 'facturado_lioren', // Estado legado para compatibilidad
            liorenFolio: result.folio.toString(),
            liorenPdfUrl: result.url_pdf_cedible,
            liorenFechaEmision: new Date().toISOString()
        };

        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, updateData);
        });
        await batch.commit();

        return { success: true, folio: result.folio };

    } catch (error: any) {
        const errorMessage = error.message || 'Error desconocido en facturación consolidada.';
        console.error('ERROR en emitirDTEConsolidado:', errorMessage);
        return { success: false, error: errorMessage };
    }
}

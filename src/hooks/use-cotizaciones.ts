
"use client";

import { useState, useCallback, useMemo } from 'react';
import { collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import type { CotizacionFirestore, Cotizacion, Empresa, Solicitante, SolicitudTrabajador } from '@/lib/types';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';


interface UseCotizacionesResult {
  quotes: Cotizacion[];
  isLoading: boolean;
  error: Error | null;
  refetchQuotes: () => void;
}

export function useCotizaciones(): UseCotizacionesResult {
  const cotizacionesQuery = useMemoFirebase(() => 
    query(
      collection(firestore, 'cotizaciones'), 
      orderBy('fechaCreacion', 'desc')
    ),
    []
  );

  const { data: rawQuotes, isLoading, error: firestoreError, refetch: refetchQuotes } = useCollection<CotizacionFirestore>(cotizacionesQuery);
  
  const quotes = useMemo(() => {
    if (!rawQuotes) return [];

    const filtered = rawQuotes.filter(q => q.status !== 'facturado_consolidado');

    const processed = filtered.map(q => {
        const fecha = q.fechaCreacion instanceof Timestamp 
            ? q.fechaCreacion.toDate().toLocaleDateString('es-CL')
            : new Date().toLocaleDateString('es-CL');

        // Aseguramos que los datos denormalizados existan
        const empresaData: Empresa = q.empresaData || { razonSocial: '', rut: '', direccion: '', giro: '', ciudad: '', comuna: '', region: '', email: '' };
        const solicitanteData: Solicitante = q.solicitanteData || { nombre: '', rut: '', cargo: '', centroDeCostos: '', mail: '' };
        const solicitudesData: SolicitudTrabajador[] = q.solicitudesData || [];
        
        // CORRECCIÓN: Se elimina la lógica defectuosa y se asegura que modalidadFacturacion se pase directamente.
        // Si q.empresaData existe, sus propiedades (incluida modalidadFacturacion) ya están en empresaData.

        return {
            id: q.id,
            empresa: empresaData, // Obsoleto pero se mantiene por retrocompatibilidad
            solicitante: solicitanteData, // Obsoleto pero se mantiene
            solicitudes: solicitudesData, // Obsoleto pero se mantiene
            total: q.total,
            fecha,
            fechaCreacion: q.fechaCreacion,
            status: q.status || 'PENDIENTE',
            // Datos denormalizados que realmente se usan
            empresaData: empresaData,
            solicitanteData: solicitanteData,
            solicitudesData: solicitudesData,
            simpleFacturaInvoiceId: q.simpleFacturaInvoiceId,
        } as Cotizacion;
    });

    return processed.sort((a, b) => {
        if (a.status < b.status) return -1;
        if (a.status > b.status) return 1;
        return 0;
    });
  }, [rawQuotes]);


  return { quotes, isLoading, error: firestoreError, refetchQuotes };
}


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

const toPlainObject = (timestamp: Timestamp) => {
    return {
        seconds: timestamp.seconds,
        nanoseconds: timestamp.nanoseconds,
    };
};

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
        // KEEP the original Timestamp object if it exists, otherwise use the serialized one.
        const fechaCreacionSerializable = q.fechaCreacion;

        const fecha = q.fechaCreacion instanceof Timestamp 
            ? q.fechaCreacion.toDate().toLocaleDateString('es-CL')
            : new Date().toLocaleDateString('es-CL');

        // Aseguramos que los datos denormalizados existan
        const empresaData: Empresa = q.empresaData || { razonSocial: '', rut: '', direccion: '', giro: '', ciudad: '', comuna: '', region: '', email: '' };
        const solicitanteData: Solicitante = q.solicitanteData || { nombre: '', rut: '', cargo: '', centroDeCostos: '', mail: '' };
        const solicitudesData: SolicitudTrabajador[] = q.solicitudesData || [];
        

        return {
            id: q.id,
            empresa: empresaData, 
            solicitante: solicitanteData, 
            solicitudes: solicitudesData, 
            total: q.total,
            fecha,
            fechaCreacion: fechaCreacionSerializable as unknown as { seconds: number; nanoseconds: number; }, // Assert type
            status: q.status || 'PENDIENTE',
            // Datos denormalizados que realmente se usan
            empresaData: empresaData,
            solicitanteData: solicitanteData,
            solicitudesData: solicitudesData,
            simpleFacturaInvoiceId: q.simpleFacturaInvoiceId,
        } as Cotizacion;
    });

    // The sorting logic now will be correct because we have a consistent object structure.
    // The previous error happened because useMemo was sorting an array with mixed types.
    return processed.sort((a, b) => {
        const dateA = a.fechaCreacion?.seconds || 0;
        const dateB = b.fechaCreacion?.seconds || 0;
        return dateB - dateA;
    });

  }, [rawQuotes]);


  return { quotes, isLoading, error: firestoreError, refetchQuotes };
}

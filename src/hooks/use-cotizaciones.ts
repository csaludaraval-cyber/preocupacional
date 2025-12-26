
"use client";

import { useState, useCallback, useMemo } from 'react';
import { collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import type { CotizacionFirestore, Cotizacion, Empresa, Solicitante, SolicitudTrabajador, StatusCotizacion } from '@/lib/types';
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

// Define los estados que ya no deberían aparecer en la lista principal de cotizaciones.
const hiddenStatuses: StatusCotizacion[] = [
    'FACTURADO', 
    'facturado_lioren',
    // Si 'orden_examen_enviada' se gestiona exclusivamente en facturación consolidada,
    // podríamos ocultarlo de aquí también. Por ahora lo dejamos visible.
];

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

    const filtered = rawQuotes.filter(q => !hiddenStatuses.includes(q.status));

    const processed = filtered.map(q => {
        const fechaCreacionSerializable = q.fechaCreacion instanceof Timestamp ? { seconds: q.fechaCreacion.seconds, nanoseconds: q.fechaCreacion.nanoseconds } : q.fechaCreacion;

        const fecha = q.fechaCreacion instanceof Timestamp 
            ? q.fechaCreacion.toDate().toLocaleDateString('es-CL')
            : new Date().toLocaleDateString('es-CL');

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
            fechaCreacion: fechaCreacionSerializable as { seconds: number; nanoseconds: number; },
            status: q.status || 'PENDIENTE',
            empresaData: empresaData,
            solicitanteData: solicitanteData,
            solicitudesData: solicitudesData,
            pagoVoucherUrl: q.pagoVoucherUrl,
            liorenPdfUrl: q.liorenPdfUrl,
            liorenFolio: q.liorenFolio,
        } as Cotizacion;
    });

    return processed.sort((a, b) => {
        const dateA = a.fechaCreacion?.seconds || 0;
        const dateB = b.fechaCreacion?.seconds || 0;
        return dateB - dateA;
    });

  }, [rawQuotes]);


  return { quotes, isLoading, error: firestoreError, refetchQuotes };
}

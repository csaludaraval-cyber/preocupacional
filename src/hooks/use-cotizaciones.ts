
"use client";

import { useState, useCallback } from 'react';
import { collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import type { CotizacionFirestore, Cotizacion } from '@/lib/types';
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
      where('status', '!=', 'facturado_consolidado'),
      orderBy('status'),
      orderBy('fechaCreacion', 'desc')
    ),
    []
  );

  const { data: rawQuotes, isLoading, error: firestoreError, refetch: refetchQuotes } = useCollection<CotizacionFirestore>(cotizacionesQuery);
  
  const processQuotes = (data: WithId<CotizacionFirestore>[] | null): Cotizacion[] => {
    if (!data) return [];
    
    return data.map(q => {
        const fecha = q.fechaCreacion instanceof Timestamp 
            ? q.fechaCreacion.toDate().toLocaleDateString('es-CL')
            : new Date().toLocaleDateString('es-CL');

        return {
            id: q.id,
            empresa: q.empresaData,
            solicitante: q.solicitanteData,
            solicitudes: q.solicitudesData,
            total: q.total,
            fecha,
            // Manteniendo los campos originales de firestore por si son necesarios
            fechaCreacion: q.fechaCreacion,
            status: q.status || 'PENDIENTE',
        } as Cotizacion;
    });
  };

  const quotes = processQuotes(rawQuotes);

  return { quotes, isLoading, error: firestoreError, refetchQuotes };
}


"use client";

import { useState, useCallback, useMemo } from 'react';
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
  // Simplificamos la consulta para evitar errores de índice compuesto en Firestore.
  // El filtrado y ordenamiento complejo se hará en el lado del cliente.
  const cotizacionesQuery = useMemoFirebase(() => 
    query(
      collection(firestore, 'cotizaciones'), 
      orderBy('fechaCreacion', 'desc')
    ),
    []
  );

  const { data: rawQuotes, isLoading, error: firestoreError, refetch: refetchQuotes } = useCollection<CotizacionFirestore>(cotizacionesQuery);
  
  // Usamos useMemo para procesar los datos solo cuando cambian.
  const quotes = useMemo(() => {
    if (!rawQuotes) return [];

    // 1. Filtrar las cotizaciones que no queremos mostrar.
    const filtered = rawQuotes.filter(q => q.status !== 'facturado_consolidado');

    // 2. Mapear al formato que necesita el frontend.
    const processed = filtered.map(q => {
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
            fechaCreacion: q.fechaCreacion,
            status: q.status || 'PENDIENTE',
            // Asegurarse de pasar todos los datos denormalizados
            empresaData: q.empresaData,
            solicitanteData: q.solicitanteData,
            solicitudesData: q.solicitudesData,
            simpleFacturaInvoiceId: q.simpleFacturaInvoiceId,
        } as Cotizacion;
    });

    // 3. Ordenar por status (opcional, pero mantiene el comportamiento anterior)
    return processed.sort((a, b) => {
        if (a.status < b.status) return -1;
        if (a.status > b.status) return 1;
        return 0;
    });
  }, [rawQuotes]);


  return { quotes, isLoading, error: firestoreError, refetchQuotes };
}

'use client';

import React, { useMemo, useState } from 'react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { firestore } from '@/lib/firebase';
import type { CotizacionFirestore, StatusCotizacion } from '@/lib/types';
import { Loader2, Calendar, Search, XCircle, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DetalleClinicoModal } from './DetalleClinicoModal'; // Importamos el componente de detalle

// --- UTILIDADES DE FECHA SEGURA ---
const getMs = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return new Date(ts).getTime() || 0;
};

const getStartOfDay = (timestamp: number): number => {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// --- QUERY DE DATOS ---
const PagadasQuery = query(
  collection(firestore, 'cotizaciones'),
  where('status', 'in', ['PAGADO', 'FACTURADO', 'facturado_lioren'])
);

export function MedicoDashboard() {
  const { data: cotizaciones, isLoading, error } = useCollection<CotizacionFirestore>(PagadasQuery);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<CotizacionFirestore | null>(null);

  // --- LÓGICA DE ORDENAMIENTO DINÁMICO (Smart-Sorting) ---
  const sortedOrders = useMemo(() => {
    if (!cotizaciones) return [];

    const now = getStartOfDay(Date.now());

    const enriched = cotizaciones.map(q => {
      // Usamos la fecha de creación por ahora, asumiendo que es la 'fecha de atención'
      // Si tienes un campo 'fechaAtencion' en Firestore, úsalo en su lugar: q.fechaAtencion
      const attentionDateMs = getStartOfDay(getMs(q.fechaCreacion)); // Usar la fecha de creación o la de atención real

      const diff = attentionDateMs - now;
      let category: 'HOY' | 'FUTURO' | 'PASADO' = 'PASADO';

      if (diff === 0) {
        category = 'HOY';
      } else if (diff > 0) {
        category = 'FUTURO';
      }
      
      return { ...q, attentionDateMs, category };
    });

    // Filtro por búsqueda
    const filtered = enriched.filter(q => {
      const lowerSearch = searchTerm.toLowerCase();
      const empresa = q.empresaData?.razonSocial?.toLowerCase() || '';
      const rut = q.empresaData?.rut?.toLowerCase() || '';
      const solicitante = q.solicitanteData?.nombre?.toLowerCase() || '';

      return empresa.includes(lowerSearch) || rut.includes(lowerSearch) || solicitante.includes(lowerSearch);
    });

    // Ordenamiento por categoría y luego por fecha
    return filtered.sort((a, b) => {
      const order = { HOY: 3, FUTURO: 2, PASADO: 1 };
      
      if (order[b.category] !== order[a.category]) {
        return order[b.category] - order[a.category];
      }

      // Dentro de HOY/FUTURO, ordenar por fecha más cercana (ascendente)
      if (a.category !== 'PASADO') {
        return a.attentionDateMs - b.attentionDateMs;
      }

      // Dentro de PASADO, ordenar por fecha más reciente (descendente)
      return b.attentionDateMs - a.attentionDateMs; 
    });
  }, [cotizaciones, searchTerm]);

  // --- RENDERIZADO DE SEGURIDAD ---
  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (error) return <Alert variant="destructive"><XCircle /><AlertTitle>Error</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;

  const getStatusBadge = (category: 'HOY' | 'FUTURO' | 'PASADO') => {
    switch (category) {
      case 'HOY': return <Badge className="bg-green-600 animate-pulse hover:bg-green-700">ATENDER HOY</Badge>;
      case 'FUTURO': return <Badge variant="default">PRÓXIMA FECHA</Badge>;
      case 'PASADO': return <Badge variant="secondary" className="bg-gray-400">PASADA</Badge>;
      default: return <Badge variant="outline">N/A</Badge>;
    }
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Calendar className="w-5 h-5"/> Órdenes de Laboratorio ({sortedOrders.length})
          </CardTitle>
          <div className="relative w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por Empresa o RUT..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prioridad</TableHead>
                <TableHead>ID Orden</TableHead>
                <TableHead>Empresa Solicitante</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead>N° Trabajadores</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.length > 0 ? sortedOrders.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>{getStatusBadge(q.category)}</TableCell>
                  <TableCell className="font-mono text-xs">{q.id?.slice(-6)}</TableCell>
                  <TableCell className="font-medium">{q.empresaData?.razonSocial || 'N/A'}</TableCell>
                  <TableCell>{formatDate(q.fechaCreacion)}</TableCell>
                  <TableCell className="text-center">{q.solicitudesData?.length || 0}</TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" onClick={() => setSelectedQuote(q)}>
                      Ver Nómina <ChevronDown className="ml-2 h-4 w-4 rotate-90"/>
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay órdenes de examen Pagadas/Facturadas pendientes.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Modal de Detalle Clínico */}
      <Dialog open={!!selectedQuote} onOpenChange={setSelectedQuote}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Órden de Examen: {selectedQuote?.empresaData?.razonSocial}</DialogTitle>
          </DialogHeader>
          {selectedQuote && <DetalleClinicoModal quote={selectedQuote} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
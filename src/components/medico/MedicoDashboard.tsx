'use client';

import React, { useMemo, useState } from 'react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { firestore } from '@/lib/firebase';
import type { CotizacionFirestore } from '@/lib/types';
import { Loader2, Calendar, Search, XCircle, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DetalleClinicoModal } from './DetalleClinicoModal';
import { useMemoFirebase } from '@/firebase/provider';

// --- UTILIDADES DE FECHA SEGURA ---
const getMs = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return new Date(ts).getTime() || 0;
};

const formatDate = (ts: any) => {
    const ms = getMs(ts);
    return ms === 0 ? 'N/A' : new Date(ms).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
};


// --- QUERY DE DATOS OPTIMIZADA ---
const PagadasQuery = () => useMemoFirebase(() => query(
  collection(firestore, 'cotizaciones'),
  where('status', 'in', ['PAGADO', 'FACTURADO', 'facturado_lioren']),
  orderBy('fechaCreacion', 'desc')
), []);

export function MedicoDashboard() {
  const { data: cotizaciones, isLoading, error } = useCollection<CotizacionFirestore>(PagadasQuery());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<CotizacionFirestore | null>(null);

  // --- LÓGICA DE FILTRADO EN CLIENTE ---
  const filteredOrders = useMemo(() => {
    if (!cotizaciones) return [];

    if (!searchTerm) return cotizaciones;

    const lowerSearch = searchTerm.toLowerCase();
    return cotizaciones.filter(q => {
      const empresa = q.empresaData?.razonSocial?.toLowerCase() || '';
      const rut = q.empresaData?.rut?.toLowerCase() || '';
      
      return empresa.includes(lowerSearch) || rut.includes(lowerSearch);
    });
  }, [cotizaciones, searchTerm]);

  // --- RENDERIZADO DE SEGURIDAD ---
  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (error) return <Alert variant="destructive"><XCircle /><AlertTitle>Error</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Calendar className="w-5 h-5"/> Órdenes de Laboratorio ({filteredOrders.length})
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
              {filteredOrders.length > 0 ? filteredOrders.map((q) => (
                <TableRow key={q.id}>
                  <TableCell><Badge variant="default">Pendiente</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{q.id?.slice(-6)}</TableCell>
                  <TableCell className="font-medium">{q.empresaData?.razonSocial || 'N/A'}</TableCell>
                  <TableCell>{formatDate(q.fechaCreacion)}</TableCell>
                  <TableCell className="text-center">{q.solicitudesData?.length || 0}</TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" onClick={() => setSelectedQuote(q)}>
                      Ver Nómina <ChevronRight className="ml-2 h-4 w-4"/>
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
      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Orden de Examen: {selectedQuote?.empresaData?.razonSocial}</DialogTitle>
          </DialogHeader>
          {selectedQuote && <DetalleClinicoModal quote={selectedQuote} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

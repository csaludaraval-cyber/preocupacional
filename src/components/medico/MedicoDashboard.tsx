'use client';

import React, { useMemo, useState } from 'react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
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

// --- UTILIDADES DE FECHA SEGURA (Anti-Error 500) ---
const getMs = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  const parsed = new Date(ts).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

const getStartOfDay = (timestamp: number): number => {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function MedicoDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<CotizacionFirestore | null>(null);

  // --- 1. CONSULTA ESTABLE (Soluciona el error ca9 / Assertion Failed) ---
  const pagadasQuery = useMemoFirebase(() => 
    query(
      collection(firestore, 'cotizaciones'),
      where('status', 'in', ['PAGADO', 'FACTURADO', 'facturado_lioren'])
      // ELIMINAMOS EL ORDERBY PARA EVITAR ERRORES TÉCNICOS
    ), 
    []
  );

  const { data: cotizaciones, isLoading, error } = useCollection<CotizacionFirestore>(pagadasQuery);

  // --- 2. LÓGICA DE PRIORIDAD Y FILTRADO (Smart-Sorting) ---
  const processedOrders = useMemo(() => {
    if (!cotizaciones) return [];

    const nowMs = getStartOfDay(Date.now());

    // Mapear y Categorizar
    const enriched = cotizaciones.map(q => {
      const dateMs = getStartOfDay(getMs(q.fechaCreacion)); // Usamos fechaCreacion como referencia
      const diff = dateMs - nowMs;
      
      let category: 'HOY' | 'FUTURO' | 'PASADO' = 'PASADO';
      if (diff === 0) category = 'HOY';
      else if (diff > 0) category = 'FUTURO';

      return { ...q, dateMs, category };
    });

    // Filtrar por término de búsqueda
    const filtered = enriched.filter(q => {
      const lower = searchTerm.toLowerCase();
      const empresa = (q.empresaData?.razonSocial || '').toLowerCase();
      const rut = (q.empresaData?.rut || '').toLowerCase();
      return empresa.includes(lower) || rut.includes(lower);
    });

    // Ordenar por Semáforo: HOY -> FUTURO -> PASADO
    return filtered.sort((a, b) => {
      const priority = { HOY: 1, FUTURO: 2, PASADO: 3 };
      if (priority[a.category] !== priority[b.category]) {
        return priority[a.category] - priority[b.category];
      }
      // Dentro de la misma categoría, el más reciente primero
      return b.dateMs - a.dateMs;
    });
  }, [cotizaciones, searchTerm]);

  // --- 3. GESTIÓN DE UI ---
  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-primary" />
      <p className="text-muted-foreground">Cargando hoja de ruta médica...</p>
    </div>
  );

  if (error) return (
    <Alert variant="destructive" className="max-w-2xl mx-auto">
      <XCircle className="h-4 w-4" />
      <AlertTitle>Fallo de Conexión</AlertTitle>
      <AlertDescription>
        {error.message.includes('index') 
          ? "Falta crear un índice en Firestore para esta consulta. Haga clic en el link de la consola."
          : "No se pudieron cargar las órdenes. Verifique su conexión."}
      </AlertDescription>
    </Alert>
  );

  const getCategoryBadge = (cat: 'HOY' | 'FUTURO' | 'PASADO') => {
    switch (cat) {
      case 'HOY': return <Badge className="bg-green-600 hover:bg-green-700 animate-pulse">ATENDER HOY</Badge>;
      case 'FUTURO': return <Badge variant="outline" className="text-blue-600 border-blue-600">PRÓXIMO</Badge>;
      case 'PASADO': return <Badge variant="secondary" className="text-gray-500 opacity-70">PASADO</Badge>;
    }
  };

  return (
    <>
      <Card className="shadow-xl border-t-4 border-t-primary">
        <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary"/> Hoja de Ruta Médica
            </CardTitle>
            <p className="text-sm text-muted-foreground">Órdenes confirmadas listas para toma de muestras.</p>
          </div>
          <div className="relative w-full md:w-1/3">
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
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[150px]">Prioridad</TableHead>
                  <TableHead>ID Orden</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Fecha Orden</TableHead>
                  <TableHead className="text-center">Pacientes</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedOrders.length > 0 ? processedOrders.map((q) => (
                  <TableRow key={q.id} className={q.category === 'HOY' ? 'bg-green-50/30' : ''}>
                    <TableCell>{getCategoryBadge(q.category)}</TableCell>
                    <TableCell className="font-mono text-xs font-bold">{q.id?.slice(-6)}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{q.empresaData?.razonSocial || 'N/A'}</div>
                      <div className="text-[10px] text-muted-foreground">{q.empresaData?.rut}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(getMs(q.fechaCreacion)).toLocaleDateString('es-CL')}
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {q.solicitudesData?.length || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="hover:text-primary" onClick={() => setSelectedQuote(q)}>
                        Ver Nómina <ChevronRight className="ml-1 h-4 w-4"/>
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">
                      No se encontraron órdenes de examen pendientes de atención.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Modal de Detalle Clínico (Blindado sin precios) */}
      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Detalle de Orden Clínica</DialogTitle>
          </DialogHeader>
          {selectedQuote && <DetalleClinicoModal quote={selectedQuote} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

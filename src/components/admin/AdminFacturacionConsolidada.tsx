
"use client";

import React, { useMemo } from 'react';
import { collection, query, where, writeBatch } from 'firebase/firestore';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import type { CotizacionFirestore, Empresa } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, XCircle, FileClock, DollarSign, FileCheck2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface GroupedQuotes {
  empresa: Empresa;
  quotes: WithId<CotizacionFirestore>[];
  totalAmount: number;
  totalExams: number;
}

export function AdminFacturacionConsolidada() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const facturacionQuery = useMemoFirebase(() => 
    query(
      collection(firestore, 'cotizaciones'), 
      where('status', '==', 'orden_examen_enviada')
    ),
    []
  );

  const { data: quotesToBill, isLoading, error, refetch } = useCollection<CotizacionFirestore>(facturacionQuery);

  const groupedData: GroupedQuotes[] = useMemo(() => {
    if (!quotesToBill) return [];

    const groups: Record<string, GroupedQuotes> = {};

    quotesToBill.forEach(quote => {
      const empresaId = quote.empresaId;
      if (!groups[empresaId]) {
        groups[empresaId] = {
          empresa: quote.empresaData,
          quotes: [],
          totalAmount: 0,
          totalExams: 0,
        };
      }
      groups[empresaId].quotes.push(quote);
      groups[empresaId].totalAmount += quote.total;
      groups[empresaId].totalExams += quote.solicitudesData.reduce((acc, s) => acc + s.examenes.length, 0);
    });

    return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [quotesToBill]);

  const handleGenerateConsolidatedBilling = async () => {
    if (!quotesToBill || quotesToBill.length === 0) {
      toast({ title: 'Nada que procesar', description: 'No hay órdenes pendientes para facturar.' });
      return;
    }

    setIsProcessing(true);
    const batch = writeBatch(firestore);

    quotesToBill.forEach(quote => {
      const quoteRef = doc(firestore, 'cotizaciones', quote.id);
      batch.update(quoteRef, { status: 'facturado_consolidado' });
    });

    try {
      await batch.commit();
      toast({
        title: 'Cierre Exitoso',
        description: `${quotesToBill.length} órdenes han sido marcadas como facturadas. La lista se ha limpiado.`,
      });
      refetch(); // Trigger a re-fetch of the data
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al procesar el cierre',
        description: err.message || 'No se pudo actualizar el estado de las órdenes.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  if (isLoading || authLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (user?.role !== 'admin') {
    return (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
            <Shield className="h-4 w-4" />
            <AlertTitle>Acceso Denegado</AlertTitle>
            <AlertDescription>No tienes permisos para acceder a esta sección.</AlertDescription>
        </Alert>
    );
  }

  if (error) {
      return (
          <Alert variant="destructive" className="max-w-2xl mx-auto">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error al Cargar Datos</AlertTitle>
              <AlertDescription>No se pudo cargar la información de facturación. {error.message}</AlertDescription>
          </Alert>
      )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
            <div>
                <CardTitle className="font-headline text-3xl flex items-center gap-3">
                    <FileClock className="h-8 w-8 text-primary"/>
                    Facturación Consolidada de Clientes Frecuentes
                </CardTitle>
                <CardDescription>
                  Revisa las órdenes de examen acumuladas por cliente frecuente y genera el cierre para facturación.
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Cliente Frecuente</TableHead>
                    <TableHead className="text-center">Órdenes Acumuladas</TableHead>
                    <TableHead className="text-center">Exámenes Totales</TableHead>
                    <TableHead className="text-right font-bold">Monto Total a Facturar</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {groupedData.length > 0 ? groupedData.map(({ empresa, quotes, totalAmount, totalExams }) => (
                <TableRow key={empresa.rut} className="font-medium">
                  <TableCell>
                    <p className='font-semibold text-foreground'>{empresa.razonSocial}</p>
                    <p className='text-sm text-muted-foreground'>RUT: {empresa.rut}</p>
                  </TableCell>
                  <TableCell className="text-center">{quotes.length}</TableCell>
                  <TableCell className="text-center">{totalExams}</TableCell>
                  <TableCell className="text-right text-lg font-bold text-primary">{formatCurrency(totalAmount)}</TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        No hay órdenes de examen pendientes de facturación para clientes frecuentes.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="border-t pt-6 flex-col items-end gap-4">
        <div className="flex items-center gap-4">
          <div className='text-right'>
              <p className='text-sm text-muted-foreground'>Total a facturar (todos los clientes)</p>
              <p className='text-2xl font-bold text-primary'>
                {formatCurrency(groupedData.reduce((acc, group) => acc + group.totalAmount, 0))}
              </p>
          </div>
           <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="lg" disabled={groupedData.length === 0 || isProcessing}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileCheck2 className="mr-2 h-4 w-4"/>}
                  Generar Cierre Mensual
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Confirmar Cierre de Facturación?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción marcará todas las órdenes acumuladas como "facturadas" y las limpiará de esta lista.
                    Este proceso es irreversible para el período actual. ¿Desea continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleGenerateConsolidatedBilling} disabled={isProcessing}>
                    Sí, generar cierre
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}

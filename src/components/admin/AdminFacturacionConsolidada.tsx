
"use client";

import React, { useMemo, useState } from 'react';
import { collection, query, where, writeBatch, doc } from 'firebase/firestore';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import type { Cotizacion, CotizacionFirestore, Empresa } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, XCircle, FileClock, FileCheck2, Download, History, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createLiorenInvoice } from '@/server/lioren';
import { cleanRut } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '../ui/badge';
import { DTE_TIPO } from '@/config/lioren';


interface GroupedQuotes {
  empresa: Empresa;
  quotes: WithId<CotizacionFirestore>[];
  totalAmount: number;
  totalExams: number;
}

interface FacturaResult {
    empresaId: string;
    pdfUrl: string;
    folio: number;
}

interface BilledInvoice {
    folio: string;
    empresa: Empresa;
    quotes: WithId<CotizacionFirestore>[];
    totalAmount: number;
    fechaFacturacion: string;
}


export function AdminFacturacionConsolidada() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [processingCompanyId, setProcessingCompanyId] = useState<string | null>(null);
  const [generatedInvoices, setGeneratedInvoices] = useState<FacturaResult[]>([]);
  
  // Query for quotes pending billing
  const pendingQuery = useMemoFirebase(() => 
    query(
      collection(firestore, 'cotizaciones'), 
      where('status', '==', 'orden_examen_enviada')
    ),
    []
  );
  const { data: quotesToBill, isLoading: isLoadingPending, error: errorPending, refetch } = useCollection<CotizacionFirestore>(pendingQuery);

  // Query for already billed quotes
  const billedQuery = useMemoFirebase(() =>
    query(
      collection(firestore, 'cotizaciones'),
      where('status', '==', 'facturado_simplefactura')
    ),
    []
  );
  const { data: billedQuotes, isLoading: isLoadingBilled, error: errorBilled } = useCollection<CotizacionFirestore>(billedQuery);


  const groupedData: GroupedQuotes[] = useMemo(() => {
    if (!quotesToBill) return [];
    const groups: Record<string, GroupedQuotes> = {};
    quotesToBill.forEach(quote => {
      const empresaId = cleanRut(quote.empresaData.rut);
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
  
  const billedHistory: BilledInvoice[] = useMemo(() => {
      if (!billedQuotes) return [];
      const history: Record<string, BilledInvoice> = {};

      billedQuotes.forEach(quote => {
          const folio = quote.simpleFacturaInvoiceId;
          if (!folio) return;
          
          if (!history[folio]) {
              history[folio] = {
                  folio,
                  empresa: quote.empresaData,
                  quotes: [],
                  totalAmount: 0,
                  fechaFacturacion: quote.fechaCreacion ? format(quote.fechaCreacion.toDate(), 'PPP', { locale: es }) : 'Fecha no disponible'
              };
          }
          history[folio].quotes.push(quote);
          history[folio].totalAmount += quote.total;
      });

      return Object.values(history).sort((a, b) => parseInt(b.folio) - parseInt(a.folio));
  }, [billedQuotes]);

  const handleGenerateInvoice = async (group: GroupedQuotes) => {
    const cleanRutEmpresa = cleanRut(group.empresa.rut);
    setProcessingCompanyId(cleanRutEmpresa);
    try {
        // Convert Firestore objects to plain Cotizacion objects
        const plainQuotes: Cotizacion[] = group.quotes.map(q => ({
            id: q.id,
            ...q,
            empresa: q.empresaData,
            solicitante: q.solicitanteData,
            solicitudes: q.solicitudesData,
            fecha: q.fechaCreacion.toDate().toISOString(),
            fechaCreacion: {
              seconds: q.fechaCreacion.seconds,
              nanoseconds: q.fechaCreacion.nanoseconds
            },
        }));

        const { pdfUrl, folio } = await createLiorenInvoice(
            group.empresa,
            plainQuotes,
            group.totalAmount
        );
        
        toast({
            title: '¡Factura Emitida!',
            description: `Se ha generado el DTE Folio N° ${folio} para ${group.empresa.razonSocial}.`,
        });
        setGeneratedInvoices(prev => [...prev, { empresaId: cleanRutEmpresa, pdfUrl, folio }]);
        refetch();
    } catch (err: any) {
        console.error(err);
        toast({
            variant: 'destructive',
            title: 'Error al Facturar',
            description: err.message,
        });
    } finally {
        setProcessingCompanyId(null);
    }
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };
  
  const isLoading = isLoadingPending || authLoading || isLoadingBilled;
  const error = errorPending || errorBilled;

  if (isLoading) {
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
    <div className='space-y-8'>
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-3xl flex items-center gap-3">
                    <FileClock className="h-8 w-8 text-primary"/>
                    Facturación Consolidada Pendiente
                </CardTitle>
                <CardDescription>
                Revisa las órdenes de examen acumuladas por cliente frecuente y genera el DTE correspondiente.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Cliente Frecuente</TableHead><TableHead className="text-center">Órdenes Acumuladas</TableHead><TableHead className="text-right">Monto a Facturar (Exento)</TableHead><TableHead className="text-center w-[250px]">Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                    {groupedData.length > 0 ? groupedData.map((group) => {
                        const cleanRutEmpresa = cleanRut(group.empresa.rut);
                        const invoiceResult = generatedInvoices.find(inv => inv.empresaId === cleanRutEmpresa);
                        const isProcessing = processingCompanyId === cleanRutEmpresa;

                        return (
                            <TableRow key={cleanRutEmpresa} className="font-medium">
                            <TableCell><p className='font-semibold text-foreground'>{group.empresa.razonSocial}</p><p className='text-sm text-muted-foreground'>RUT: {group.empresa.rut}</p></TableCell>
                            <TableCell className="text-center">{group.quotes.length}</TableCell>
                            <TableCell className="text-right text-lg font-bold text-primary">{formatCurrency(group.totalAmount)}</TableCell>
                            <TableCell className="text-center">
                                {invoiceResult ? (
                                    <Button variant="secondary" onClick={() => window.open(invoiceResult.pdfUrl, '_blank')}>
                                        <Download className="mr-2 h-4 w-4"/> Descargar Factura (DTE-{invoiceResult.folio})
                                    </Button>
                                ) : (
                                    <Button onClick={() => handleGenerateInvoice(group)} disabled={isProcessing}>
                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileCheck2 className="mr-2 h-4 w-4"/>}
                                        {isProcessing ? 'Generando DTE...' : 'Generar Factura Exenta'}
                                    </Button>
                                )}
                            </TableCell>
                            </TableRow>
                        )
                    }) : (
                        <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No hay órdenes de examen pendientes de facturación para clientes frecuentes.</TableCell></TableRow>
                    )}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="border-t pt-6 flex justify-end">
                <div className='text-right'><p className='text-sm text-muted-foreground'>Total pendiente (todos los clientes)</p><p className='text-2xl font-bold text-primary'>{formatCurrency(groupedData.reduce((acc, group) => acc + group.totalAmount, 0))}</p></div>
            </CardFooter>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-3xl flex items-center gap-3">
                    <History className="h-8 w-8 text-primary"/>
                    Historial de Facturas Emitidas
                </CardTitle>
                <CardDescription>
                    Consulta las facturas consolidadas que ya han sido generadas.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {billedHistory.length > 0 ? (
                    billedHistory.map(invoice => (
                        <Collapsible key={invoice.folio} className="border rounded-lg p-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">DTE Folio</p>
                                    <p className="font-bold text-primary text-lg">{invoice.folio}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Cliente</p>
                                    <p className="font-semibold">{invoice.empresa.razonSocial}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Monto Facturado</p>
                                    <p className="font-semibold">{formatCurrency(invoice.totalAmount)}</p>
                                </div>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" className="flex items-center gap-2">
                                        Ver Órdenes ({invoice.quotes.length}) <ChevronDown className="h-4 w-4"/>
                                    </Button>
                                </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent className="mt-4 pt-4 border-t">
                                <p className="font-semibold mb-2">Órdenes de Examen Incluidas en esta Factura:</p>
                                <div className="flex flex-wrap gap-2">
                                {invoice.quotes.map(q => (
                                    <Badge key={q.id} variant="secondary">ID: {q.id.slice(-6)}</Badge>
                                ))}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground py-8">No hay facturas emitidas en el historial.</p>
                )}
            </CardContent>
        </Card>
    </div>
  );
}

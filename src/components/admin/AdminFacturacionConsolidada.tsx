"use client";

import React, { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import type { CotizacionFirestore, Empresa } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, XCircle, FileClock, History, ChevronDown, Download, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cleanRut } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '../ui/badge';
import { emitirDTEConsolidado } from '@/server/actions/facturacionActions';

interface GroupedQuotes {
  empresa: Empresa;
  quotes: any[];
  totalAmount: number;
  totalExams: number;
}

interface BilledInvoice {
    folio: string;
    empresa: Empresa;
    quotes: any[];
    totalAmount: number;
    fechaNumeric: number; // Para ordenamiento real
    pdfUrl?: string;
}

export function AdminFacturacionConsolidada() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // --- UTILIDADES DE SEGURIDAD ---
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

  // --- QUERIES ---
  // Mantenemos orden_examen_enviada pero permitimos que la lógica sea flexible
  const pendingQuery = useMemoFirebase(() => 
    query(collection(firestore, 'cotizaciones'), where('status', 'in', ['orden_examen_enviada', 'CORREO_ENVIADO'])), []);
  
  const { data: quotesToBill, isLoading: isLoadingPending, error: errorPending, refetch } = useCollection<CotizacionFirestore>(pendingQuery);

  const billedQuery = useMemoFirebase(() =>
    query(collection(firestore, 'cotizaciones'), where('status', 'in', ['facturado_lioren', 'FACTURADO'])), []);

  const { data: billedQuotes, isLoading: isLoadingBilled, error: errorBilled } = useCollection<CotizacionFirestore>(billedQuery);

  // --- LÓGICA DE AGRUPAMIENTO ---
  const groupedData: GroupedQuotes[] = useMemo(() => {
    if (!quotesToBill) return [];
    const groups: Record<string, GroupedQuotes> = {};
    
    // Solo agrupamos clientes marcados como frecuentes (o que ya estén en este flujo)
    quotesToBill.forEach(quote => {
      // Filtro de seguridad: si es cliente normal, no debería estar aquí
      if (quote.empresaData?.modalidadFacturacion !== 'frecuente' && quote.status !== 'orden_examen_enviada') return;

      const rutKey = cleanRut(quote.empresaData?.rut || 'S-RUT');
      if (!groups[rutKey]) {
        groups[rutKey] = {
          empresa: quote.empresaData,
          quotes: [],
          totalAmount: 0,
          totalExams: 0,
        };
      }
      groups[rutKey].quotes.push(quote);
      groups[rutKey].totalAmount += (quote.total || 0);
      groups[rutKey].totalExams += (quote.solicitudesData?.reduce((acc, s) => acc + (s.examenes?.length || 0), 0) || 0);
    });
    return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [quotesToBill]);
  
  const billedHistory: BilledInvoice[] = useMemo(() => {
      if (!billedQuotes) return [];
      const history: Record<string, BilledInvoice> = {};

      billedQuotes.forEach(quote => {
          const folio = quote.liorenFolio || "S-F";
          if (!history[folio]) {
              history[folio] = {
                  folio,
                  empresa: quote.empresaData,
                  quotes: [],
                  totalAmount: 0,
                  pdfUrl: quote.liorenPdfUrl,
                  fechaNumeric: getMs(quote.liorenFechaEmision || quote.fechaCreacion)
              };
          }
          history[folio].quotes.push(quote);
          history[folio].totalAmount += (quote.total || 0);
      });

      return Object.values(history).sort((a,b) => b.fechaNumeric - a.fechaNumeric);
  }, [billedQuotes]);

  const handleProcessGroup = async (group: GroupedQuotes) => {
    const rutCliente = cleanRut(group.empresa.rut);
    setIsProcessing(rutCliente);
    try {
      const result = await emitirDTEConsolidado(rutCliente);
      if (result.success) {
        toast({ title: "Éxito", description: `Factura ${result.folio} emitida.` });
        refetch();
      } else throw new Error(result.error);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setIsProcessing(null); }
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(value);
  
  if (authLoading || isLoadingPending || isLoadingBilled) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8" /></div>;
  if (errorPending || errorBilled) return <Alert variant="destructive"><XCircle /><AlertTitle>Error de Carga</AlertTitle></Alert>;

  return (
    <div className='space-y-8'>
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-3 text-foreground uppercase font-bold">
                    <FileClock className="h-7 w-7"/> Facturación Consolidada
                </CardTitle>
                <CardDescription>Emisión de DTE 34 para clientes frecuentes.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cliente Frecuente</TableHead>
                            <TableHead className="text-center">Órdenes</TableHead>
                            <TableHead className="text-right">Monto Neto</TableHead>
                            <TableHead className="text-center">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {groupedData.length > 0 ? groupedData.map((group) => (
                        <TableRow key={group.empresa.rut} className="font-medium">
                            <TableCell>
                                <div className='font-semibold'>{group.empresa.razonSocial}</div>
                                <div className='text-xs text-muted-foreground'>RUT: {group.empresa.rut}</div>
                            </TableCell>
                            <TableCell className="text-center">{group.quotes.length}</TableCell>
                            <TableCell className="text-right font-bold text-primary">{formatCurrency(group.totalAmount)}</TableCell>
                            <TableCell className="text-center">
                                <Button size="sm" onClick={() => handleProcessGroup(group)} disabled={!!isProcessing}>
                                    {isProcessing === cleanRut(group.empresa.rut) ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <FileText className="h-4 w-4 mr-2"/>}
                                    Facturar Grupo
                                </Button>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Sin facturas pendientes.</TableCell></TableRow>
                    )}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="border-t pt-6 flex justify-end">
                <div className='text-right'>
                    <p className='text-xs text-muted-foreground'>Total Cartera Pendiente</p>
                    <p className='text-2xl font-bold text-primary'>{formatCurrency(groupedData.reduce((acc, g) => acc + g.totalAmount, 0))}</p>
                </div>
            </CardFooter>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-3 text-foreground uppercase font-bold">
                    <History className="h-7 w-7"/> Historial de Emisiones
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {billedHistory.map(invoice => (
                    <Collapsible key={invoice.folio} className="border rounded-lg p-4 bg-white shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-4">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase">Folio SII</p>
                                <p className="font-bold text-lg">{invoice.folio}</p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-[10px] text-muted-foreground uppercase">Cliente</p>
                                <p className="font-medium">{invoice.empresa.razonSocial}</p>
                                <p className="text-[10px]">{formatDate(invoice.fechaNumeric)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                                <p className="font-bold text-primary">{formatCurrency(invoice.totalAmount)}</p>
                            </div>
                            <div className="flex justify-end gap-2">
                                {invoice.pdfUrl && (
                                    <Button asChild variant="outline" size="icon" title="Descargar PDF">
                                        <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4"/></a>
                                    </Button>
                                )}
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm">Detalle <ChevronDown className="ml-1 h-3 w-3"/></Button>
                                </CollapsibleTrigger>
                            </div>
                        </div>
                        <CollapsibleContent className="mt-4 pt-4 border-t grid grid-cols-1 gap-2">
                            <p className="text-xs font-semibold">Cotizaciones Consolidadas:</p>
                            <div className="flex flex-wrap gap-2">
                                {invoice.quotes.map(q => (
                                    <Badge key={q.id} variant="secondary" className="text-[10px]">ID: {q.id.slice(-6)}</Badge>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </CardContent>
        </Card>
    </div>
  );
}
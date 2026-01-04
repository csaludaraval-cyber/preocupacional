"use client";

import React, { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Shield, 
  XCircle, 
  FileClock, 
  History, 
  ChevronDown, 
  Download, 
  FileText,
  Building
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { emitirDTEConsolidado } from '@/server/actions/facturacionActions';

export function AdminFacturacionConsolidada() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const getMs = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    return new Date(ts).getTime() || 0;
  };

  const pendingQuery = useMemoFirebase(() => 
    query(collection(firestore, 'cotizaciones'), where('status', 'in', ['orden_examen_enviada', 'CORREO_ENVIADO'])), []);
  
  const { data: quotesToBill, isLoading: isLoadingPending } = useCollection<any>(pendingQuery);

  const billedQuery = useMemoFirebase(() =>
    query(collection(firestore, 'cotizaciones'), where('status', 'in', ['facturado_lioren', 'FACTURADO'])), []);

  const { data: billedQuotes, isLoading: isLoadingBilled } = useCollection<any>(billedQuery);

  const groupedData = useMemo(() => {
    if (!quotesToBill) return [];
    const groups: Record<string, any> = {};
    quotesToBill.forEach(quote => {
      const rut = quote.empresaData?.rut || 'S-RUT';
      if (quote.empresaData?.modalidadFacturacion === 'frecuente' || quote.status === 'orden_examen_enviada') {
        if (!groups[rut]) groups[rut] = { empresa: quote.empresaData, quotes: [], totalAmount: 0 };
        groups[rut].quotes.push(quote);
        groups[rut].totalAmount += (quote.total || 0);
      }
    });
    return Object.values(groups);
  }, [quotesToBill]);
  
  const billedHistory = useMemo(() => {
      if (!billedQuotes) return [];
      const history: Record<string, any> = {};
      billedQuotes.forEach(quote => {
          const folio = quote.liorenFolio || "S-F";
          if (!history[folio]) history[folio] = { folio, empresa: quote.empresaData, quotes: [], totalAmount: 0, pdfUrl: quote.liorenPdfUrl, date: getMs(quote.fechaCreacion) };
          history[folio].quotes.push(quote);
          history[folio].totalAmount += (quote.total || 0);
      });
      return Object.values(history);
  }, [billedQuotes]);

  if (authLoading || isLoadingPending || isLoadingBilled) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  }

  return (
    <div className='space-y-8 container mx-auto p-4'>
        <Card className="border-t-4 border-t-primary">
            <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <FileClock className="h-6 w-6"/> Facturación Consolidada Pendiente
                </CardTitle>
                <CardDescription>Clientes con facturación acumulada.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="text-right">Monto Acumulado</TableHead><TableHead className="text-center">Acción</TableHead></TableRow></TableHeader>
                    <TableBody>
                    {groupedData.map((group: any) => (
                        <TableRow key={group.empresa?.rut}>
                            <TableCell>
                                <div className="font-bold">{group.empresa?.razonSocial}</div>
                                <div className="text-xs text-muted-foreground">{group.empresa?.rut}</div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(group.totalAmount)}
                            </TableCell>
                            <TableCell className="text-center">
                                <Button size="sm" variant="outline" onClick={() => {}}>
                                    Facturar Grupo ({group.quotes.length})
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <History className="h-5 w-5"/> Historial de Facturas
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {billedHistory.map((invoice: any) => (
                    <div key={invoice.folio} className="p-4 border rounded-lg flex justify-between items-center bg-slate-50">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-bold">Folio SII: {invoice.folio}</p>
                            <p className="font-medium">{invoice.empresa?.razonSocial}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button asChild size="sm" variant="outline">
                                <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">Ver PDF</a>
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    </div>
  );
}
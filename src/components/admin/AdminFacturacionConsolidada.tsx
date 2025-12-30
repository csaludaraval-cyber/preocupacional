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
import { Loader2, Shield, XCircle, FileClock, History, ChevronDown, Download, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '../ui/badge';
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
  
  const { data: quotesToBill, isLoading: isLoadingPending, error: errorPending, refetch } = useCollection<any>(pendingQuery);

  const billedQuery = useMemoFirebase(() =>
    query(collection(firestore, 'cotizaciones'), where('status', 'in', ['facturado_lioren', 'FACTURADO'])), []);

  const { data: billedQuotes, isLoading: isLoadingBilled, error: errorBilled } = useCollection<any>(billedQuery);

  const groupedData = useMemo(() => {
    if (!quotesToBill) return [];
    const groups: Record<string, any> = {};
    quotesToBill.forEach(quote => {
      const rut = quote.empresaData?.rut || 'S-RUT';
      if (!groups[rut]) groups[rut] = { empresa: quote.empresaData, quotes: [], totalAmount: 0 };
      groups[rut].quotes.push(quote);
      groups[rut].totalAmount += (quote.total || 0);
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

  if (authLoading || isLoadingPending) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8" /></div>;

  return (
    <div className='space-y-8'>
        <Card>
            <CardHeader><CardTitle>Facturación Consolidada</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                    {groupedData.map((group: any) => (
                        <TableRow key={group.empresa?.rut}>
                            <TableCell>{group.empresa?.razonSocial}</TableCell>
                            <TableCell className="text-right font-bold">${group.totalAmount}</TableCell>
                            <TableCell className="text-center">
                                <Button size="sm" onClick={() => {}}>Facturar Grupo</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}

"use client";

import React, { useMemo, useState } from 'react';
import { collection, query, where, writeBatch, doc } from 'firebase/firestore';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import type { CotizacionFirestore, Empresa } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, XCircle, FileClock, DollarSign, FileCheck2, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { createSimpleFacturaInvoice } from '@/server/simplefactura';

interface GroupedQuotes {
  empresa: Empresa;
  quotes: WithId<CotizacionFirestore>[];
  totalAmount: number;
  totalExams: number;
}

interface FacturaResult {
    empresaId: string;
    pdfBase64: string;
    folio: number;
}

// Función helper para descargar el PDF en el cliente
const downloadPdfFromBase64 = (base64: string, folio: number, empresaRut: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `FACTURA_EXENTA_${folio}_${empresaRut}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


export function AdminFacturacionConsolidada() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [processingCompanyId, setProcessingCompanyId] = useState<string | null>(null);
  const [generatedInvoices, setGeneratedInvoices] = useState<FacturaResult[]>([]);
  
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
      const empresaId = quote.empresaData.rut; // Use RUT as the unique key
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

  const handleGenerateInvoice = async (group: GroupedQuotes) => {
    setProcessingCompanyId(group.empresa.rut);
    try {
        const { pdfBase64, folio } = await createSimpleFacturaInvoice(group.empresa, group.quotes, group.totalAmount);
        
        toast({
            title: '¡Factura Emitida!',
            description: `Se ha generado el DTE Folio N° ${folio} para ${group.empresa.razonSocial}.`,
        });

        // Guardar el resultado para mostrar el botón de descarga
        setGeneratedInvoices(prev => [...prev, { empresaId: group.empresa.rut, pdfBase64, folio }]);
        
        // Refrescar la lista de pendientes
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
                  Revisa las órdenes de examen acumuladas por cliente frecuente y genera el DTE correspondiente.
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
                    <TableHead className="text-right">Monto a Facturar (Exento)</TableHead>
                    <TableHead className="text-center w-[250px]">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {groupedData.length > 0 ? groupedData.map((group) => {
                const invoiceResult = generatedInvoices.find(inv => inv.empresaId === group.empresa.rut);
                const isProcessing = processingCompanyId === group.empresa.rut;

                return (
                    <TableRow key={group.empresa.rut} className="font-medium">
                    <TableCell>
                        <p className='font-semibold text-foreground'>{group.empresa.razonSocial}</p>
                        <p className='text-sm text-muted-foreground'>RUT: {group.empresa.rut}</p>
                    </TableCell>
                    <TableCell className="text-center">{group.quotes.length}</TableCell>
                    <TableCell className="text-right text-lg font-bold text-primary">{formatCurrency(group.totalAmount)}</TableCell>
                    <TableCell className="text-center">
                        {invoiceResult ? (
                             <Button
                                variant="secondary"
                                onClick={() => downloadPdfFromBase64(invoiceResult.pdfBase64, invoiceResult.folio, group.empresa.rut)}
                            >
                                <Download className="mr-2 h-4 w-4"/>
                                Descargar Factura (DTE-{invoiceResult.folio})
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
                 <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        No hay órdenes de examen pendientes de facturación para clientes frecuentes.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="border-t pt-6 flex justify-end">
        <div className='text-right'>
            <p className='text-sm text-muted-foreground'>Total pendiente (todos los clientes)</p>
            <p className='text-2xl font-bold text-primary'>
            {formatCurrency(groupedData.reduce((acc, group) => acc + group.totalAmount, 0))}
            </p>
        </div>
      </CardFooter>
    </Card>
  );
}

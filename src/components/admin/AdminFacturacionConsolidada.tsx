"use client";

import React, { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  FileClock, 
  History, 
  FileText,
  Search,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { emitirDTEConsolidado } from '@/server/actions/facturacionActions';

export function AdminFacturacionConsolidada() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper para convertir timestamps de Firebase a milisegundos
  const getMs = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    return new Date(ts).getTime() || 0;
  };

  // 1. QUERY: Órdenes pendientes de facturar (PAGADAS o con modalidad frecuente)
  const pendingQuery = useMemoFirebase(() => 
    query(collection(firestore, 'cotizaciones'), where('status', 'in', ['PAGADO', 'orden_examen_enviada', 'CORREO_ENVIADO'])), []);
  
  const { data: quotesToBill, isLoading: isLoadingPending, refetch: refetchPending } = useCollection<any>(pendingQuery);

  // 2. QUERY: Historial de facturas ya emitidas
  const billedQuery = useMemoFirebase(() =>
    query(collection(firestore, 'cotizaciones'), where('status', 'in', ['FACTURADO', 'facturado_lioren'])), []);

  const { data: billedQuotes, isLoading: isLoadingBilled, refetch: refetchBilled } = useCollection<any>(billedQuery);

  // Agrupación de datos para la parte superior (Pendientes por RUT)
  const groupedData = useMemo(() => {
    if (!quotesToBill) return [];
    const groups: Record<string, any> = {};
    quotesToBill.forEach(quote => {
      // Solo agrupamos si el estado es PAGADO (lista para facturar) o si es modalidad frecuente
      if (quote.status === 'PAGADO') {
        const rut = quote.empresaData?.rut || 'S-RUT';
        if (!groups[rut]) groups[rut] = { empresa: quote.empresaData, quotes: [], totalAmount: 0 };
        groups[rut].quotes.push(quote);
        groups[rut].totalAmount += (quote.total || 0);
      }
    });
    return Object.values(groups);
  }, [quotesToBill]);
  
  // Procesamiento del Historial: Única factura por folio, ordenada por fecha DESC
  const billedHistory = useMemo(() => {
      if (!billedQuotes) return [];
      const historyMap: Record<string, any> = {};
      
      billedQuotes.forEach(quote => {
          const folio = quote.liorenFolio || "S-F";
          // Usamos el folio como llave para no repetir la misma factura masiva
          if (!historyMap[folio]) {
            historyMap[folio] = { 
                folio, 
                empresa: quote.empresaData, 
                pdfUrl: quote.liorenPdfUrl, 
                date: getMs(quote.fechaCreacion || quote.liorenFechaEmision),
                total: quote.total || 0
            };
          } else {
            // Si es consolidada, sumamos los montos para mostrar el total de la factura
            historyMap[folio].total += (quote.total || 0);
          }
      });

      // Convertir a Array, filtrar por búsqueda y ORDENAR (Más reciente arriba)
      return Object.values(historyMap)
        .filter((inv: any) => 
            inv.empresa?.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.empresa?.rut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.folio?.toString().includes(searchTerm)
        )
        .sort((a: any, b: any) => b.date - a.date);
  }, [billedQuotes, searchTerm]);

  // FUNCIÓN PARA FACTURAR EL GRUPO
  const handleFacturarGrupo = async (rut: string) => {
    setIsProcessing(rut);
    try {
        const result = await emitirDTEConsolidado(rut);
        if (result.success) {
            toast({ 
                title: "Facturación Exitosa", 
                description: `Se generó el Folio ${result.folio} para ${result.count} órdenes.` 
            });
            await refetchPending();
            await refetchBilled();
        }
    } catch (error: any) {
        toast({ 
            variant: "destructive", 
            title: "Error en Facturación", 
            description: error.message 
        });
    } finally {
        setIsProcessing(null);
    }
  };

  if (authLoading || isLoadingPending || isLoadingBilled) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-slate-300" /></div>;
  }

  return (
    <div className='space-y-8 container mx-auto p-4 max-w-6xl'>
        {/* SECCIÓN 1: PENDIENTES */}
        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <FileClock className="h-5 w-5 text-emerald-600"/> Facturación Consolidada Pendiente
                </CardTitle>
                <CardDescription>Empresas con múltiples órdenes pagadas listas para un solo DTE.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="text-[10px] font-bold uppercase">Cliente</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase">Monto Acumulado</TableHead>
                            <TableHead className="text-center text-[10px] font-bold uppercase">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {groupedData.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-10 text-slate-400">No hay grupos de facturación pendientes.</TableCell></TableRow>
                    ) : (
                        groupedData.map((group: any) => (
                            <TableRow key={group.empresa?.rut} className="hover:bg-slate-50">
                                <TableCell>
                                    <div className="font-bold text-slate-700">{group.empresa?.razonSocial}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{group.empresa?.rut}</div>
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-900">
                                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(group.totalAmount)}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button 
                                        size="sm" 
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]"
                                        onClick={() => handleFacturarGrupo(group.empresa?.rut)}
                                        disabled={isProcessing === group.empresa?.rut}
                                    >
                                        {isProcessing === group.empresa?.rut ? (
                                            <Loader2 className="h-3 w-3 animate-spin mr-2"/>
                                        ) : <CheckCircle2 className="h-3 w-3 mr-2"/>}
                                        Facturar Grupo ({group.quotes.length})
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* SECCIÓN 2: HISTORIAL CON FILTRO */}
        <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <History className="h-5 w-5 text-blue-600"/> Historial de Facturas Emitidas
                    </CardTitle>
                    <CardDescription>Registro histórico de DTEs procesados por el sistema.</CardDescription>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por Folio, Empresa..."
                        className="pl-9 h-9 text-xs"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {billedHistory.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg text-slate-400">
                        No se encontraron facturas emitidas.
                    </div>
                ) : (
                    billedHistory.map((invoice: any) => (
                        <div key={invoice.folio} className="p-4 border rounded-md flex justify-between items-center bg-white hover:border-blue-200 transition-all shadow-sm">
                            <div className="flex gap-4 items-center">
                                <div className="bg-blue-50 p-2 rounded-full">
                                    <FileText className="h-5 w-5 text-blue-600"/>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-tighter">Folio SII: {invoice.folio}</span>
                                        <span className="text-[10px] text-slate-400">•</span>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {new Date(invoice.date).toLocaleDateString('es-CL')}
                                        </span>
                                    </div>
                                    <p className="font-bold text-slate-800 text-sm">{invoice.empresa?.razonSocial}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">{invoice.empresa?.rut}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Total Facturado</p>
                                    <p className="font-bold text-slate-900">
                                        {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(invoice.total)}
                                    </p>
                                </div>
                                {invoice.pdfUrl && (
                                    <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-8">
                                        <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-3.5 w-3.5 mr-2"/>
                                            VER PDF
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    </div>
  );
}
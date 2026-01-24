"use client";

import React, { useMemo, useState } from 'react';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  FileClock, 
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Eye,
  User
} from 'lucide-react';
import { emitirDTEConsolidado } from '@/server/actions/facturacionActions';
import { GeneradorPDF } from '../cotizacion/GeneradorPDF';

export function AdminFacturacionConsolidada() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [expandedRut, setExpandedRut] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<string | null>(null);

  const pendingQuery = useMemoFirebase(() => 
    query(collection(firestore, 'cotizaciones'), 
    where('status', '==', 'PAGADO')), []);
  
  const { data: quotesToBill, isLoading: isLoadingPending } = useCollection<any>(pendingQuery);

  const groupedData = useMemo(() => {
    if (!quotesToBill) return [];
    const groups: Record<string, any> = {};
    
    quotesToBill.forEach(quote => {
      if (quote.empresaData?.modalidadFacturacion === 'frecuente') {
        const rut = quote.empresaData?.rut || 'S-RUT';
        if (!groups[rut]) groups[rut] = { empresa: quote.empresaData, quotes: [], totalAmount: 0 };
        groups[rut].quotes.push(quote);
        groups[rut].totalAmount += (quote.total || 0);
      }
    });
    
    return Object.values(groups).filter((g: any) => g.quotes.length > 0);
  }, [quotesToBill]);

  const handleAnularOrden = async (id: string) => {
    if (!confirm("¿Desea anular esta orden? Se quitará de la facturación.")) return;
    try {
        await updateDoc(doc(firestore, 'cotizaciones', id), { 
            status: 'ANULADA'
        });
        toast({ title: "Orden Anulada" });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  /**
   * ACCIÓN: VER PDF DE LA ORDEN INDIVIDUAL
   */
  const handleVerPDF = async (quote: any) => {
    setIsGeneratingPDF(quote.id);
    try {
        const blob = await GeneradorPDF.generar(quote);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    } catch (error) {
        toast({ variant: "destructive", title: "Error al generar PDF" });
    } finally {
        setIsGeneratingPDF(null);
    }
  };
  
  const handleFacturarGrupo = async (rut: string) => {
    if (!confirm("¿Confirma la facturación de estas órdenes?")) return;
    setIsProcessing(rut);
    try {
        const result = await emitirDTEConsolidado(rut);
        if (result.success) {
            toast({ title: "Facturación Exitosa", description: `Folio ${result.folio} generado.` });
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsProcessing(null);
    }
  };

  if (isLoadingPending) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-slate-300" /></div>;
  }

  return (
    <div className='space-y-8 container mx-auto p-4 max-w-6xl pb-20'>
        <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black italic uppercase text-slate-800">Facturación Consolidada</h1>
            <p className="text-slate-500">Gestión de órdenes acumuladas para clientes frecuentes.</p>
        </div>

        <Card className="border-none shadow-xl bg-white">
            <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <FileClock className="h-4 w-4"/> Grupos Pendientes
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Cliente</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase">Órdenes</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase">Monto Total</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {groupedData.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-300 font-bold uppercase text-[10px]">No hay órdenes frecuentes pendientes</TableCell></TableRow>
                    ) : (
                        groupedData.map((group: any) => (
                            <React.Fragment key={group.empresa?.rut}>
                                <TableRow className="hover:bg-slate-50 border-b-0">
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => setExpandedRut(expandedRut === group.empresa?.rut ? null : group.empresa?.rut)}>
                                            {expandedRut === group.empresa?.rut ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                                        </Button>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-bold text-slate-700">{group.empresa?.razonSocial}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{group.empresa?.rut}</div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">{group.quotes.length}</span>
                                    </TableCell>
                                    <TableCell className="text-right font-black text-emerald-600">
                                        ${group.totalAmount.toLocaleString('es-CL')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            size="sm" 
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9"
                                            onClick={() => handleFacturarGrupo(group.empresa?.rut)}
                                            disabled={!!isProcessing}
                                        >
                                            {isProcessing === group.empresa?.rut ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <CheckCircle2 className="h-4 w-4 mr-2"/>}
                                            FACTURAR ORDENES
                                        </Button>
                                    </TableCell>
                                </TableRow>

                                {expandedRut === group.empresa?.rut && (
                                    <TableRow className="bg-slate-50/50">
                                        <TableCell colSpan={5} className="p-4">
                                            <div className="border rounded bg-white p-2 shadow-inner">
                                                <div className="text-[9px] font-bold text-slate-400 mb-2 uppercase px-2">Desglose de Órdenes Pendientes</div>
                                                {group.quotes.map((q: any) => (
                                                    <div key={q.id} className="flex items-center justify-between p-2 border-b last:border-0 hover:bg-slate-50 transition-colors">
                                                        <div className="flex gap-4 items-center">
                                                            <span className="font-mono text-[10px] text-slate-400">#{q.id.slice(-6).toUpperCase()}</span>
                                                            <span className="font-bold text-xs text-slate-600">
                                                                <User className="inline h-3 w-3 mr-1 text-slate-400"/>
                                                                {q.solicitudesData?.[0]?.trabajador?.nombre || 'S/N'} 
                                                                {q.solicitudesData?.length > 1 ? ` (+${q.solicitudesData.length - 1} más)` : ''}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-emerald-600 text-xs mr-4">${(q.total || 0).toLocaleString('es-CL')}</span>
                                                            
                                                            {/* BOTÓN VER PDF */}
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-7 w-7 text-blue-500 hover:bg-blue-50" 
                                                                onClick={() => handleVerPDF(q)}
                                                                disabled={isGeneratingPDF === q.id}
                                                            >
                                                                {isGeneratingPDF === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Eye className="h-3.5 w-3.5"/>}
                                                            </Button>

                                                            {/* BOTÓN ANULAR */}
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50" 
                                                                onClick={() => handleAnularOrden(q.id)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5"/>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        ))
                    )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
"use client";

import React, { useMemo, useState } from 'react';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileClock, CheckCircle2, ChevronDown, ChevronUp, Trash2, Eye, User } from 'lucide-react';
import { emitirDTEConsolidado } from '@/server/actions/facturacionActions';
import { GeneradorPDF } from '../cotizacion/GeneradorPDF';

export function AdminFacturacionConsolidada() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [expandedRut, setExpandedRut] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<string | null>(null);

  const pendingQuery = useMemoFirebase(() => query(collection(firestore, 'cotizaciones'), where('status', '==', 'PAGADO')), []);
  const { data: quotesToBill, isLoading } = useCollection<any>(pendingQuery);

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

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-slate-300" /></div>;

  return (
    <div className='space-y-8 container mx-auto p-4 max-w-6xl pb-20'>
        {/* TÍTULO ESTANDARIZADO */}
        <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Facturación Consolidada</h1>
        
        <Card className="border-none shadow-xl bg-white">
            <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2">
                    <FileClock className="h-4 w-4"/> Grupos de Clientes Frecuentes
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Cliente</TableHead>
                            <TableHead className="text-center text-[10px] font-bold uppercase">Órdenes</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase">Monto Total</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groupedData.map((group: any) => (
                            <React.Fragment key={group.empresa?.rut}>
                                <TableRow>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => setExpandedRut(expandedRut === group.empresa?.rut ? null : group.empresa?.rut)}>
                                            {expandedRut === group.empresa?.rut ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                                        </Button>
                                    </TableCell>
                                    <TableCell><div className="font-bold text-slate-700">{group.empresa?.razonSocial}</div></TableCell>
                                    <TableCell className="text-center"><Badge variant="secondary">{group.quotes.length}</Badge></TableCell>
                                    <TableCell className="text-right font-bold text-emerald-600">${group.totalAmount.toLocaleString('es-CL')}</TableCell>
                                    <TableCell className="text-right">
                                        <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold" onClick={async () => {
                                            if(confirm("¿Facturar grupo?")) {
                                                setIsProcessing(group.empresa?.rut);
                                                try { await emitirDTEConsolidado(group.empresa?.rut); toast({title: "DTE Emitido"}); } catch(e: any) { toast({title: "Error", variant: "destructive"}); }
                                                setIsProcessing(null);
                                            }
                                        }} disabled={!!isProcessing}>Facturar</Button>
                                    </TableCell>
                                </TableRow>
                                {expandedRut === group.empresa?.rut && (
                                    <TableRow><TableCell colSpan={5} className="p-4 bg-slate-50/30">
                                        {group.quotes.map((q: any) => (
                                            <div key={q.id} className="flex justify-between p-2 border-b last:border-0 bg-white items-center">
                                                <span className="text-xs font-bold text-slate-600">{q.solicitudesData?.[0]?.trabajador?.nombre || 'S/N'}</span>
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" onClick={async () => { const blob = await GeneradorPDF.generar(q); window.open(URL.createObjectURL(blob), '_blank'); }}><Eye className="h-4 w-4"/></Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={async () => { if(confirm("¿Eliminar?")) await deleteDoc(doc(firestore, 'cotizaciones', q.id!)); }}><Trash2 className="h-4 w-4"/></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </TableCell></TableRow>
                                )}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
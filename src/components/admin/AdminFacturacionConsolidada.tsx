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
import { Loader2, FileClock, ChevronDown, ChevronUp, Trash2, Eye, User, Download } from 'lucide-react';
import { emitirDTEConsolidado } from '@/server/actions/facturacionActions';
import { GeneradorPDF } from '../cotizacion/GeneradorPDF';

export function AdminFacturacionConsolidada() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [expandedRut, setExpandedRut] = useState<string | null>(null);

  const pendingQuery = useMemoFirebase(() => query(collection(firestore, 'cotizaciones'), where('status', '==', 'PAGADO')), []);
  const { data: quotesToBill, isLoading, refetch } = useCollection<any>(pendingQuery);

  const groupedData = useMemo(() => {
    if (!quotesToBill) return [];
    const groups: Record<string, any> = {};
    quotesToBill.forEach(quote => {
      const modalidad = (quote.empresaData?.modalidadFacturacion || '').toLowerCase();
      if (modalidad === 'frecuente') {
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
    <div className='space-y-8 container mx-auto p-4 max-w-6xl pb-20 text-left'>
        <h1 className="text-2xl font-black uppercase text-slate-800 tracking-tighter italic">Facturación Consolidada</h1>
        <Card className="border-none shadow-xl bg-white overflow-hidden rounded-xl">
            <CardHeader className="bg-[#0a0a4d] text-white">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileClock className="h-4 w-4 text-blue-400"/> Cartera de Clientes Frecuentes
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-900">
                        <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-white tracking-widest">Empresa Cliente</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase text-white tracking-widest">Órdenes</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase text-white tracking-widest">Monto Acumulado</TableHead>
                            <TableHead className="text-right px-6 text-[10px] font-black uppercase text-white tracking-widest">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groupedData.map((group: any) => (
                            <React.Fragment key={group.empresa?.rut}>
                                <TableRow className="hover:bg-slate-50 border-slate-100">
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => setExpandedRut(expandedRut === group.empresa?.rut ? null : group.empresa?.rut)}>
                                            {expandedRut === group.empresa?.rut ? <ChevronUp className="h-4 w-4 text-blue-600"/> : <ChevronDown className="h-4 w-4 text-slate-400"/>}
                                        </Button>
                                    </TableCell>
                                    <TableCell><div className="font-black text-slate-700 uppercase text-xs">{group.empresa?.razonSocial}</div></TableCell>
                                    <TableCell className="text-center"><Badge className="bg-slate-100 text-slate-600 font-black text-[10px]">{group.quotes.length}</Badge></TableCell>
                                    <TableCell className="text-right font-black text-emerald-600 text-xs">${group.totalAmount.toLocaleString('es-CL')}</TableCell>
                                    <TableCell className="text-right px-6">
                                        <Button 
                                            className="bg-emerald-600 hover:bg-emerald-700 font-black text-[10px] uppercase tracking-widest h-9 px-6" 
                                            disabled={!!isProcessing}
                                            onClick={async () => {
                                                if(confirm(`¿Emitir factura agrupada para ${group.empresa?.razonSocial}?`)) {
                                                    setIsProcessing(group.empresa?.rut);
                                                    const res = await emitirDTEConsolidado(group.empresa?.rut);
                                                    if(res.success) { toast({title: "Factura Emitida", description: `Folio: ${res.folio}`}); refetch(); }
                                                    else { toast({title: "Error", variant: "destructive", description: res.error}); }
                                                    setIsProcessing(null);
                                                }
                                            }}
                                        >
                                            {isProcessing === group.empresa?.rut ? <Loader2 className="h-4 w-4 animate-spin"/> : "Facturar Grupo"}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                {expandedRut === group.empresa?.rut && (
                                    <TableRow><TableCell colSpan={5} className="p-4 bg-slate-50/50">
                                        <div className="space-y-2">
                                            {group.quotes.map((q: any) => (
                                                <div key={q.id} className="flex justify-between p-3 border rounded-lg bg-white items-center shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-[10px] font-mono font-black text-blue-600">#{q.id.slice(-6).toUpperCase()}</span>
                                                        <span className="text-xs font-black text-slate-600 uppercase">{q.solicitudesData?.[0]?.trabajador?.nombre || 'S/N'}</span>
                                                        <Badge variant="outline" className="bg-white text-slate-400 text-[9px] font-black border-slate-200">
                                                            <User className="w-2.5 h-2.5 mr-1"/> {q.solicitudesData?.length || 0} PACIENTES
                                                        </Badge>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="ghost" size="icon" title="Ver Pack Completo" className="h-8 w-8 text-slate-400" onClick={async () => { const blob = await GeneradorPDF.generar(q); window.open(URL.createObjectURL(blob), '_blank'); }}><Eye className="h-4 w-4"/></Button>
                                                        <Button variant="ghost" size="icon" title="Descargar Órdenes Médicas" className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100" onClick={async () => { 
                                                            const blob = await GeneradorPDF.generar(q, true, true);
                                                            const url = window.URL.createObjectURL(blob);
                                                            const a = document.createElement('a'); a.href = url; a.download = `ORDENES-${q.id.slice(-6).toUpperCase()}.pdf`; a.click();
                                                        }}><Download className="h-4 w-4"/></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-300 hover:text-red-600" onClick={async () => { if(confirm("¿Eliminar orden del grupo?")) { await deleteDoc(doc(firestore, 'cotizaciones', q.id!)); refetch(); } }}><Trash2 className="h-4 w-4"/></Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
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
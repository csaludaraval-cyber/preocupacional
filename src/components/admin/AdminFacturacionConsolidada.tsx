"use client";

import React, { useMemo, useState } from 'react';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // <--- IMPORTACIÓN CORREGIDA
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

  // QUERY: Órdenes en estado PAGADO listas para consolidar
  const pendingQuery = useMemoFirebase(() => 
    query(collection(firestore, 'cotizaciones'), 
    where('status', '==', 'PAGADO')), []);
  
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

  /**
   * ACCIÓN: ELIMINAR ORDEN DEL GRUPO (Borrado físico)
   */
  const handleAnular = async (id: string) => {
    if (!confirm("¿Eliminar esta orden de la facturación?")) return;
    try {
        await deleteDoc(doc(firestore, 'cotizaciones', id));
        toast({ title: "Orden Eliminada de la bolsa" });
    } catch (e: any) { 
        toast({ variant: "destructive", title: "Error al eliminar" }); 
    }
  };

  /**
   * ACCIÓN: VISTA PREVIA PDF
   */
  const handleVerPDF = async (quote: any) => {
    setIsGeneratingPDF(quote.id);
    try {
        const blob = await GeneradorPDF.generar(quote);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    } catch (e) {
        toast({ variant: "destructive", title: "Error al generar vista previa" });
    } finally { 
        setIsGeneratingPDF(null); 
    }
  };

  /**
   * ACCIÓN: FACTURAR TODO EL GRUPO (Producción)
   */
  const handleFacturarGrupo = async (rut: string) => {
    if (!confirm("¿Confirma la facturación masiva de estas órdenes?")) return;
    setIsProcessing(rut);
    try {
        const result = await emitirDTEConsolidado(rut);
        if (result.success) {
            toast({ title: "Facturación Exitosa", description: `DTE Folio ${result.folio} emitido.` });
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Fallo en Lioren", description: error.message });
    } finally {
        setIsProcessing(null);
    }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-slate-300" /></div>;

  return (
    <div className='space-y-8 container mx-auto p-4 max-w-6xl pb-20'>
        <h1 className="text-3xl font-black italic uppercase text-slate-800 tracking-tighter">Facturación Consolidada</h1>
        
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
                            <TableHead className="text-[10px] font-black uppercase">Cliente</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase">Órdenes</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase">Monto Acumulado</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groupedData.map((group: any) => (
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
                                        <Badge variant="secondary" className="font-bold">{group.quotes.length}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-black text-emerald-600">
                                        ${group.totalAmount.toLocaleString('es-CL')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4" 
                                            onClick={() => handleFacturarGrupo(group.empresa?.rut)} 
                                            disabled={!!isProcessing}
                                        >
                                            {isProcessing === group.empresa?.rut ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <CheckCircle2 className="h-4 w-4 mr-2"/>}
                                            FACTURAR ORDENES
                                        </Button>
                                    </TableCell>
                                </TableRow>

                                {expandedRut === group.empresa?.rut && (
                                    <TableRow className="bg-slate-50/30">
                                        <TableCell colSpan={5} className="p-4">
                                            <div className="border rounded-lg bg-white shadow-inner divide-y">
                                                <div className="p-2 bg-slate-50 text-[9px] font-bold text-slate-400 uppercase">Detalle de órdenes del grupo</div>
                                                {group.quotes.map((q: any) => (
                                                    <div key={q.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                                                        <div className="flex gap-4 items-center">
                                                            <span className="font-mono text-[10px] text-slate-300">#{q.id.slice(-6).toUpperCase()}</span>
                                                            <span className="font-bold text-xs text-slate-600 flex items-center gap-2">
                                                                <User className="h-3 w-3 text-slate-300"/>
                                                                {q.solicitudesData?.[0]?.trabajador?.nombre || 'S/N'}
                                                                {q.solicitudesData?.length > 1 && <span className="text-slate-400 font-normal">(+{q.solicitudesData.length - 1})</span>}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-emerald-600 text-xs">${(q.total || 0).toLocaleString('es-CL')}</span>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50" onClick={() => handleVerPDF(q)} disabled={isGeneratingPDF === q.id}>
                                                                {isGeneratingPDF === q.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Eye className="h-4 w-4"/>}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50" onClick={() => handleAnular(q.id)}>
                                                                <Trash2 className="h-4 w-4"/>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                    </TableRow>
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
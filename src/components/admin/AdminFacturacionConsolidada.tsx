"use client";

import React, { useMemo, useState } from 'react';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  User
} from 'lucide-react';
import { emitirDTEConsolidado } from '@/server/actions/facturacionActions';

export function AdminFacturacionConsolidada() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [expandedRut, setExpandedRut] = useState<string | null>(null);

  // QUERY: Buscamos órdenes PAGADAS (listas para facturar)
  const pendingQuery = useMemoFirebase(() => 
    query(collection(firestore, 'cotizaciones'), 
    where('status', '==', 'PAGADO')), []);
  
  const { data: quotesToBill, isLoading: isLoadingPending } = useCollection<any>(pendingQuery);

  const groupedData = useMemo(() => {
    if (!quotesToBill) return [];
    const groups: Record<string, any> = {};
    
    quotesToBill.forEach(quote => {
      // Solo consolidamos si es modalidad frecuente
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
   * ACCIÓN: ANULAR UNA ORDEN INDIVIDUAL
   */
  const handleAnularOrden = async (id: string) => {
    if (!confirm("¿Desea anular esta orden? Se quitará de la facturación consolidada.")) return;
    try {
        await updateDoc(doc(firestore, 'cotizaciones', id), { 
            status: 'ANULADA',
            motivoAnulacion: 'Retirada de consolidación por admin'
        });
        toast({ title: "Orden Anulada", description: "La orden ha sido retirada del grupo." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };
  
  const handleFacturarGrupo = async (rut: string) => {
    if (!confirm("¿Confirma la emisión del DTE consolidado para este grupo?")) return;
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

  if (authLoading || isLoadingPending) {
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
                        <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-300 font-bold uppercase text-[10px]">No hay órdenes frecuentes pendientes de facturar</TableCell></TableRow>
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
                                        {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(group.totalAmount)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            size="sm" 
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9"
                                            onClick={() => handleFacturarGrupo(group.empresa?.rut)}
                                            disabled={!!isProcessing}
                                        >
                                            {isProcessing === group.empresa?.rut ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2"/>
                                            ) : <CheckCircle2 className="h-4 w-4 mr-2"/>}
                                            EMITIR DTE CONSOLIDADO
                                        </Button>
                                    </TableCell>
                                </TableRow>

                                {/* DESGLOSE DE ÓRDENES */}
                                {expandedRut === group.empresa?.rut && (
                                    <TableRow className="bg-slate-50/50">
                                        <TableCell colSpan={5} className="p-4">
                                            <div className="border rounded-lg bg-white overflow-hidden shadow-inner">
                                                <Table>
                                                    <TableHeader className="bg-slate-100">
                                                        <TableRow>
                                                            <TableHead className="text-[9px] font-bold">FECHA</TableHead>
                                                            <TableHead className="text-[9px] font-bold">ID ORDEN</TableHead>
                                                            <TableHead className="text-[9px] font-bold">TRABAJADORES</TableHead>
                                                            <TableHead className="text-right text-[9px] font-bold">MONTO</TableHead>
                                                            <TableHead className="text-right text-[9px] font-bold">QUITAR</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {group.quotes.map((q: any) => (
                                                            <TableRow key={q.id}>
                                                                <TableCell className="text-[10px]">{q.fechaCreacion?.seconds ? new Date(q.fechaCreacion.seconds * 1000).toLocaleDateString('es-CL') : 'N/A'}</TableCell>
                                                                <TableCell className="font-mono text-[10px] font-bold">#{q.id.slice(-6).toUpperCase()}</TableCell>
                                                                <TableCell>
                                                                    <div className="flex gap-1">
                                                                        {q.solicitudesData?.map((s: any, i: number) => (
                                                                            <Badge key={i} variant="outline" className="text-[9px] py-0 h-4"><User className="w-2 h-2 mr-1"/>{s.trabajador.nombre.split(' ')[0]}</Badge>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right text-[10px] font-bold">${(q.total || 0).toLocaleString('es-CL')}</TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500" onClick={() => handleAnularOrden(q.id)}>
                                                                        <Trash2 className="h-3 w-3"/>
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
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
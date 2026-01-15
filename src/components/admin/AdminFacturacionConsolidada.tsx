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
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  FileClock, 
  CheckCircle2
} from 'lucide-react';
import { emitirDTEConsolidado } from '@/server/actions/facturacionActions';

export function AdminFacturacionConsolidada() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // QUERY PENDIENTES (La lógica nuclear arreglada)
  const pendingQuery = useMemoFirebase(() => 
    query(collection(firestore, 'cotizaciones'), 
    where('status', 'in', ['PAGADO', 'orden_examen_enviada', 'CORREO_ENVIADO', 'CONFIRMADA'])), []);
  
  const { data: quotesToBill, isLoading: isLoadingPending, refetch: refetchPending } = useCollection<any>(pendingQuery);

  const groupedData = useMemo(() => {
    if (!quotesToBill) return [];
    const groups: Record<string, any> = {};
    
    quotesToBill.forEach(quote => {
      // Filtro de negocio: PAGADO o Frecuente
      if (quote.status === 'PAGADO' || quote.empresaData?.modalidadFacturacion === 'frecuente') {
        const rut = quote.empresaData?.rut || 'S-RUT';
        if (!groups[rut]) groups[rut] = { empresa: quote.empresaData, quotes: [], totalAmount: 0 };
        groups[rut].quotes.push(quote);
        groups[rut].totalAmount += (quote.total || 0);
      }
    });
    
    return Object.values(groups).filter((g: any) => g.quotes.length > 0);
  }, [quotesToBill]);
  
  const handleFacturarGrupo = async (rut: string) => {
    if (!confirm("¿Confirma la emisión del DTE consolidado para este grupo?")) return;
    setIsProcessing(rut);
    try {
        const result = await emitirDTEConsolidado(rut);
        if (result.success) {
            toast({ title: "Facturación Exitosa", description: `Folio ${result.folio} generado.` });
            await refetchPending();
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
    <div className='space-y-8 container mx-auto p-4 max-w-6xl'>
        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <FileClock className="h-5 w-5 text-emerald-600"/> Facturación Consolidada Pendiente
                </CardTitle>
                <CardDescription>Clientes con múltiples órdenes listas para un solo DTE.</CardDescription>
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
                        <TableRow><TableCell colSpan={3} className="text-center py-10 text-slate-400 font-bold uppercase text-[10px]">No hay grupos pendientes</TableCell></TableRow>
                    ) : (
                        groupedData.map((group: any) => (
                            <TableRow key={group.empresa?.rut} className="hover:bg-slate-50">
                                <TableCell>
                                    <div className="font-bold text-slate-700">{group.empresa?.razonSocial}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{group.empresa?.rut}</div>
                                </TableCell>
                                <TableCell className="text-right font-bold text-emerald-700">
                                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(group.totalAmount)}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button 
                                        size="sm" 
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] h-8"
                                        onClick={() => handleFacturarGrupo(group.empresa?.rut)}
                                        disabled={!!isProcessing}
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
    </div>
  );
}
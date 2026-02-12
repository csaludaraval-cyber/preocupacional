"use client";

import React, { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Wallet, Landmark, CalendarSearch } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminBalance() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const balanceQuery = useMemoFirebase(() => 
    query(collection(firestore, 'cotizaciones'), where('status', 'in', ['PAGADO', 'FACTURADO'])), []
  );

  const { data: quotes, isLoading } = useCollection<any>(balanceQuery);

  const stats = useMemo(() => {
    if (!quotes) return { pending: 0, invoiced: 0, byCompany: [] };
    let totalPending = 0;
    let totalInvoiced = 0;
    const companyMap: Record<string, any> = {};

    quotes.forEach(q => {
      const date = q.fechaCreacion?.seconds ? new Date(q.fechaCreacion.seconds * 1000) : new Date();
      if (date.getMonth().toString() === selectedMonth && date.getFullYear().toString() === selectedYear) {
        const amount = Number(q.total) || 0;
        if (q.status === 'PAGADO' && q.empresaData?.modalidadFacturacion === 'frecuente') {
          totalPending += amount;
          const rut = q.empresaData?.rut || 'S/R';
          if (!companyMap[rut]) companyMap[rut] = { name: q.empresaData?.razonSocial, amount: 0, count: 0 };
          companyMap[rut].amount += amount;
          companyMap[rut].count += 1;
        }
        if (q.status === 'FACTURADO') totalInvoiced += amount;
      }
    });
    return { pending: totalPending, invoiced: totalInvoiced, byCompany: Object.values(companyMap).sort((a, b) => b.amount - a.amount) };
  }, [quotes, selectedMonth, selectedYear]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>;

  return (
    <div className="space-y-8 container mx-auto p-4 max-w-7xl font-sans pb-20 text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
            <h1 className="text-2xl font-black uppercase text-slate-800 italic tracking-tighter leading-none">Balance de Gestión</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Resumen de ingresos Araval</p>
        </div>
        <div className="flex gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
            <CalendarSearch className="w-4 h-4 mt-2.5 ml-2 text-slate-400" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-32 border-none font-black text-[10px] uppercase"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                        <SelectItem key={i} value={i.toString()} className="text-[10px] font-bold uppercase">{m}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-24 border-none font-black text-[10px] uppercase"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="2025" className="text-[10px] font-bold uppercase">2025</SelectItem><SelectItem value="2026" className="text-[10px] font-bold uppercase">2026</SelectItem></SelectContent>
            </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#0a0a4d] border-none shadow-2xl">
            <CardHeader className="pb-2 text-left"><CardTitle className="text-blue-300 text-[10px] font-black uppercase tracking-[0.3em]">Pendiente por Cobrar</CardTitle></CardHeader>
            <CardContent className="text-left text-white">
                <p className="text-4xl font-black italic tracking-tighter">{formatCurrency(stats.pending)}</p>
                <div className="mt-4"><Badge className="bg-blue-600 text-white border-none font-black text-[9px] uppercase">{stats.byCompany.length} Empresas</Badge></div>
            </CardContent>
        </Card>
        <Card className="bg-white border-none shadow-2xl border-l-4 border-emerald-500">
            <CardHeader className="pb-2 text-left"><CardTitle className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Total Facturado Mes</CardTitle></CardHeader>
            <CardContent className="text-left text-slate-800"><p className="text-4xl font-black italic tracking-tighter">{formatCurrency(stats.invoiced)}</p></CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-xl">
        <CardHeader className="bg-slate-50 border-b text-left"><CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> Detalle de Cartera</CardTitle></CardHeader>
        <CardContent className="p-0">
            {stats.byCompany.length > 0 ? (
                <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="font-black text-[10px] uppercase py-4 px-6 text-left">Empresa Cliente</TableHead>
                        <TableHead className="text-center font-black text-[10px] uppercase">Órdenes</TableHead>
                        <TableHead className="text-right font-black text-[10px] uppercase px-6">Monto Acumulado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.byCompany.map((company: any, i) => (
                            <TableRow key={i} className="hover:bg-blue-50/30 transition-colors">
                                <TableCell className="font-black text-slate-700 uppercase text-xs px-6 py-4 text-left">{company.name}</TableCell>
                                <TableCell className="text-center"><Badge variant="outline" className="font-black text-blue-600 border-blue-100 bg-blue-50 px-3">{company.count} Órdenes</Badge></TableCell>
                                <TableCell className="text-right font-black text-slate-900 text-sm px-6">{formatCurrency(company.amount)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="py-20 text-center text-slate-400 text-[10px] font-black uppercase opacity-50">No hay datos para este mes</div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
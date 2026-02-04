'use client';

import React, { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import type { CotizacionFirestore } from '@/lib/types';
import { Loader2, Calendar, Search, MapPin, Mail, Clock, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from '@/components/ui/date-picker';
import { DetalleClinicoModal } from './DetalleClinicoModal';
import { isToday, isThisWeek, isThisMonth, parseISO, format } from 'date-fns';

export function MedicoDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedQuote, setSelectedQuote] = useState<CotizacionFirestore | null>(null);

  const medicoQuery = useMemoFirebase(() => 
    query(collection(firestore, 'cotizaciones'), where('status', 'in', ['PAGADO', 'FACTURADO'])), []
  );

  const { data: cotizaciones, isLoading } = useCollection<CotizacionFirestore>(medicoQuery);

  const getAtencionDate = (q: CotizacionFirestore) => {
    const fechaStr = q.solicitudesData?.[0]?.trabajador?.fechaAtencion;
    return fechaStr ? parseISO(fechaStr) : null;
  };

  const filteredData = useMemo(() => {
    if (!cotizaciones) return { hoy: [], semana: [], mes: [] };

    const sortedBase = [...cotizaciones].sort((a, b) => {
      const dateA = getAtencionDate(a)?.getTime() || 0;
      const dateB = getAtencionDate(b)?.getTime() || 0;
      return dateA - dateB;
    });

    const baseFilter = sortedBase.filter(q => {
      const matchEmpresa = (q.empresaData?.razonSocial || '').toLowerCase().includes(searchTerm.toLowerCase());
      const dateAtencion = getAtencionDate(q);
      const matchDate = selectedDate && dateAtencion 
        ? format(dateAtencion, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
        : true;
      return matchEmpresa && matchDate;
    });

    return {
      hoy: baseFilter.filter(q => { const d = getAtencionDate(q); return d ? isToday(d) : false; }),
      semana: baseFilter.filter(q => { const d = getAtencionDate(q); return d ? isThisWeek(d, { weekStartsOn: 1 }) : false; }),
      mes: baseFilter.filter(q => { const d = getAtencionDate(q); return d ? isThisMonth(d) : false; })
    };
  }, [cotizaciones, searchTerm, selectedDate]);

  const renderRows = (data: CotizacionFirestore[]) => {
    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center py-20 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
            No hay órdenes registradas
          </TableCell>
        </TableRow>
      );
    }
    return data.map((q) => (
      <TableRow key={q.id} className="hover:bg-blue-50/30 transition-colors">
        <TableCell>
          <Badge className={`uppercase text-[9px] font-bold border-none px-2 py-0.5 ${q.status === 'PAGADO' ? "bg-blue-600 text-white" : "bg-[#0a0a4d] text-white"}`}>
            {q.status}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            {getAtencionDate(q) ? format(getAtencionDate(q)!, 'dd/MM/yyyy') : 'S/F'}
          </div>
        </TableCell>
        <TableCell>
          <div className="font-bold text-slate-700 text-xs uppercase">{q.empresaData?.razonSocial}</div>
          <div className="flex items-center gap-1 text-[9px] text-slate-400">
            <MapPin className="w-3 h-3"/> {q.empresaData?.direccion}, {q.empresaData?.comuna}
          </div>
        </TableCell>
        <TableCell>
          <div className="text-[11px] font-semibold text-slate-600">{q.solicitanteData?.nombre || 'N/A'}</div>
          <div className="flex items-center gap-1 text-[9px] text-blue-500">
            <Mail className="w-3 h-3"/> {q.solicitanteData?.mail || 'S/C'}
          </div>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="outline" className="font-black border-slate-200 text-slate-600">
            {q.solicitudesData?.length || 0}
          </Badge>
        </TableCell>
        <TableCell className="text-right px-6">
          <Button size="sm" variant="ghost" className="text-blue-600 font-bold text-[10px] hover:bg-blue-50" onClick={() => setSelectedQuote(q)}>
            VER NÓMINA
          </Button>
        </TableCell>
      </TableRow>
    ));
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-transparent">
        <CardHeader className="px-0 pt-0">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600"/>
              <div className="text-left">
                <CardTitle className="text-lg font-bold uppercase text-slate-800 tracking-tighter">Hoja de Ruta Médica</CardTitle>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Panel Operativo de Laboratorio</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-grow lg:flex-none lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Buscar Empresa..." className="pl-9 bg-slate-50 border-slate-200 h-10 text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                <Filter className="w-4 h-4 ml-2 text-slate-400" />
                <DatePicker value={selectedDate} onSelect={setSelectedDate} />
                {selectedDate && <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setSelectedDate(undefined)}><Clock className="h-4 w-4"/></Button>}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs defaultValue="hoy" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-[#0a0a4d] p-0 h-12 rounded-lg border-none shadow-md overflow-hidden">
              <TabsTrigger value="hoy" className="h-full rounded-none text-[11px] font-bold uppercase transition-all text-white/65 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Ords. Día ({filteredData.hoy.length})
              </TabsTrigger>
              <TabsTrigger value="semana" className="h-full rounded-none text-[11px] font-bold uppercase transition-all text-white/65 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Ords. Semana ({filteredData.semana.length})
              </TabsTrigger>
              <TabsTrigger value="mes" className="h-full rounded-none text-[11px] font-bold uppercase transition-all text-white/65 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Ords. Mes ({filteredData.mes.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="hoy" className="mt-0 focus-visible:outline-none">
              <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-[10px] uppercase py-4">Estado</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase">Atención</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase">Empresa / Dirección</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase">Solicitante</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-center">Pacientes</TableHead>
                      <TableHead className="text-right font-bold text-[10px] uppercase px-6">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{renderRows(filteredData.hoy)}</TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="semana" className="mt-0 focus-visible:outline-none">
              <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-[10px] uppercase py-4">Estado</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase">Atención</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase">Empresa / Dirección</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase">Solicitante</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-center">Pacientes</TableHead>
                      <TableHead className="text-right font-bold text-[10px] uppercase px-6">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{renderRows(filteredData.semana)}</TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="mes" className="mt-0 focus-visible:outline-none">
              <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-[10px] uppercase py-4">Estado</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase">Atención</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase">Empresa / Dirección</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase">Solicitante</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-center">Pacientes</TableHead>
                      <TableHead className="text-right font-bold text-[10px] uppercase px-6">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{renderRows(filteredData.mes)}</TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          <div className="sr-only">
              <DialogHeader>
                <DialogTitle>Detalle Clínico</DialogTitle>
                <DialogDescription>Listado de trabajadores</DialogDescription>
              </DialogHeader>
          </div>
          {selectedQuote && <DetalleClinicoModal quote={selectedQuote} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
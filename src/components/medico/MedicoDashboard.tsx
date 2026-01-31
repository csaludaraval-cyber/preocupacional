'use client';

import React, { useMemo, useState } from 'react';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import type { CotizacionFirestore } from '@/lib/types';
import { Loader2, Calendar, Search, Trash2, ChevronRight, MapPin, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DetalleClinicoModal } from './DetalleClinicoModal';

const getMs = (ts: any): number => {
  if (!ts) return Date.now();
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return new Date(ts).getTime() || Date.now();
};

export function MedicoDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<CotizacionFirestore | null>(null);

  const medicoQuery = useMemoFirebase(() => 
    query(collection(firestore, 'cotizaciones'), where('status', 'in', ['PAGADO', 'FACTURADO'])), []
  );

  const { data: cotizaciones, isLoading } = useCollection<CotizacionFirestore>(medicoQuery);

  const filtered = useMemo(() => {
    if (!cotizaciones) return [];
    return cotizaciones.filter(q => (q.empresaData?.razonSocial || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [cotizaciones, searchTerm]);

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white rounded-t-xl">
          <CardTitle className="text-2xl font-bold uppercase text-slate-800 tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600"/> Hoja de Ruta Médica
          </CardTitle>
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Buscar Empresa..." className="pl-9 bg-slate-50 border-none h-11" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-[10px] uppercase">Estado</TableHead>
                <TableHead className="font-bold text-[10px] uppercase">Empresa / Dirección</TableHead>
                <TableHead className="font-bold text-[10px] uppercase">Solicitante</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-center">Pacientes</TableHead>
                <TableHead className="text-right font-bold text-[10px] uppercase">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((q) => (
                <TableRow key={q.id} className="hover:bg-blue-50/50 transition-colors">
                  <TableCell><Badge className={q.status === 'PAGADO' ? "bg-amber-500" : "bg-emerald-500"}>{q.status}</Badge></TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-700 text-sm">{q.empresaData?.razonSocial}</div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <MapPin className="w-3 h-3"/> {q.empresaData?.direccion}, {q.empresaData?.comuna}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-slate-600">{q.solicitanteData?.nombre || 'N/A'}</div>
                    <div className="flex items-center gap-1 text-[10px] text-blue-500">
                        <Mail className="w-3 h-3"/> {q.solicitanteData?.mail || 'S/C'}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-black">{q.solicitudesData?.length || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="text-blue-600 font-bold" onClick={() => setSelectedQuote(q)}>VER NÓMINA</Button>
                        <Button size="icon" variant="ghost" className="text-slate-300 hover:text-red-500" onClick={async () => { if(confirm("¿Eliminar?")) await deleteDoc(doc(firestore, 'cotizaciones', q.id!)); }}><Trash2 className="h-4 w-4"/></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          {selectedQuote && <DetalleClinicoModal quote={selectedQuote} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
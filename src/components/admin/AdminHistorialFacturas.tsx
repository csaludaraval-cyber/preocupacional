"use client";

import React, { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  FileText, 
  Search, 
  ExternalLink,
  List
} from 'lucide-react';

const getMs = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return new Date(ts).getTime() || 0;
};

export function AdminHistorialFacturas() {
  const [searchTerm, setSearchTerm] = useState('');

  const billedQuery = useMemoFirebase(() =>
    query(collection(firestore, 'cotizaciones'), 
    where('status', 'in', ['FACTURADO', 'facturado_lioren'])), []);

  const { data: billedQuotes, isLoading } = useCollection<any>(billedQuery);

  const billedHistory = useMemo(() => {
      if (!billedQuotes) return [];
      const historyMap: Record<string, any> = {};
      
      billedQuotes.forEach(quote => {
          const folio = quote.liorenFolio || "S-F";
          if (!historyMap[folio]) {
            historyMap[folio] = { 
                folio, 
                empresa: quote.empresaData, 
                pdfUrl: quote.liorenPdfUrl, 
                date: getMs(quote.liorenFechaEmision || quote.fechaCreacion),
                total: quote.total || 0
            };
          } else {
            historyMap[folio].total += (quote.total || 0);
          }
      });

      return Object.values(historyMap)
        .filter((inv: any) => 
            inv.empresa?.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.empresa?.rut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.folio?.toString().includes(searchTerm)
        )
        .sort((a: any, b: any) => b.date - a.date);
  }, [billedQuotes, searchTerm]);

  if (isLoading) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-slate-300" /></div>;
  }

  return (
    <div className='container mx-auto p-4 max-w-6xl'>
        <Card className="shadow-sm border-t-4 border-t-blue-600">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <List className="h-6 w-6 text-blue-600"/> Facturas Emitidas
                    </CardTitle>
                    <CardDescription>Registro histórico de todos los DTEs generados.</CardDescription>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por Folio, Empresa..."
                        className="pl-9 h-9 text-xs border-slate-300"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {billedHistory.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg text-slate-400 bg-slate-50">
                        No se encontraron facturas emitidas.
                    </div>
                ) : (
                    billedHistory.map((invoice: any) => (
                        <div key={invoice.folio} className="p-4 border rounded-md flex justify-between items-center bg-white hover:border-blue-300 transition-all shadow-sm group">
                            <div className="flex gap-4 items-center">
                                <div className="bg-blue-50 p-3 rounded-full group-hover:bg-blue-100 transition-colors">
                                    <FileText className="h-5 w-5 text-blue-600"/>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-tighter bg-blue-50 px-2 py-0.5 rounded">
                                            Folio SII: {invoice.folio}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {new Date(invoice.date).toLocaleDateString('es-CL')}
                                        </span>
                                    </div>
                                    <p className="font-bold text-slate-800 text-sm mt-1">{invoice.empresa?.razonSocial}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">{invoice.empresa?.rut}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Monto Total</p>
                                    <p className="font-bold text-slate-900 text-lg">
                                        {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(invoice.total)}
                                    </p>
                                </div>
                                {invoice.pdfUrl && (
                                    <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 shadow-sm hover:shadow-md transition-all">
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
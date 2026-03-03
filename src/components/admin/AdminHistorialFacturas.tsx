"use client";

import React, { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  FileText, 
  Search, 
  ExternalLink,
  List,
  ChevronDown,
  ChevronUp,
  Eye,
  Download,
  User
} from 'lucide-react';
import { GeneradorPDF } from '@/components/cotizacion/GeneradorPDF';

const getMs = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return new Date(ts).getTime() || 0;
};

export function AdminHistorialFacturas() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolio, setExpandedFolio] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Consulta facturas emitidas (individuales y consolidadas)
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
                total: quote.total || 0,
                quotes: [quote] // Coleccionamos las cotizaciones originales
            };
          } else {
            historyMap[folio].total += (quote.total || 0);
            historyMap[folio].quotes.push(quote);
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

  // Funciones de Auditoría Documental
  const handleViewQuote = async (q: any) => {
    setIsGenerating(q.id);
    try {
      const blob = await GeneradorPDF.generar(q, true, false);
      window.open(URL.createObjectURL(blob), '_blank');
    } finally { setIsGenerating(null); }
  };

  const handleDownloadOrders = async (q: any) => {
    setIsGenerating(q.id + "_orders");
    try {
      const blob = await GeneradorPDF.generar(q, true, true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ORDENES-${q.id.slice(-6).toUpperCase()}.pdf`;
      a.click();
    } finally { setIsGenerating(null); }
  };

  if (isLoading) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-slate-300" /></div>;
  }

  return (
    <div className='container mx-auto p-4 max-w-6xl text-left'>
        <Card className="shadow-xl border-t-4 border-t-[#0a0a4d] overflow-hidden rounded-xl bg-white">
            <CardHeader className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 pb-6 bg-slate-50/50 border-b">
                <div className="space-y-1 w-full">
                    <CardTitle className="text-xl font-black flex items-center gap-3 uppercase tracking-tighter italic">
                        <List className="h-6 w-6 text-[#0a0a4d]"/> Facturas Emitidas
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Auditoría Documental y Registro SII</CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar Folio, Empresa..."
                        className="pl-10 h-10 text-xs font-bold border-slate-200 bg-white shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {billedHistory.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                        No se encontraron registros en el historial.
                    </div>
                ) : (
                    billedHistory.map((invoice: any) => (
                        <div key={invoice.folio} className="border-b last:border-0 border-slate-100">
                            {/* Fila Principal de la Factura */}
                            <div className={`p-5 flex justify-between items-center transition-colors ${expandedFolio === invoice.folio ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}>
                                <div className="flex gap-5 items-center">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-slate-400 hover:text-[#0a0a4d]"
                                        onClick={() => setExpandedFolio(expandedFolio === invoice.folio ? null : invoice.folio)}
                                    >
                                        {expandedFolio === invoice.folio ? <ChevronUp /> : <ChevronDown />}
                                    </Button>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                                FOLIO: {invoice.folio}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold">
                                                {new Date(invoice.date).toLocaleDateString('es-CL')}
                                            </span>
                                            <Badge variant="outline" className="text-[9px] font-black bg-white">
                                                {invoice.quotes.length} ORDEN{invoice.quotes.length > 1 ? 'ES' : ''}
                                            </Badge>
                                        </div>
                                        <p className="font-black text-slate-800 text-sm mt-1 uppercase tracking-tight">{invoice.empresa?.razonSocial}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">{invoice.empresa?.rut}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Monto Facturado</p>
                                        <p className="font-black text-[#0a0a4d] text-lg leading-none">
                                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(invoice.total)}
                                        </p>
                                    </div>
                                    {invoice.pdfUrl && (
                                        <Button asChild size="sm" className="bg-[#0a0a4d] hover:bg-slate-800 text-white font-black h-10 px-6 uppercase text-[10px] tracking-widest shadow-lg italic">
                                            <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-3.5 w-3.5 mr-2"/>
                                                DTE SII
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Desglose de Auditoría (Acordeón) */}
                            {expandedFolio === invoice.folio && (
                                <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Detalle de Cotizaciones Integradas:</p>
                                        {invoice.quotes.map((q: any) => (
                                            <div key={q.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-blue-300 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[10px] font-mono font-black text-blue-600 italic bg-blue-50 px-2 py-1 rounded">#{q.id.slice(-6).toUpperCase()}</span>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-700 uppercase">{q.solicitudesData?.[0]?.trabajador?.nombre || 'S/N'}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Badge variant="outline" className="text-[8px] font-black text-slate-400 h-4">
                                                                <User className="w-2.5 h-2.5 mr-1"/> {q.solicitudesData?.length || 0} TRABAJADORES
                                                            </Badge>
                                                            <span className="text-[9px] font-bold text-slate-400">Total: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(q.total)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button 
                                                        variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-blue-600 font-bold text-[10px] uppercase"
                                                        disabled={isGenerating === q.id}
                                                        onClick={() => handleViewQuote(q)}
                                                    >
                                                        {isGenerating === q.id ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : <Eye className="h-3 w-3 mr-2"/>}
                                                        Cotización
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-emerald-600 font-bold text-[10px] uppercase bg-emerald-50/50"
                                                        disabled={isGenerating === q.id + "_orders"}
                                                        onClick={() => handleDownloadOrders(q)}
                                                    >
                                                        {isGenerating === q.id + "_orders" ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : <Download className="h-3 w-3 mr-2"/>}
                                                        Órdenes
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    </div>
  );
}
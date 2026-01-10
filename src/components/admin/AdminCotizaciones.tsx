"use client";

import React, { useMemo, useState, useRef } from 'react';
import { useCotizaciones } from '@/hooks/use-cotizaciones';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MoreVertical, FileText, Search, Mail, Receipt, Eye, Send, FlaskConical, ExternalLink } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DetalleCotizacion } from '@/components/cotizacion/DetalleCotizacion';
import { updateDoc, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { mapLegacyStatus } from '@/lib/status-mapper';
import { ejecutarFacturacionSiiV2, probarConexionLioren } from '@/server/actions/facturacionActions';
import { enviarCotizacion } from '@/ai/flows/enviar-cotizacion-flow';
import { GeneradorPDF } from '../cotizacion/GeneradorPDF';
import { Input } from '@/components/ui/input';

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function AdminCotizaciones() {
  const { quotes, isLoading, refetchQuotes } = useCotizaciones();
  const [searchTerm, setSearchTerm] = useState('');
  const [quoteToManage, setQuoteToManage] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    return quotes.filter(q => 
        q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.empresaData?.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase())
      ).sort((a:any, b:any) => (b.fechaCreacion?.seconds || 0) - (a.fechaCreacion?.seconds || 0));
  }, [quotes, searchTerm]);

  // CONSTRUCTOR INTELIGENTE DE LINK PDF
  const getPdfLink = (quote: any) => {
    if (quote.liorenPdfUrl) return quote.liorenPdfUrl;
    if (quote.liorenId) {
      return `https://cl.lioren.enterprises/empresas/araval-fisioterapia-y-medicina-spa-pruebas-api/dte/getpdf/${quote.liorenId}`;
    }
    return null;
  };

  const handleTestLioren = async () => {
    setIsProcessing("testing");
    try {
      const result = await probarConexionLioren();
      if (result.success) alert(result.message);
      else alert("Error: " + result.error);
    } catch (err: any) { alert("Error Crítico: " + err.message); }
    finally { setIsProcessing(null); }
  };

  const handleInvoiceNow = async (id: string) => {
    setIsProcessing(id);
    try {
      const result = await ejecutarFacturacionSiiV2(id);
      if (result.success) {
        toast({ title: "Facturación exitosa", description: "DTE generado. Actualizando vista..." });
        await refetchQuotes();
        setQuoteToManage(null);
      }
    } catch (err: any) { toast({ variant: 'destructive', title: "Error SII", description: err.message }); }
    finally { setIsProcessing(null); }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-6 w-6 text-slate-300" /></div>;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
        <div><h1 className="text-xl font-bold uppercase">Administración</h1><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestión DTE</p></div>
        <div className="flex items-center gap-4">
          <Button onClick={handleTestLioren} variant="outline" size="sm" className="bg-blue-600 text-white font-bold h-9" disabled={isProcessing === "testing"}><FlaskConical className="h-3.5 w-3.5 mr-2" /> PROBAR CONEXIÓN SII</Button>
          <div className="relative w-full md:w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" /><Input placeholder="Buscar..." className="pl-9 h-9 text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        </div>
      </div>

      <div className="bg-white border rounded-sm shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50"><TableRow><TableHead className="text-[10px] font-bold py-3 px-6 uppercase text-slate-500">ID</TableHead><TableHead className="text-[10px] font-bold uppercase text-slate-500">Empresa Receptora</TableHead><TableHead className="text-[10px] font-bold text-center uppercase text-slate-500">Estado</TableHead><TableHead className="text-right text-[10px] font-bold px-6 uppercase text-slate-500">Acciones</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredQuotes.map((quote) => {
              const status = mapLegacyStatus(quote.status);
              const pdfUrl = getPdfLink(quote);
              return (
                <TableRow key={quote.id} className="text-xs hover:bg-slate-50">
                  <TableCell className="font-mono font-bold px-6 text-slate-400">#{quote.id.slice(-6).toUpperCase()}</TableCell>
                  <TableCell><div className="flex flex-col"><span className="font-bold text-slate-700">{quote.empresaData?.razonSocial}</span><span className="text-[10px] text-slate-400 font-bold">{quote.empresaData?.rut}</span></div></TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Badge className={`font-bold text-[9px] uppercase px-2 py-0.5 rounded-none border-none text-white ${status === 'FACTURADO' ? 'bg-[#10b981]' : status === 'PAGADO' ? 'bg-[#1e40af]' : 'bg-[#f59e0b]'}`}>
                        {status}
                      </Badge>
                      {pdfUrl && (
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800" title="Ver Factura">
                          <FileText className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => setQuoteToManage(quote)}><Eye className="mr-2 h-3.5 w-3.5" /> Ver Detalles</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {status === 'PAGADO' && <DropdownMenuItem className="text-xs font-bold text-emerald-600" onClick={() => handleInvoiceNow(quote.id)}><FileText className="mr-2 h-3.5 w-3.5" /> Facturar Individual (SII)</DropdownMenuItem>}
                        {pdfUrl && (
                          <DropdownMenuItem className="text-xs font-bold text-blue-600 bg-blue-50" onClick={() => window.open(pdfUrl, '_blank')}>
                            <ExternalLink className="mr-2 h-3.5 w-3.5" /> VER FACTURA SII
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!quoteToManage} onOpenChange={() => setQuoteToManage(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
          {quoteToManage && (
            <div className="flex flex-col">
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center sticky top-0 z-10">
                <DialogTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cotización: {quoteToManage.id.slice(-6).toUpperCase()}</DialogTitle>
                <div className="flex gap-2">
                  {mapLegacyStatus(quoteToManage.status) === 'PAGADO' && <Button onClick={() => handleInvoiceNow(quoteToManage.id)} disabled={isProcessing === quoteToManage.id} className="text-[10px] font-bold h-8 px-4 bg-emerald-700">FACTURAR SII</Button>}
                  {getPdfLink(quoteToManage) && (
                    <Button asChild className="text-[10px] font-bold h-8 px-4 bg-blue-700">
                      <a href={getPdfLink(quoteToManage)!} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-2" /> VER FACTURA SII</a>
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-1"><DetalleCotizacion quote={quoteToManage} /></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
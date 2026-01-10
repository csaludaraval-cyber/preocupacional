"use client";

import React, { useMemo, useState, useRef } from 'react';
import { useCotizaciones } from '@/hooks/use-cotizaciones';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MoreVertical, FileText, Search, Mail, Receipt, Eye, Send, Layers, FlaskConical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DetalleCotizacion } from '@/components/cotizacion/DetalleCotizacion';
import { updateDoc, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { mapLegacyStatus } from '@/lib/status-mapper';
import { ejecutarFacturacionSiiV2, emitirDTEConsolidado, probarConexionLioren } from '@/server/actions/facturacionActions';
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

  // TEST CON ALERT PARA DEBUG DIRECTO
  const handleTestLioren = async () => {
    console.log("LOG: Clic en Test Lioren");
    setIsProcessing("testing");
    try {
      const result = await probarConexionLioren();
      console.log("LOG: Resultado del Test:", result);
      if (result.success) {
        alert(result.message); // USAMOS ALERT PARA ASEGURAR VISIBILIDAD
      } else {
        alert("Error de Conexión: " + result.error);
      }
    } catch (err: any) {
      console.error("LOG: Fallo crítico en el test:", err);
      alert("Error Crítico: " + err.message);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleInvoiceNow = async (id: string) => {
    setIsProcessing(id);
    try {
      const result = await ejecutarFacturacionSiiV2(id);
      if (result.success) {
        toast({ title: "Éxito", description: `DTE generado.` });
        await refetchQuotes();
        setQuoteToManage(null);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Error", description: err.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSendEmail = async (quote: any) => {
    const email = quote.solicitanteData?.mail || quote.solicitante?.mail;
    if (!email) return alert("Falta email de contacto");
    setIsProcessing(quote.id);
    try {
      const pdfBlob = await GeneradorPDF.generar(quote);
      const pdfBase64 = await blobToBase64(pdfBlob);
      const result = await enviarCotizacion({ clienteEmail: email, cotizacionId: quote.id.slice(-6).toUpperCase(), pdfBase64 });
      if (result.status === 'success') {
        await updateDoc(doc(firestore, 'cotizaciones', quote.id), { status: 'CORREO_ENVIADO', fechaEnvioEmail: new Date().toISOString() });
        toast({ title: "Enviado", description: "Cotización enviada." });
        refetchQuotes();
        setQuoteToManage(null);
      }
    } catch (err: any) { alert("Error Envío: " + err.message); }
    finally { setIsProcessing(null); }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-6 w-6 text-slate-300" /></div>;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
        <div><h1 className="text-xl font-bold uppercase">Administración</h1><p className="text-[10px] text-slate-400 font-bold uppercase">Gestión DTE</p></div>
        <div className="flex items-center gap-4">
          <Button onClick={handleTestLioren} variant="outline" size="sm" className="bg-blue-600 text-white font-bold hover:bg-blue-700" disabled={isProcessing === "testing"}>
            {isProcessing === "testing" ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <FlaskConical className="h-3.5 w-3.5 mr-2" />} 
            PROBAR CONEXIÓN SII
          </Button>
          <div className="relative w-full md:w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" /><Input placeholder="Buscar..." className="pl-9 h-9 text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        </div>
      </div>

      <div className="bg-white border rounded-sm shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50"><TableRow><TableHead className="text-[10px] font-bold py-3 px-6">ID</TableHead><TableHead className="text-[10px] font-bold">Empresa Receptora</TableHead><TableHead className="text-[10px] font-bold text-center">Estado</TableHead><TableHead className="text-right text-[10px] font-bold px-6">Acciones</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredQuotes.map((quote) => {
              const status = mapLegacyStatus(quote.status);
              const pdfUrl = quote.liorenPdfUrl || (quote as any).liorenPdfUrl;
              return (
                <TableRow key={quote.id} className="text-xs hover:bg-slate-50 transition-colors">
                  <TableCell className="font-mono font-bold px-6 text-slate-400">#{quote.id.slice(-6).toUpperCase()}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">{quote.empresaData?.razonSocial}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{quote.empresaData?.rut}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`font-bold text-[9px] uppercase px-2 py-0.5 rounded-none border-none text-white ${status === 'FACTURADO' ? 'bg-emerald-500' : status === 'PAGADO' ? 'bg-blue-700' : 'bg-amber-500'}`}>
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => setQuoteToManage(quote)}><Eye className="mr-2 h-3.5 w-3.5" /> Ver Detalles</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {status === 'PAGADO' && <DropdownMenuItem className="text-emerald-600 font-bold" onClick={() => handleInvoiceNow(quote.id)}><FileText className="mr-2 h-3.5 w-3.5" /> Facturar Individual</DropdownMenuItem>}
                        {pdfUrl && <DropdownMenuItem className="text-blue-600 font-bold" onClick={() => window.open(pdfUrl, '_blank')}><Eye className="mr-2 h-3.5 w-3.5" /> VER FACTURA SII</DropdownMenuItem>}
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
                <DialogTitle className="text-[10px] font-bold text-slate-400 uppercase">Documento: {quoteToManage.id.slice(-6).toUpperCase()}</DialogTitle>
                <div className="flex gap-2">
                  {mapLegacyStatus(quoteToManage.status) === 'PAGADO' && <Button onClick={() => handleInvoiceNow(quoteToManage.id)} disabled={isProcessing === quoteToManage.id} className="text-[10px] font-bold h-8 bg-emerald-700">FACTURAR SII</Button>}
                  {(quoteToManage.liorenPdfUrl || (quoteToManage as any).liorenPdfUrl) && (
                    <Button asChild className="text-[10px] font-bold h-8 bg-blue-700">
                      <a href={quoteToManage.liorenPdfUrl || (quoteToManage as any).liorenPdfUrl} target="_blank" rel="noopener noreferrer">VER FACTURA</a>
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
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

  // FUNCIÓN CORREGIDA: Construye la URL exacta del visor de Lioren
  const getLiorenPdfUrl = (quote: any) => {
    if (quote.liorenPdfUrl && quote.liorenPdfUrl.startsWith('http')) return quote.liorenPdfUrl;
    if (quote.liorenId) {
      const slug = "araval-fisioterapia-y-medicina-spa-pruebas-api";
      return `https://cl.lioren.enterprises/empresas/${slug}/dte/getpdf/${quote.liorenId}`;
    }
    return null;
  };

  const handleTestLioren = async () => {
    setIsProcessing("testing");
    try {
      const result = await probarConexionLioren();
      if (result.success) alert(result.message);
      else alert("Error: " + result.error);
    } catch (err: any) { alert("Fallo: " + err.message); }
    finally { setIsProcessing(null); }
  };

  const handleInvoiceNow = async (id: string) => {
    setIsProcessing(id);
    try {
      const result = await ejecutarFacturacionSiiV2(id);
      if (result.success) {
        toast({ title: "Facturación exitosa" });
        await refetchQuotes();
        setQuoteToManage(null);
      }
    } catch (err: any) { toast({ variant: 'destructive', title: "Error SII", description: err.message }); }
    finally { setIsProcessing(null); }
  };

  const handleSendEmail = async (quote: any) => {
    const email = quote.solicitanteData?.mail || quote.solicitante?.mail;
    if (!email) return alert("Sin email.");
    setIsProcessing(quote.id);
    try {
      const pdfBlob = await GeneradorPDF.generar(quote);
      const pdfBase64 = await blobToBase64(pdfBlob);
      const result = await enviarCotizacion({ clienteEmail: email, cotizacionId: quote.id.slice(-6).toUpperCase(), pdfBase64 });
      if (result.status === 'success') {
        await updateDoc(doc(firestore, 'cotizaciones', quote.id), { status: 'CORREO_ENVIADO', fechaEnvioEmail: new Date().toISOString() });
        toast({ title: "Enviado con éxito" });
        await refetchQuotes();
        setQuoteToManage(null);
      }
    } catch (err: any) { alert("Error: " + err.message); }
    finally { setIsProcessing(null); }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0] || !quoteToManage) return;
    setIsUploading(true);
    try {
      const storage = getStorage();
      const fileRef = storageRef(storage, `vouchers/${quoteToManage.id}_${Date.now()}`);
      await uploadBytes(fileRef, event.target.files[0]);
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(firestore, 'cotizaciones', quoteToManage.id), { pagoVoucherUrl: url, status: 'PAGADO' });
      toast({ title: "Pago registrado" });
      await refetchQuotes();
      setQuoteToManage(null);
    } catch (err: any) { alert("Error subida."); }
    finally { setIsUploading(false); }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-6 w-6 text-slate-300" /></div>;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-end mb-8">
        <div><h1 className="text-xl font-bold uppercase">Administración</h1><p className="text-[10px] text-slate-400 font-bold uppercase">Gestión DTE</p></div>
        <div className="flex items-center gap-4">
          <Button onClick={handleTestLioren} variant="outline" size="sm" className="bg-blue-600 text-white font-bold h-9" disabled={isProcessing === "testing"}><FlaskConical className="h-3.5 w-3.5 mr-2" /> TEST SII</Button>
          <Input placeholder="Buscar..." className="w-64 h-9 text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white border rounded-sm shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50"><TableRow><TableHead className="text-[10px] font-bold py-3 px-6">ID</TableHead><TableHead className="text-[10px] font-bold">Empresa</TableHead><TableHead className="text-[10px] font-bold text-center">Estado</TableHead><TableHead className="text-right text-[10px] font-bold px-6">Acciones</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredQuotes.map((quote) => {
              const status = mapLegacyStatus(quote.status).toUpperCase();
              const pdfUrl = getLiorenPdfUrl(quote);
              return (
                <TableRow key={quote.id} className="text-xs">
                  <TableCell className="font-mono font-bold px-6">#{quote.id.slice(-6).toUpperCase()}</TableCell>
                  <TableCell><div className="flex flex-col"><span className="font-bold">{quote.empresaData?.razonSocial}</span><span className="text-[10px] text-slate-400">{quote.empresaData?.rut}</span></div></TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Badge className={`font-bold text-[9px] uppercase ${status === 'FACTURADO' ? 'bg-emerald-500' : status === 'PAGADO' ? 'bg-blue-700' : status === 'CORREO_ENVIADO' ? 'bg-indigo-600' : 'bg-amber-500'} border-none text-white`}>{status}</Badge>
                      {/* BOTÓN VISIBLE AL LADO DE LA ETIQUETA */}
                      {status === 'FACTURADO' && pdfUrl && (
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-50 text-blue-600 p-1 rounded hover:bg-blue-100 transition-colors" title="Ver Factura SII">
                          <FileText className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => setQuoteToManage(quote)}><Eye className="mr-2 h-3.5 w-3.5" /> Gestionar</DropdownMenuItem>
                        {pdfUrl && (
                           <DropdownMenuItem className="text-blue-600 font-bold" onClick={() => window.open(pdfUrl, '_blank')}>
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
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
          {quoteToManage && (
            <div className="flex flex-col">
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center sticky top-0 z-10">
                <DialogTitle className="text-[10px] font-bold uppercase">Gestión Cotización: {quoteToManage.id.slice(-6).toUpperCase()}</DialogTitle>
                <div className="flex gap-2">
                  {['CONFIRMADA', 'CORREO_ENVIADO'].includes(mapLegacyStatus(quoteToManage.status).toUpperCase()) && (
                    <Button onClick={() => handleSendEmail(quoteToManage)} disabled={isProcessing === quoteToManage.id} className="text-[10px] font-bold h-8 bg-slate-900"><Send className="h-3 w-3 mr-2" /> ENVIAR EMAIL</Button>
                  )}
                  {mapLegacyStatus(quoteToManage.status).toUpperCase() === 'CORREO_ENVIADO' && (
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="text-[10px] font-bold h-8 bg-blue-800"><Receipt className="h-3 w-3 mr-2" /> SUBIR PAGO</Button>
                  )}
                  {mapLegacyStatus(quoteToManage.status).toUpperCase() === 'PAGADO' && (
                    <Button onClick={() => handleInvoiceNow(quoteToManage.id)} disabled={isProcessing === quoteToManage.id} className="text-[10px] font-bold h-8 bg-emerald-700"><FileText className="h-3 w-3 mr-2" /> FACTURAR SII</Button>
                  )}
                  {getLiorenPdfUrl(quoteToManage) && (
                    <Button asChild className="text-[10px] font-bold h-8 bg-blue-700">
                      <a href={getLiorenPdfUrl(quoteToManage)!} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-2" /> VER FACTURA
                      </a>
                    </Button>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf"/>
              </div>
              <div className="p-1"><DetalleCotizacion quote={quoteToManage} /></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
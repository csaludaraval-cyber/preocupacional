"use client";

import React, { useMemo, useState, useRef } from 'react';
import { useCotizaciones } from '@/hooks/use-cotizaciones';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, MoreVertical, FileText, Search, Mail, Receipt, Eye, Send
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DetalleCotizacion } from '@/components/cotizacion/DetalleCotizacion';
import { updateDoc, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Cotizacion } from '@/lib/types';
import { mapLegacyStatus } from '@/lib/status-mapper';
import { ejecutarFacturacionSiiV2 } from '@/server/actions/facturacionActions';
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
  const [quoteToManage, setQuoteToManage] = useState<Cotizacion | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    const term = searchTerm.toLowerCase().trim();
    return quotes.filter(q => 
        q.id.toLowerCase().includes(term) ||
        q.empresaData?.razonSocial?.toLowerCase().includes(term) ||
        q.empresaData?.rut?.toLowerCase().includes(term)
      ).sort((a:any, b:any) => (b.fechaCreacion?.seconds || 0) - (a.fechaCreacion?.seconds || 0));
  }, [quotes, searchTerm]);

  const handleSendEmail = async (quote: Cotizacion) => {
    const email = quote.solicitanteData?.mail || (quote as any).solicitante?.mail;
    if (!email) return toast({ title: "Error", description: "Email no registrado", variant: "destructive" });

    setIsProcessing(quote.id);
    console.log("LOG: Iniciando proceso de envío para cotización", quote.id);

    try {
      console.log("LOG: Generando PDF en cliente...");
      const pdfBlob = await GeneradorPDF.generar(quote);
      console.log("LOG: PDF generado con éxito. Tamaño:", pdfBlob.size, "bytes");

      const pdfBase64 = await blobToBase64(pdfBlob);
      console.log("LOG: Llamando al servidor (Server Action)...");
      
      const result = await enviarCotizacion({
        clienteEmail: email,
        cotizacionId: quote.id.slice(-6).toUpperCase(),
        pdfBase64: pdfBase64,
      });

      console.log("LOG: Respuesta recibida del servidor:", result);

      if (result.status === 'success') {
        await updateDoc(doc(firestore, 'cotizaciones', quote.id), {
          status: 'CORREO_ENVIADO',
          fechaEnvioEmail: new Date().toISOString()
        });
        toast({ title: "Envío completado", description: "El mensaje fue enviado con éxito." });
        refetchQuotes();
        setQuoteToManage(null);
      }
    } catch (err: any) {
      console.error("ERROR CRÍTICO EN handleSendEmail:", err);
      toast({ 
        title: "Error de Envío", 
        description: err.message || "No se pudo realizar el envío. Revisa la consola (F12).", 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0] || !quoteToManage) return;
    setIsUploading(true);
    try {
      const storage = getStorage();
      const fileRef = storageRef(storage, `vouchers/${quoteToManage.id}_${Date.now()}`);
      await uploadBytes(fileRef, event.target.files[0]);
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(firestore, 'cotizaciones', quoteToManage.id), { 
        pagoVoucherUrl: url, 
        status: 'PAGADO' 
      });
      toast({ title: "Registro de pago", description: "El comprobante ha sido guardado." });
      refetchQuotes();
      setQuoteToManage(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Error", description: "Fallo al subir archivo." });
    } finally { setIsUploading(false); }
  };

  const handleInvoiceNow = async (id: string) => {
    setIsProcessing(id);
    try {
      const result = await ejecutarFacturacionSiiV2(id);
      if (result.success) {
        toast({ title: "Facturación exitosa", description: `DTE Folio ${result.folio} generado.` });
        refetchQuotes();
        setQuoteToManage(null);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Error SII", description: err.message });
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) return <div className="flex justify-center p-20 text-slate-300"><Loader2 className="animate-spin h-6 w-6" /></div>;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Administración</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestión de documentos tributarios</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input 
            placeholder="Buscar empresa o rut..." 
            className="pl-9 h-9 text-xs border-slate-200" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="bg-white border rounded-sm shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-[10px] font-bold uppercase text-slate-500 py-3">ID</TableHead>
              <TableHead className="text-[10px] font-bold uppercase text-slate-500">Empresa Receptora</TableHead>
              <TableHead className="text-[10px] font-bold uppercase text-slate-500">Estado</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase text-slate-500 px-6">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuotes.map((quote) => {
              const status = mapLegacyStatus(quote.status);
              return (
                <TableRow key={quote.id} className="text-xs">
                  <TableCell className="font-mono text-slate-400 font-bold">#{quote.id.slice(-6).toUpperCase()}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">{quote.empresaData?.razonSocial}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{quote.empresaData?.rut}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={`font-bold text-[9px] uppercase px-2 py-0.5 rounded-none border-none text-white
                        ${status === 'FACTURADO' ? 'bg-[#10b981]' : status === 'PAGADO' ? 'bg-[#1e40af]' : status === 'CORREO_ENVIADO' ? 'bg-[#4f46e5]' : 'bg-[#f59e0b]'}`}
                    >
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="text-xs" onClick={() => setQuoteToManage(quote)}><Eye className="mr-2 h-3.5 w-3.5" /> Ver Detalles</DropdownMenuItem>
                        {status === 'CONFIRMADA' && (
                          <DropdownMenuItem className="text-xs font-bold text-blue-600" onClick={() => handleSendEmail(quote)}>
                            <Mail className="mr-2 h-3.5 w-3.5" /> Enviar Correo
                          </DropdownMenuItem>
                        )}
                         {status === 'CORREO_ENVIADO' && (
                          <DropdownMenuItem className="text-xs font-bold text-indigo-600" onClick={() => handleSendEmail(quote)}>
                            <Send className="mr-2 h-3.5 w-3.5" /> Re-enviar Correo
                          </DropdownMenuItem>
                        )}
                        {quote.liorenPdfUrl && (
                          <DropdownMenuItem className="text-xs font-bold text-emerald-600" onClick={() => window.open(quote.liorenPdfUrl, '_blank')}>
                            <FileText className="mr-2 h-3.5 w-3.5" /> Ver Factura SII
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
                <DialogTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Documento ID: {quoteToManage.id.slice(-6).toUpperCase()}</DialogTitle>
                <div className="flex gap-2">
                  {['CONFIRMADA', 'CORREO_ENVIADO'].includes(mapLegacyStatus(quoteToManage.status)) && (
                    <Button onClick={() => handleSendEmail(quoteToManage)} disabled={isProcessing === quoteToManage.id} className="text-[10px] font-bold h-8 px-4 bg-slate-900">
                      {isProcessing === quoteToManage.id ? <Loader2 className="animate-spin h-3 w-3 mr-2"/> : <Send className="h-3 w-3 mr-2" />} ENVIAR COTIZACIÓN
                    </Button>
                  )}
                  {mapLegacyStatus(quoteToManage.status) === 'CORREO_ENVIADO' && (
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="text-[10px] font-bold h-8 px-4 bg-blue-800">
                      <Receipt className="h-3 w-3 mr-2" /> SUBIR PAGO
                    </Button>
                  )}
                  {mapLegacyStatus(quoteToManage.status) === 'PAGADO' && (
                    <Button onClick={() => handleInvoiceNow(quoteToManage.id)} disabled={isProcessing === quoteToManage.id} className="text-[10px] font-bold h-8 px-4 bg-emerald-700">
                      <FileText className="h-3 w-3 mr-2" /> FACTURAR SII
                    </Button>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf"/>
              </div>
              <div className="p-1">
                <DetalleCotizacion quote={quoteToManage} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
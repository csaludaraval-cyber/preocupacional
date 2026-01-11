"use client";

import React, { useMemo, useState, useRef } from 'react';
import { useCotizaciones } from '@/hooks/use-cotizaciones';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MoreVertical, FileText, Search, Mail, Receipt, Eye, Send, FlaskConical, ExternalLink, AlertCircle, RefreshCw, UploadCloud } from 'lucide-react';
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

  const getLiorenPdfUrl = (quote: any) => {
    const id = quote.liorenId || quote.liorenid || quote.lioren_id;
    if (id) {
      const slug = "araval-fisioterapia-y-medicina-spa-pruebas-api";
      return `https://cl.lioren.enterprises/empresas/${slug}/dte/getpdf/${id}`;
    }
    return null;
  };

  const handleInvoiceNow = async (id: string) => {
    setIsProcessing("invoice");
    try {
      const result = await ejecutarFacturacionSiiV2(id);
      if (result.success) {
        toast({ title: "Facturación exitosa" });
        await refetchQuotes();
        setQuoteToManage(null);
      }
    } catch (err: any) { 
        toast({ variant: 'destructive', title: "Error", description: err.message }); 
    } finally { setIsProcessing(null); }
  };

  const handleSendEmail = async (quote: any) => {
    const email = quote.solicitanteData?.mail || quote.solicitante?.mail;
    if (!email) return alert("Sin email.");
    setIsProcessing("email");
    try {
      const pdfBlob = await GeneradorPDF.generar(quote);
      const pdfBase64 = await blobToBase64(pdfBlob);
      const result = await enviarCotizacion({ clienteEmail: email, cotizacionId: quote.id.slice(-6).toUpperCase(), pdfBase64 });
      if (result.status === 'success') {
        await updateDoc(doc(firestore, 'cotizaciones', quote.id), { status: 'CORREO_ENVIADO', fechaEnvioEmail: new Date().toISOString() });
        toast({ title: "Enviado con éxito" });
        await refetchQuotes();
      }
    } catch (err: any) { alert(err.message); }
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
      toast({ title: "Pago registrado exitosamente" });
      await refetchQuotes();
      setQuoteToManage(null);
    } catch (err: any) { alert("Error al subir el archivo."); }
    finally { setIsUploading(false); }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-6 w-6 text-slate-300" /></div>;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div><h1 className="text-xl font-bold uppercase text-slate-800">Administración</h1><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestión DTE Araval</p></div>
        <div className="flex items-center gap-4">
          <Button onClick={() => refetchQuotes()} variant="outline" size="sm" className="h-9"><RefreshCw className="h-4 w-4 mr-2" /> Actualizar</Button>
          <Input placeholder="Buscar empresa o ID..." className="w-64 h-9 text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white border rounded-sm shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50"><TableRow><TableHead className="py-3 px-6 text-[10px]">ID</TableHead><TableHead className="text-[10px]">Empresa</TableHead><TableHead className="text-center text-[10px]">Estado / DTE</TableHead><TableHead className="text-right px-6 text-[10px]">Acciones</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredQuotes.map((quote) => {
              const status = mapLegacyStatus(quote.status).toUpperCase();
              const pdfUrl = getLiorenPdfUrl(quote);
              return (
                <TableRow key={quote.id} className="text-xs hover:bg-slate-50">
                  <TableCell className="font-mono font-bold px-6">#{quote.id.slice(-6).toUpperCase()}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold">{quote.empresaData?.razonSocial}</span>
                      <span className="text-[10px] text-slate-400">{quote.empresaData?.rut}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Badge className={`font-bold text-[9px] uppercase ${status === 'FACTURADO' ? 'bg-emerald-500' : status === 'PAGADO' ? 'bg-blue-600' : 'bg-slate-400'} border-none text-white`}>{status}</Badge>
                      {status === 'FACTURADO' && (
                        pdfUrl ? (
                          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700"><FileText className="h-4 w-4" /></a>
                        ) : <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <Button variant="ghost" size="icon" onClick={() => setQuoteToManage(quote)}><Eye className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* DIÁLOGO DE GESTIÓN (REDISEÑADO) */}
      <Dialog open={!!quoteToManage} onOpenChange={() => setQuoteToManage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          {quoteToManage && (
            <div className="flex flex-col">
              {/* Barra de Herramientas Superior Siempre Visible */}
              <div className="p-4 bg-slate-900 text-white flex flex-wrap gap-3 justify-between items-center sticky top-0 z-50">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Gestión de Orden</span>
                    <span className="text-sm font-bold">#{quoteToManage.id.slice(-6).toUpperCase()}</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {/* Botón 1: Enviar Email (Siempre disponible si no está facturado) */}
                  {quoteToManage.status !== 'FACTURADO' && (
                    <Button onClick={() => handleSendEmail(quoteToManage)} disabled={isProcessing === "email"} size="sm" className="bg-slate-700 hover:bg-slate-600 text-[10px] font-bold h-8">
                       {isProcessing === "email" ? <Loader2 className="animate-spin h-3 w-3 mr-1"/> : <Send className="h-3 w-3 mr-1" />} ENVIAR COTIZACIÓN
                    </Button>
                  )}

                  {/* Botón 2: Subir Voucher (Siempre disponible si no está facturado) */}
                  {quoteToManage.status !== 'FACTURADO' && (
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} size="sm" className="bg-blue-600 hover:bg-blue-500 text-[10px] font-bold h-8">
                      {isUploading ? <Loader2 className="animate-spin h-3 w-3 mr-1"/> : <UploadCloud className="h-3 w-3 mr-1" />} SUBIR PAGO
                    </Button>
                  )}

                  {/* Botón 3: Facturar SII (Siempre disponible si no está facturado) */}
                  {quoteToManage.status !== 'FACTURADO' && (
                    <Button onClick={() => handleInvoiceNow(quoteToManage.id)} disabled={isProcessing === "invoice"} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold h-8">
                      {isProcessing === "invoice" ? <Loader2 className="animate-spin h-3 w-3 mr-1"/> : <FileText className="h-3 w-3 mr-1" />} FACTURAR SII
                    </Button>
                  )}

                  {/* Botón 4: Ver Factura (Solo si ya tiene ID) */}
                  {getLiorenPdfUrl(quoteToManage) && (
                    <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold h-8">
                      <a href={getLiorenPdfUrl(quoteToManage)!} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" /> VER FACTURA</a>
                    </Button>
                  )}
                </div>
                
                {/* Input de archivo oculto */}
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf"/>
              </div>

              {/* Contenido de la cotización */}
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
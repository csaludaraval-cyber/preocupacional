"use client";

import React, { useMemo, useState, useRef } from 'react';
import { useCotizaciones } from '@/hooks/use-cotizaciones';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Send, ExternalLink, AlertTriangle, RefreshCw, UploadCloud, Eye, FlaskConical, Trash2, MoreVertical, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DetalleCotizacion } from '@/components/cotizacion/DetalleCotizacion';
import { updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { mapLegacyStatus } from '@/lib/status-mapper';
import { ejecutarFacturacionSiiV2, probarConexionLioren, descargarMaestroLocalidades } from '@/server/actions/facturacionActions';
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
  
  const [forcedUrls, setForcedUrls] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    return quotes.filter(q => 
        q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.empresaData?.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase())
      ).sort((a:any, b:any) => (b.fechaCreacion?.seconds || 0) - (a.fechaCreacion?.seconds || 0));
  }, [quotes, searchTerm]);

  // Si tenemos una cotización seleccionada, buscamos su versión más fresca en la lista "quotes"
  // Esto asegura que si la tabla se actualiza, el modal también lo haga.
  const activeQuote = useMemo(() => {
    if (!quoteToManage) return null;
    const freshQuote = quotes?.find(q => q.id === quoteToManage.id);
    return freshQuote || quoteToManage; // Si no la encuentra (raro), usa la vieja
  }, [quotes, quoteToManage]);

  const getLiorenPdfUrl = (quote: any) => {
    if (forcedUrls[quote.id]) return forcedUrls[quote.id];
    if (quote.liorenPdfUrl && quote.liorenPdfUrl.startsWith('http')) return quote.liorenPdfUrl;
    return null;
  };

  const handleTestLioren = async () => {
    setIsProcessing("test");
    try {
      const result = await probarConexionLioren();
      alert(result.message || result.error);
    } catch (err: any) { alert("Error: " + err.message); }
    finally { setIsProcessing(null); }
  };

  const handleDescargarMaestro = async () => {
    if (!confirm("¿Descargar las 3 tablas oficiales (Regiones, Comunas, Ciudades)?")) return;
    setIsProcessing("download");
    try {
      const result = await descargarMaestroLocalidades();
      if (result.success) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'maestro_lioren_full.json';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({ title: "Tablas descargadas", description: "Revisa el archivo maestro_lioren_full.json" });
      } else {
        alert("Error API: " + result.error);
      }
    } catch (err: any) { alert("Error: " + err.message); }
    finally { setIsProcessing(null); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar solicitud?")) return;
    try {
      await deleteDoc(doc(firestore, 'cotizaciones', id));
      toast({ title: "Solicitud eliminada" });
      await refetchQuotes();
    } catch (err: any) { alert("Error: " + err.message); }
  };

  const handleInvoiceNow = async (id: string) => {
    setIsProcessing("invoice");
    try {
      const result = await ejecutarFacturacionSiiV2(id);
      if (result.success) {
        toast({ title: "Facturado Exitosamente" });
        if (result.pdfUrl) setForcedUrls(prev => ({ ...prev, [id]: result.pdfUrl }));
        
        // Refrescamos la tabla global, el useMemo actualizará el modal
        await refetchQuotes(); 
      }
    } catch (err: any) { toast({ variant: 'destructive', title: "Error", description: err.message }); } 
    finally { setIsProcessing(null); }
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
        // 1. Actualizamos Firestore
        await updateDoc(doc(firestore, 'cotizaciones', quote.id), { status: 'CORREO_ENVIADO', fechaEnvioEmail: new Date().toISOString() });
        toast({ title: "Correo enviado" });
        
        // 2. Refrescamos la tabla para que traiga el nuevo estado
        await refetchQuotes();
        
        // 3. Forzamos la actualización visual inmediata del modal (por si el refetch tarda)
        setQuoteToManage((prev: any) => ({ ...prev, status: 'CORREO_ENVIADO' }));
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
      toast({ title: "Pago registrado" });
      
      // Actualizamos todo
      await refetchQuotes();
      setQuoteToManage((prev: any) => ({ ...prev, status: 'PAGADO', pagoVoucherUrl: url }));
      
    } catch (err: any) { alert("Error subida."); }
    finally { setIsUploading(false); }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-6 w-6 text-slate-300" /></div>;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-end mb-8">
        <div><h1 className="text-xl font-bold uppercase text-slate-800">Administración</h1><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestión DTE Araval</p></div>
        <div className="flex items-center gap-4">
          <Button onClick={handleDescargarMaestro} disabled={isProcessing === "download"} variant="outline" size="sm" className="h-9 border-slate-400 text-slate-600">
             {isProcessing === "download" ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : <Download className="h-3.5 w-3.5 mr-2" />} MAESTRO
          </Button>
          <Button onClick={handleTestLioren} disabled={isProcessing === "test"} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs">
             {isProcessing === "test" ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : <FlaskConical className="h-3.5 w-3.5 mr-2" />} TEST SII
          </Button>
          <Button onClick={() => refetchQuotes()} variant="outline" size="sm" className="h-9"><RefreshCw className="h-4 w-4" /></Button>
          <Input placeholder="Buscar..." className="w-64 h-9 text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white border rounded-sm shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50"><TableRow><TableHead className="py-3 px-6 text-[10px]">ID</TableHead><TableHead className="text-[10px]">Empresa</TableHead><TableHead className="text-center text-[10px]">Estado / DTE</TableHead><TableHead className="text-right px-6 text-[10px]">Acciones</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredQuotes.map((quote) => {
              const status = mapLegacyStatus(quote.status).toUpperCase();
              const hasUrl = !!forcedUrls[quote.id] || (quote.liorenPdfUrl && quote.liorenPdfUrl.startsWith('http'));
              const isFacturadoVisual = status === 'FACTURADO' || hasUrl;
              const pdfUrl = getLiorenPdfUrl(quote);

              return (
                <TableRow key={quote.id} className="text-xs hover:bg-slate-50 transition-colors">
                  <TableCell className="font-mono font-bold px-6">#{quote.id.slice(-6).toUpperCase()}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold">{quote.empresaData?.razonSocial}</span>
                      <span className="text-[10px] text-slate-400">{quote.empresaData?.rut}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Badge className={`font-bold text-[9px] uppercase ${isFacturadoVisual ? 'bg-emerald-500' : status === 'PAGADO' ? 'bg-blue-600' : 'bg-slate-400'} border-none text-white`}>
                        {isFacturadoVisual ? 'FACTURADO' : status}
                      </Badge>
                      {isFacturadoVisual ? (
                        pdfUrl ? (
                          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 transition-colors shadow-sm"><FileText className="h-4 w-4" /></a>
                        ) : <div className="text-amber-500"><AlertTriangle className="h-4 w-4" /></div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4 text-slate-400" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setQuoteToManage(quote)}><Eye className="mr-2 h-4 w-4" /> Gestionar</DropdownMenuItem>
                        {pdfUrl && <DropdownMenuItem onClick={() => window.open(pdfUrl, '_blank')}><ExternalLink className="mr-2 h-4 w-4" /> Ver Factura</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => handleDelete(quote.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          {activeQuote && ( // USAMOS activeQuote EN VEZ DE quoteToManage PARA QUE SE REFRESQUE
            <div className="flex flex-col">
              <div className="p-4 bg-slate-900 text-white flex flex-wrap gap-3 justify-between items-center sticky top-0 z-50">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Gestión de Orden</span>
                    <span className="text-sm font-bold">#{activeQuote.id.slice(-6).toUpperCase()}</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    // LEEMOS EL ESTADO DE LA VERSIÓN FRESCA (activeQuote)
                    const status = mapLegacyStatus(activeQuote.status).toUpperCase();
                    const hasUrl = !!forcedUrls[activeQuote.id] || (activeQuote.liorenPdfUrl && activeQuote.liorenPdfUrl.startsWith('http'));
                    const isFacturado = status === 'FACTURADO' || hasUrl;
                    const pdfUrl = getLiorenPdfUrl(activeQuote);

                    if (!isFacturado && status !== 'PAGADO') {
                        return <Button onClick={() => handleSendEmail(activeQuote)} disabled={isProcessing === "email"} size="sm" className="bg-slate-700 hover:bg-slate-600 text-[10px] font-bold h-8 transition-all">{isProcessing === "email" ? <Loader2 className="animate-spin h-3 w-3 mr-1"/> : <Send className="h-3 w-3 mr-1" />} EMAIL</Button>;
                    }
                    if (status === 'CORREO_ENVIADO' || (status === 'PAGADO' && !isFacturado)) {
                        return <>
                             <Button onClick={() => handleSendEmail(activeQuote)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"><Send className="h-3 w-3" /></Button>
                             {status !== 'PAGADO' && <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} size="sm" className="bg-blue-600 hover:bg-blue-500 text-[10px] font-bold h-8 transition-all">{isUploading ? <Loader2 className="animate-spin h-3 w-3 mr-1"/> : <UploadCloud className="h-3 w-3 mr-1" />} PAGO</Button>}
                        </>;
                    }
                    if (status === 'PAGADO' && !isFacturado) {
                        return <Button onClick={() => handleInvoiceNow(activeQuote.id)} disabled={isProcessing === "invoice"} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold h-8 transition-all">{isProcessing === "invoice" ? <Loader2 className="animate-spin h-3 w-3 mr-1"/> : <FileText className="h-3 w-3 mr-1" />} FACTURAR SII</Button>;
                    }
                    if (isFacturado && pdfUrl) {
                        return <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold h-8 transition-all"><a href={pdfUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" /> VER PDF OFICIAL</a></Button>;
                    }
                    return null;
                  })()}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf"/>
              </div>
              <div className="p-1"><DetalleCotizacion quote={activeQuote} /></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
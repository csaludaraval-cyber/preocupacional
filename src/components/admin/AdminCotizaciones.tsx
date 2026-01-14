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
  const { toast } = useToast();

  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    return quotes.filter(q => 
        q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.empresaData?.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase())
      ).sort((a:any, b:any) => (b.fechaCreacion?.seconds || 0) - (a.fechaCreacion?.seconds || 0));
  }, [quotes, searchTerm]);

  // Función para obtener la URL del PDF (Prioridad: local o DB)
  const getLiorenPdfUrl = (quote: any) => {
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
    setIsProcessing("download");
    try {
      const result = await descargarMaestroLocalidades();
      if (result.success) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'maestro_lioren_full.json';
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); document.body.removeChild(a);
      }
    } catch (err: any) { alert(err.message); }
    finally { setIsProcessing(null); }
  };

  const handleSendEmail = async (quote: any) => {
    setIsProcessing("email");
    try {
      const pdfBlob = await GeneradorPDF.generar(quote);
      const pdfBase64 = await blobToBase64(pdfBlob);
      const result = await enviarCotizacion({ 
        clienteEmail: quote.solicitanteData?.mail || quote.solicitante?.mail, 
        cotizacionId: quote.id.slice(-6).toUpperCase(), 
        pdfBase64 
      });
      
      if (result.status === 'success') {
        await updateDoc(doc(firestore, 'cotizaciones', quote.id), { 
          status: 'CORREO_ENVIADO', 
          fechaEnvioEmail: new Date().toISOString() 
        });
        toast({ title: "Correo enviado" });
        
        // ACTUALIZACIÓN LOCAL INMEDIATA PARA ACTIVAR BOTÓN PAGO
        setQuoteToManage((prev: any) => ({ ...prev, status: 'CORREO_ENVIADO' }));
        
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
      
      await updateDoc(doc(firestore, 'cotizaciones', quoteToManage.id), { 
        pagoVoucherUrl: url, 
        status: 'PAGADO' 
      });
      toast({ title: "Pago registrado" });
      
      // ACTUALIZACIÓN LOCAL INMEDIATA PARA ACTIVAR BOTÓN FACTURAR
      setQuoteToManage((prev: any) => ({ ...prev, status: 'PAGADO', pagoVoucherUrl: url }));
      
      await refetchQuotes();
    } catch (err: any) { alert("Error al subir."); }
    finally { setIsUploading(false); }
  };

  const handleInvoiceNow = async (id: string) => {
    setIsProcessing("invoice");
    try {
      const result = await ejecutarFacturacionSiiV2(id);
      if (result.success) {
        toast({ title: "¡Facturado con éxito!" });
        
        // ACTUALIZACIÓN LOCAL INMEDIATA PARA ACTIVAR BOTÓN VER PDF
        setQuoteToManage((prev: any) => ({ 
          ...prev, 
          status: 'FACTURADO', 
          liorenPdfUrl: result.pdfUrl 
        }));
        
        await refetchQuotes();
      }
    } catch (err: any) { alert(err.message); }
    finally { setIsProcessing(null); }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-6 w-6 text-slate-300" /></div>;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div><h1 className="text-xl font-bold uppercase text-slate-800">Administración</h1><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestión DTE Araval</p></div>
        <div className="flex items-center gap-4">
          <Button onClick={handleDescargarMaestro} disabled={isProcessing === "download"} variant="outline" size="sm" className="h-9 border-slate-400 text-slate-600"><Download className="h-3.5 w-3.5 mr-2" /> MAESTRO</Button>
          <Button onClick={handleTestLioren} disabled={isProcessing === "test"} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs"><FlaskConical className="h-3.5 w-3.5 mr-2" /> TEST SII</Button>
          <Button onClick={() => refetchQuotes()} variant="outline" size="sm" className="h-9"><RefreshCw className="h-4 w-4" /></Button>
          <Input placeholder="Buscar..." className="w-64 h-9 text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                  <TableCell><div className="flex flex-col"><span className="font-bold text-slate-700">{quote.empresaData?.razonSocial}</span><span className="text-[10px] text-slate-400 font-mono">{quote.empresaData?.rut}</span></div></TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Badge className={`font-bold text-[9px] uppercase ${status === 'FACTURADO' ? 'bg-emerald-500' : status === 'PAGADO' ? 'bg-blue-600' : status === 'CORREO_ENVIADO' ? 'bg-amber-500' : 'bg-slate-400'} border-none text-white`}>{status}</Badge>
                      {status === 'FACTURADO' && (
                        pdfUrl ? (
                          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700"><FileText className="h-4 w-4" /></a>
                        ) : <div className="text-amber-500"><AlertTriangle className="h-4 w-4" /></div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <Button variant="ghost" size="icon" onClick={() => setQuoteToManage(quote)}><Eye className="h-4 w-4 text-slate-600" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* DIÁLOGO DE GESTIÓN CON PASOS ESTRICTOS */}
      <Dialog open={!!quoteToManage} onOpenChange={() => setQuoteToManage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          {quoteToManage && (
            <div className="flex flex-col">
              <div className="p-4 bg-slate-900 text-white flex flex-wrap gap-3 justify-between items-center sticky top-0 z-50">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-white">Gestión de Orden</span>
                    <span className="text-sm font-bold text-white">#{quoteToManage.id.slice(-6).toUpperCase()}</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const status = mapLegacyStatus(quoteToManage.status).toUpperCase();
                    const pdfUrl = getLiorenPdfUrl(quoteToManage);

                    // PASO 1: CONFIRMADA -> Mostrar EMAIL
                    if (status === 'CONFIRMADA') {
                        return (
                            <Button onClick={() => handleSendEmail(quoteToManage)} disabled={isProcessing === "email"} size="sm" className="bg-slate-700 hover:bg-slate-600 text-[10px] font-bold h-8 transition-all">
                                {isProcessing === "email" ? <Loader2 className="animate-spin h-3 w-3 mr-1"/> : <Send className="h-3 w-3 mr-1" />} EMAIL
                            </Button>
                        );
                    }

                    // PASO 2: CORREO_ENVIADO -> Mostrar PAGO
                    if (status === 'CORREO_ENVIADO') {
                        return (
                            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} size="sm" className="bg-blue-600 hover:bg-blue-500 text-[10px] font-bold h-8 transition-all">
                                {isUploading ? <Loader2 className="animate-spin h-3 w-3 mr-1"/> : <UploadCloud className="h-3 w-3 mr-1" />} PAGO
                            </Button>
                        );
                    }
                    
                    // PASO 3: PAGADO -> Mostrar FACTURAR SII
                    if (status === 'PAGADO') {
                        return (
                            <Button onClick={() => handleInvoiceNow(quoteToManage.id)} disabled={isProcessing === "invoice"} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold h-8 transition-all">
                                {isProcessing === "invoice" ? <Loader2 className="animate-spin h-3 w-3 mr-1"/> : <FileText className="h-3 w-3 mr-1" />} FACTURAR SII
                            </Button>
                        );
                    }

                    // PASO 4: FACTURADO -> Mostrar VER PDF
                    if (status === 'FACTURADO' && pdfUrl) {
                        return (
                            <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold h-8 transition-all">
                                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" /> VER PDF OFICIAL</a>
                            </Button>
                        );
                    }
                    
                    return null;
                  })()}
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
"use client";

import React, { useMemo, useState, useRef } from 'react';
import { useCotizaciones } from '@/hooks/use-cotizaciones';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Search, Send, ExternalLink, AlertCircle, RefreshCw, UploadCloud, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DetalleCotizacion } from '@/components/cotizacion/DetalleCotizacion';
import { updateDoc, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  const [quoteToManage, setQuoteToManage] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // BYPASS DE MEMORIA: Para visualización instantánea post-facturación
  const [forcedIds, setForcedIds] = useState<Record<string, string>>({});
  
  const { toast } = useToast();

  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    return quotes.filter(q => 
        q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.empresaData?.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase())
      ).sort((a:any, b:any) => (b.fechaCreacion?.seconds || 0) - (a.fechaCreacion?.seconds || 0));
  }, [quotes, searchTerm]);

  // CONSTRUCTOR DE LINK AL PDF (Memoria + DB)
  const getLiorenPdfUrl = (quote: any) => {
    const idMemoria = forcedIds[quote.id];
    const idDB = quote.liorenId || quote.liorenid;
    const finalId = idMemoria || idDB;

    if (finalId) {
      const slug = "araval-fisioterapia-y-medicina-spa-pruebas-api";
      return `https://cl.lioren.enterprises/empresas/${slug}/dte/getpdf/${finalId}`;
    }
    return null;
  };

  const handleInvoiceNow = async (id: string) => {
    setIsProcessing("invoice");
    try {
      const result = await ejecutarFacturacionSiiV2(id);
      if (result.success) {
        toast({ title: "Facturación exitosa", description: "El documento ha sido emitido correctamente." });
        
        // Inyectamos el ID en memoria para feedback instantáneo
        if (result.liorenId) {
          setForcedIds(prev => ({ ...prev, [id]: result.liorenId }));
        }
        
        await refetchQuotes();
        setQuoteToManage(null);
      }
    } catch (err: any) { 
        toast({ variant: 'destructive', title: "Error al facturar", description: err.message }); 
    } finally { setIsProcessing(null); }
  };

  const handleSendEmail = async (quote: any) => {
    const email = quote.solicitanteData?.mail || quote.solicitante?.mail;
    if (!email) return alert("La cotización no tiene un email asociado.");
    setIsProcessing("email");
    try {
      const pdfBlob = await GeneradorPDF.generar(quote);
      const pdfBase64 = await blobToBase64(pdfBlob);
      const result = await enviarCotizacion({ clienteEmail: email, cotizacionId: quote.id.slice(-6).toUpperCase(), pdfBase64 });
      if (result.status === 'success') {
        await updateDoc(doc(firestore, 'cotizaciones', quote.id), { status: 'CORREO_ENVIADO', fechaEnvioEmail: new Date().toISOString() });
        toast({ title: "Correo enviado con éxito" });
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
      toast({ title: "Pago registrado", description: "El comprobante se subió correctamente." });
      await refetchQuotes();
      setQuoteToManage(null);
    } catch (err: any) { alert("Error al subir el archivo."); }
    finally { setIsUploading(false); }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-6 w-6 text-slate-300" /></div>;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-end mb-8">
        <div><h1 className="text-xl font-bold uppercase text-slate-800">Administración</h1><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestión DTE Araval</p></div>
        <div className="flex items-center gap-4">
          <Button onClick={() => refetchQuotes()} variant="outline" size="sm" className="h-9"><RefreshCw className="h-4 w-4 mr-2" /> Actualizar</Button>
          <Input placeholder="Buscar por ID, empresa..." className="w-64 h-9 text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white border rounded-sm shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50"><TableRow><TableHead className="py-3 px-6 text-[10px]">ID</TableHead><TableHead className="text-[10px]">Empresa</TableHead><TableHead className="text-center text-[10px]">Estado / DTE</TableHead><TableHead className="text-right px-6 text-[10px]">Acciones</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredQuotes.map((quote) => {
              const status = mapLegacyStatus(quote.status).toUpperCase();
              
              const hasIdInMemory = !!forcedIds[quote.id];
              const isFacturadoVisual = status === 'FACTURADO' || hasIdInMemory;
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
                      
                      {isFacturadoVisual && (
                        pdfUrl ? (
                          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 transition-colors shadow-sm" title="Ver Factura SII">
                            <FileText className="h-4 w-4" />
                          </a>
                        ) : (
                          <div title="Procesando DTE..." className="text-slate-400 animate-pulse"><Loader2 className="h-3 w-3" /></div>
                        )
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <Button variant="ghost" size="icon" className="hover:bg-slate-100 rounded-full" onClick={() => setQuoteToManage(quote)}><Eye className="h-4 w-4 text-slate-600" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!quoteToManage} onOpenChange={() => setQuoteToManage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          {quoteToManage && (
            <div className="flex flex-col">
              <div className="p-4 bg-slate-900 text-white flex flex-wrap gap-3 justify-between items-center sticky top-0 z-50">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Gestión de Orden</span>
                    <span className="text-sm font-bold">#{quoteToManage.id.slice(-6).toUpperCase()}</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => handleSendEmail(quoteToManage)} disabled={isProcessing === "email"} size="sm" className="bg-slate-700 hover:bg-slate-600 text-[10px] font-bold h-8 transition-all"><Send className="h-3 w-3 mr-1" /> EMAIL</Button>
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} size="sm" className="bg-blue-600 hover:bg-blue-500 text-[10px] font-bold h-8 transition-all"><UploadCloud className="h-3 w-3 mr-1" /> PAGO</Button>
                  <Button onClick={() => handleInvoiceNow(quoteToManage.id)} disabled={isProcessing === "invoice"} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold h-8 transition-all">
                     {isProcessing === "invoice" ? <Loader2 className="animate-spin h-3 w-3 mr-1"/> : <FileText className="h-3 w-3 mr-1" />} FACTURAR
                  </Button>
                  {(getLiorenPdfUrl(quoteToManage)) && (
                    <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold h-8 transition-all">
                      <a href={getLiorenPdfUrl(quoteToManage)!} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" /> VER PDF</a>
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
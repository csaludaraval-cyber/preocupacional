"use client";

import React, { useMemo, useState, useRef } from 'react';
import { useCotizaciones } from '@/hooks/use-cotizaciones';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, RefreshCw, Eye, FlaskConical, Download, ReceiptText, Trash2, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { DetalleCotizacion } from '@/components/cotizacion/DetalleCotizacion';
import { OrdenDeExamen } from '@/components/cotizacion/GeneradorPDF';
import { GeneradorPDF } from '../cotizacion/GeneradorPDF';
import { updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { mapLegacyStatus } from '@/lib/status-mapper';
import { ejecutarFacturacionSiiV2, probarConexionLioren } from '@/server/actions/facturacionActions';
import { enviarConfirmacionPago } from '@/server/actions/emailActions'; 
import { enviarCotizacion } from '@/ai/flows/enviar-cotizacion-flow';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';

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

  const getAtencionDate = (q: any) => {
    const fechaStr = q.solicitudesData?.[0]?.trabajador?.fechaAtencion;
    return fechaStr ? format(parseISO(fechaStr), 'dd/MM/yyyy') : 'S/F';
  };

  const getFilteredData = (statusKey: string) => {
    if (!quotes) return [];
    
    return quotes.filter(q => {
      const status = mapLegacyStatus(q.status).toUpperCase();
      const matchStatus = status === statusKey;
      const lowerSearch = searchTerm.toLowerCase();
      const matchSearch = q.empresaData?.razonSocial?.toLowerCase().includes(lowerSearch) || q.id.toLowerCase().includes(lowerSearch);
      return matchStatus && matchSearch;
    }).sort((a: any, b: any) => {
      // ORDENAMIENTO DESCENDENTE POR FECHA DE ATENCIÓN (EL FUTURO MÁS LEJANO PRIMERO)
      const dateA = a.solicitudesData?.[0]?.trabajador?.fechaAtencion;
      const dateB = b.solicitudesData?.[0]?.trabajador?.fechaAtencion;
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      return timeB - timeA;
    });
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
      await enviarConfirmacionPago(quoteToManage);
      toast({ title: "Pago registrado" });
      await refetchQuotes();
      setQuoteToManage(null);
    } catch (err: any) { toast({ title: "Error al subir", variant: "destructive" }); }
    finally { setIsUploading(false); }
  };

  const handleSendEmail = async (quote: any) => {
    setIsProcessing("email");
    try {
      const pdfBlob = await GeneradorPDF.generar(quote);
      const pdfBase64 = await blobToBase64(pdfBlob);
      const result = await enviarCotizacion({ clienteEmail: quote.solicitanteData?.mail, cotizacionId: quote.id.slice(-6).toUpperCase(), pdfBase64 });
      if (result.status === 'success') {
        await updateDoc(doc(firestore, 'cotizaciones', quote.id), { status: 'CORREO_ENVIADO' });
        toast({ title: "Cotización enviada" });
        await refetchQuotes();
        setQuoteToManage(null);
      }
    } catch (err: any) { toast({ title: "Error", variant: "destructive" }); }
    finally { setIsProcessing(null); }
  };

  const handleDelete = async (id: string) => {
    if(confirm("¿Eliminar orden permanentemente?")) {
        try {
            await deleteDoc(doc(firestore, 'cotizaciones', id));
            toast({ title: "Orden eliminada" });
            refetchQuotes();
        } catch (e) { toast({ title: "Error", variant: "destructive" }); }
    }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-6 w-6 text-slate-300" /></div>;

  const RenderTable = ({ data, allowDelete }: { data: any[], allowDelete: boolean }) => (
    <div className="bg-white border shadow-2xl rounded-xl overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-900">
          <TableRow>
            <TableHead className="py-4 px-6 text-[10px] uppercase font-black text-white tracking-widest">ID Orden / Atención</TableHead>
            <TableHead className="text-[10px] uppercase font-black text-white tracking-widest">Empresa Cliente</TableHead>
            <TableHead className="text-center text-[10px] uppercase font-black text-white tracking-widest w-[300px]">Estado / Auditoría</TableHead>
            <TableHead className="text-right px-6 text-[10px] uppercase font-black text-white tracking-widest">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? data.map((quote) => {
            const status = mapLegacyStatus(quote.status).toUpperCase();
            const isFrecuente = quote.empresaData?.modalidadFacturacion === 'frecuente';
            return (
              <TableRow key={quote.id} className="text-xs hover:bg-slate-50 transition-colors border-slate-100">
                <TableCell className="px-6">
                    <div className="flex flex-col text-left">
                        <span className="font-mono font-black text-blue-600 uppercase">#{quote.id.slice(-6).toUpperCase()}</span>
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Clock className="h-2.5 w-2.5"/> {getAtencionDate(quote)}</span>
                    </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-left">
                      <span className="font-black text-slate-700 uppercase tracking-tighter leading-tight">{quote.empresaData?.razonSocial}</span>
                      <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">
                        {quote.empresaData?.rut} | <span className={isFrecuente ? "text-blue-600 font-black" : "text-slate-400"}>{isFrecuente ? 'FRECUENTE' : 'NORMAL'}</span>
                      </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-6">
                    <Badge className={`min-w-[115px] justify-center font-black text-[9px] uppercase border-none py-1.5 ${status === 'FACTURADO' ? 'bg-[#0a0a4d]' : status === 'PAGADO' ? 'bg-blue-600' : status === 'CORREO_ENVIADO' ? 'bg-amber-500' : 'bg-slate-300'} text-white`}>{status}</Badge>
                    <div className="flex items-center gap-3 border-l pl-6 border-slate-100">
                      <FileText className="h-5 w-5 text-emerald-500 opacity-80" />
                      <Download className={`h-5 w-5 ${!!quote.pagoVoucherUrl ? 'text-emerald-500 cursor-pointer' : 'text-slate-200'}`} onClick={() => quote.pagoVoucherUrl && window.open(quote.pagoVoucherUrl, '_blank')} />
                      <ReceiptText className={`h-5 w-5 ${status === 'FACTURADO' ? 'text-emerald-500 cursor-pointer' : 'text-slate-200'}`} onClick={() => quote.liorenPdfUrl && window.open(quote.liorenPdfUrl, '_blank')} />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right px-6">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="hover:bg-blue-50" onClick={() => setQuoteToManage(quote)}><Eye className="h-4 w-4 text-blue-600" /></Button>
                    {allowDelete && <Button variant="ghost" size="icon" className="text-slate-200 hover:text-red-500" onClick={() => handleDelete(quote.id)}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            );
          }) : (
            <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-400 text-[10px] uppercase font-bold tracking-widest italic opacity-50">No hay registros para mostrar</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="container mx-auto p-4 max-w-7xl font-sans pb-20">
      <div className="flex justify-between items-end mb-10 text-left">
        <div className="space-y-1">
            <h1 className="text-2xl font-black uppercase text-slate-800 tracking-tighter">Administración</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Gestión de Ordenes Araval</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={async () => { const res = await probarConexionLioren(); alert(res.message || res.error); }} className="bg-[#0a0a4d] hover:bg-slate-800 text-white font-black h-10 text-[10px] tracking-widest px-6 italic">TEST SII</Button>
          <Button onClick={() => refetchQuotes()} variant="outline" size="sm" className="h-10 w-10 border-slate-200 bg-white"><RefreshCw className="h-4 w-4 text-slate-400" /></Button>
          <Input placeholder="Buscar empresa..." className="w-64 h-10 text-xs font-bold bg-white border-slate-200" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="CONFIRMADA" className="w-full">
        <TabsList className="flex flex-col md:grid md:grid-cols-4 mb-6 bg-[#0a0a4d] p-0 h-auto md:h-12 rounded-lg border-none shadow-md overflow-hidden">
          <TabsTrigger value="CONFIRMADA" className="h-12 md:h-full rounded-none text-[11px] font-black uppercase border-b border-white/5 md:border-none text-white/65 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Confirmadas</TabsTrigger>
          <TabsTrigger value="CORREO_ENVIADO" className="h-12 md:h-full rounded-none text-[11px] font-black uppercase border-b border-white/5 md:border-none text-white/65 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Enviadas</TabsTrigger>
          <TabsTrigger value="PAGADO" className="h-12 md:h-full rounded-none text-[11px] font-black uppercase border-b border-white/5 md:border-none text-white/65 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Pagadas</TabsTrigger>
          <TabsTrigger value="FACTURADO" className="h-12 md:h-full rounded-none text-[11px] font-black uppercase text-white/65 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Facturadas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="CONFIRMADA"><RenderTable data={getFilteredData('CONFIRMADA')} allowDelete={true} /></TabsContent>
        <TabsContent value="CORREO_ENVIADO"><RenderTable data={getFilteredData('CORREO_ENVIADO')} allowDelete={true} /></TabsContent>
        <TabsContent value="PAGADO"><RenderTable data={getFilteredData('PAGADO')} allowDelete={false} /></TabsContent>
        <TabsContent value="FACTURADO"><RenderTable data={getFilteredData('FACTURADO')} allowDelete={false} /></TabsContent>
      </Tabs>

      <Dialog open={!!quoteToManage} onOpenChange={() => setQuoteToManage(null)}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl bg-slate-100">
          <div className="sr-only"><DialogHeader><DialogTitle>Auditoría Documental</DialogTitle></DialogHeader></div>
          {quoteToManage && (
            <div className="flex flex-col gap-6 pb-20">
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-50 shadow-xl">
                <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em]">Gestión de Orden</span>
                    <span className="text-xl font-black italic">#{quoteToManage.id.slice(-6).toUpperCase()}</span>
                </div>
                <div className="flex gap-3">
                  {(() => {
                    const status = mapLegacyStatus(quoteToManage.status).toUpperCase();
                    if (status === 'CONFIRMADA') return <Button onClick={() => handleSendEmail(quoteToManage)} disabled={isProcessing === "email"} className="bg-blue-600 hover:bg-blue-500 font-black text-[10px] h-10 px-6 uppercase tracking-widest shadow-md">{isProcessing === "email" ? <Loader2 className="animate-spin h-4 w-4" /> : "Enviar Cotización"}</Button>;
                    if (status === 'CORREO_ENVIADO') return <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-amber-500 hover:bg-amber-400 font-black text-[10px] h-10 px-6 uppercase tracking-widest shadow-md">{isUploading ? <Loader2 className="animate-spin h-4 w-4" /> : "Subir Voucher"}</Button>;
                    if (status === 'PAGADO') return <Button onClick={async () => { setIsProcessing("inv"); await ejecutarFacturacionSiiV2(quoteToManage.id); await refetchQuotes(); setQuoteToManage(null); setIsProcessing(null); }} disabled={isProcessing === "inv"} className="bg-emerald-600 hover:bg-emerald-500 font-black text-[10px] h-10 px-6 uppercase tracking-widest shadow-md">{isProcessing === "inv" ? <Loader2 className="animate-spin h-4 w-4" /> : "Facturar SII"}</Button>;
                    return null;
                  })()}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf"/>
              </div>
              <div className="bg-white shadow-sm mx-auto w-full max-w-4xl rounded-lg overflow-hidden border border-slate-200"><DetalleCotizacion quote={quoteToManage} /></div>
              <div className="space-y-8">
                  <div className="max-w-4xl mx-auto px-10 text-left"><h3 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] border-b pb-2">Anexos: Órdenes de Atención</h3></div>
                  {quoteToManage.solicitudesData?.map((sol: any, i: number) => (
                      <div key={i} className="bg-white shadow-sm mx-auto w-full max-w-4xl rounded-lg overflow-hidden border-2 border-dashed border-slate-200">
                          <OrdenDeExamen solicitud={sol} empresa={quoteToManage.empresaData} fechaCotizacion={format(new Date(), 'dd/MM/yyyy')} />
                      </div>
                  ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
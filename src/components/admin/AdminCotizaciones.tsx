"use client";

import React, { useMemo, useState, useRef } from 'react';
import { useCotizaciones } from '@/hooks/use-cotizaciones';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Trash2, 
  MoreVertical, 
  FileText, 
  UploadCloud, 
  FileCheck, 
  AlertTriangle, 
  FlaskConical, 
  ExternalLink,
  Download,
  XCircle,
  ClipboardCopy
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { DetalleCotizacion } from '@/components/cotizacion/DetalleCotizacion';
import { useRouter } from 'next/navigation';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Cotizacion } from '@/lib/types';
import { mapLegacyStatus } from '@/lib/status-mapper';
import { ejecutarFacturacionSiiV2, probarConexionLioren } from '@/server/actions/facturacionActions';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const QuoteStatusMap: Record<string, 'default' | 'outline' | 'destructive' | 'secondary'> = {
  PENDIENTE: 'secondary',
  CONFIRMADA: 'outline',
  CORREO_ENVIADO: 'outline',
  PAGADO: 'default',
  FACTURADO: 'default',
  RECHAZADA: 'destructive',
  orden_examen_enviada: 'secondary', 
};

export default function AdminCotizaciones() {
  const { quotes, isLoading, error, refetchQuotes } = useCotizaciones();
  const [quoteToDelete, setQuoteToDelete] = useState<Cotizacion | null>(null);
  const [quoteToManage, setQuoteToManage] = useState<Cotizacion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInvoicing, setIsInvoicing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  // --- UTILIDADES DE TIEMPO SEGURAS ---
  const getMs = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    return new Date(ts).getTime() || 0;
  };

  const formatDate = (ts: any) => {
    const ms = getMs(ts);
    if (ms === 0) return 'N/A';
    return new Date(ms).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const sortedQuotes = useMemo(() => {
    if (!quotes) return [];
    return [...quotes].sort((a, b) => getMs(b.fechaCreacion) - getMs(a.fechaCreacion));
  }, [quotes]);

  // --- MANEJADORES DE LIOREN ---
  const handleTestLioren = async () => {
    toast({ title: 'Probando conexión...', description: 'Consultando identidad del Token en el servidor.' });
    try {
      const result = await probarConexionLioren();
      if (result.success) {
        alert(`✅ CONEXIÓN EXITOSA\n\nEmpresa: ${result.data.razonSocial || result.data.rs}\nRUT: ${result.data.rut}\n\nAmbiente reconocido por el API.`);
      } else {
        alert(`❌ ERROR DE COMUNICACIÓN\n\nDetalle: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error técnico: ${err.message}`);
    }
  };

  const handleInvoiceNow = async (quoteId: string) => {
    setIsInvoicing(quoteId);
    toast({ title: "Iniciando Facturación", description: "Conectando con el servidor legal del SII..." });

    try {
      const result = await ejecutarFacturacionSiiV2(quoteId);
      
      if (result.success) {
        toast({ title: 'Éxito Total', description: `Factura emitida: Folio ${result.folio}` });
        refetchQuotes();
        setQuoteToManage(null);
      } else {
        toast({ 
          variant: 'destructive', 
          title: 'FALLO EN EL PASO TÉCNICO', 
          description: result.error 
        });
      }
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'ERROR DE RED', 
        description: 'No se pudo contactar al servidor de facturación.' 
      });
    } finally {
      setIsInvoicing(null);
    }
  };

  // --- MANEJADORES DE ARCHIVOS Y ESTADO ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0] || !quoteToManage) return;
    const file = event.target.files[0];
    setIsUploading(true);
    try {
      const storage = getStorage();
      const fileRef = storageRef(storage, `vouchers/${quoteToManage.id}_${Date.now()}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      
      const docRef = doc(firestore, 'cotizaciones', quoteToManage.id);
      await updateDoc(docRef, { pagoVoucherUrl: url, status: 'PAGADO' });

      setQuoteToManage(prev => prev ? { ...prev, pagoVoucherUrl: url, status: 'PAGADO' } : null);
      toast({ title: 'Voucher Subido', description: 'Estado actualizado a: PAGADO' });
      refetchQuotes();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error de Carga', description: 'Fallo al subir el archivo a Storage.' });
    } finally { setIsUploading(false); }
  };

  const handleDelete = async () => {
    if (!quoteToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'cotizaciones', quoteToDelete.id));
      toast({ title: 'Eliminada', description: `Cotización eliminada correctamente.` });
      refetchQuotes();
      setQuoteToDelete(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally { setIsDeleting(false); }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (error) return <Alert variant="destructive"><XCircle className="h-4 w-4"/><AlertTitle>Error Crítico</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;

  return (
    <div className="container mx-auto p-4 bg-white rounded-lg shadow-sm border">
      {/* CABECERA CON BOTÓN DE TEST */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b">
        <h1 className="text-2xl font-bold uppercase font-headline tracking-tight text-slate-800">Administración de Cotizaciones</h1>
        <Button onClick={handleTestLioren} variant="outline" className="border-blue-200 hover:bg-blue-50 text-blue-600">
          <FlaskConical className="mr-2 h-4 w-4" /> Probar Conexión Lioren
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Empresa / Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto (CLP)</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center w-[150px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedQuotes.map((quote) => {
              const displayStatus = mapLegacyStatus(quote.status);
              return (
                <TableRow key={quote.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-mono text-xs font-bold">{quote.id?.slice(-6)}</TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-700">{quote.empresaData?.razonSocial || 'N/A'}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{quote.solicitanteData?.nombre}</div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{formatDate(quote.fechaCreacion)}</TableCell>
                  <TableCell className="font-bold text-primary">
                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(quote.total || 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={QuoteStatusMap[displayStatus] || 'default'} className="font-bold">{displayStatus}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setQuoteToManage(quote)}><FileText className="mr-2 h-4 w-4"/> Gestionar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/cotizacion?data=${encodeURIComponent(JSON.stringify(quote))}`)}><Download className="mr-2 h-4 w-4"/> Ver PDF Cotización</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setQuoteToDelete(quote)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* MODAL DE GESTIÓN (SUBIDA Y FACTURACIÓN) */}
      <Dialog open={!!quoteToManage} onOpenChange={(isOpen) => !isOpen && setQuoteToManage(null)}>
        <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
          {quoteToManage && (() => {
            const displayStatus = mapLegacyStatus(quoteToManage.status);
            return (
            <>
              <DialogHeader className="p-6 bg-slate-50 border-b">
                <div className="flex justify-between items-center w-full pr-8">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        Gestión de Cotización <Badge variant="outline">{quoteToManage.id?.slice(-6)}</Badge>
                    </DialogTitle>
                    <Badge variant={QuoteStatusMap[displayStatus] || 'default'} className="text-sm uppercase py-1 px-3">
                        {displayStatus}
                    </Badge>
                </div>
              </DialogHeader>

              <div className="p-6 bg-white border-b flex flex-col md:flex-row gap-4 items-center justify-between">
                 <div className="flex items-center gap-4 w-full md:w-auto">
                    {displayStatus === 'CONFIRMADA' && (
                        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full md:w-auto">
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4"/>}
                            Subir Comprobante de Pago
                        </Button>
                    )}
                    {quoteToManage.pagoVoucherUrl && displayStatus !== 'FACTURADO' && (
                        <Alert className="bg-amber-50 border-amber-200 py-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600"/>
                            <AlertTitle className="text-amber-800 text-xs font-bold">Pago por Facturar</AlertTitle>
                            <a href={quoteToManage.pagoVoucherUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-700 underline flex items-center gap-1">
                                <ExternalLink className="h-3 w-3"/> Ver Comprobante
                            </a>
                        </Alert>
                    )}
                 </div>

                 <div className="flex gap-2 w-full md:w-auto">
                    {displayStatus === 'PAGADO' && (
                        <Button onClick={() => handleInvoiceNow(quoteToManage.id)} disabled={!!isInvoicing} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">
                            {isInvoicing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileText className="mr-2 h-4 w-4"/>}
                            Emitir Factura Legal (Lioren)
                        </Button>
                    )}
                    {displayStatus === 'FACTURADO' && quoteToManage.liorenPdfUrl && (
                        <Button asChild className="bg-green-600 hover:bg-green-700 w-full md:w-auto text-white">
                            <a href={quoteToManage.liorenPdfUrl} target="_blank" rel="noopener noreferrer">
                                <FileCheck className="mr-2 h-4 w-4"/> Descargar Factura SII
                            </a>
                        </Button>
                    )}
                 </div>
                 <Input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf" />
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50">
                <DetalleCotizacion quote={quoteToManage} />
              </div>
            </>
          )})()}
        </DialogContent>
      </Dialog>
      
      {/* ALERT DIALOG ELIMINACIÓN */}
      <AlertDialog open={!!quoteToDelete} onOpenChange={(open) => !open && setQuoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará permanentemente el registro de la base de datos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-white">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Confirmar Eliminación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
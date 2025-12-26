
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Send, Download, Check, X, ClipboardCopy, Trash2, FlaskConical, MoreVertical, FileText, UploadCloud, FileCheck, ExternalLink } from 'lucide-react';
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
import { GeneradorPDF } from '@/components/cotizacion/GeneradorPDF';
import { DetalleCotizacion } from '@/components/cotizacion/DetalleCotizacion';
import { enviarCotizacion } from '@/ai/flows/enviar-cotizacion-flow';
import { useRouter } from 'next/navigation';
import { deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Cotizacion, CotizacionFirestore, WithId, StatusCotizacion } from '@/lib/types';
import { emitirDTEInmediato } from '@/server/actions/facturacionActions';
import { Input } from '../ui/input';

const QuoteStatusMap: Record<string, 'default' | 'outline' | 'destructive' | 'secondary' | 'success'> = {
  PENDIENTE: 'secondary',
  CONFIRMADA: 'default',
  CORREO_ENVIADO: 'default',
  PAGADO: 'success',
  FACTURADO: 'success',
  RECHAZADA: 'destructive',
  orden_examen_enviada: 'secondary',
  facturado_lioren: 'success', 
};


const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        if (typeof base64data !== 'string') {
          return reject(new Error('Error convirtiendo PDF a Base64'));
        }
        resolve(base64data.split(',')[1]);
      };
      reader.onerror = (error) => {
        reject(new Error('Fallo la lectura del Blob del PDF: ' + error));
      };
      reader.readAsDataURL(blob);
    });
};


export default function AdminCotizaciones() {
  const { quotes, isLoading, error, refetchQuotes } = useCotizaciones();
  
  const [quoteToDelete, setQuoteToDelete] = useState<Cotizacion | null>(null);
  const [quoteToManage, setQuoteToManage] = useState<Cotizacion | null>(null);
  
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInvoicing, setIsInvoicing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const router = useRouter();


  const handleSendEmail = async (quote: Cotizacion | null) => {
    if (!quote) return;

    const recipientEmail = quote.solicitanteData?.mail;

    if (!recipientEmail) {
      toast({
        title: 'Error de Destinatario',
        description: 'No se encontró un correo de solicitante para enviar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const { fechaCreacion, ...quoteForPdf } = quote;

      const pdfBlob = await GeneradorPDF.generar(quoteForPdf as Cotizacion, true);
      
      const pdfBase64 = await blobToBase64(pdfBlob);

      await enviarCotizacion({
        clienteEmail: recipientEmail,
        cotizacionId: quote.id?.slice(-6) || 'S/N',
        pdfBase64: pdfBase64,
      });

      if (quote.status !== 'CORREO_ENVIADO') {
        await handleUpdateStatus(quote.id, 'CORREO_ENVIADO');
      }

      toast({
        title: 'Correo Enviado',
        description: `La cotización se ha enviado a ${recipientEmail}.`,
      });
      // Optimistically update status in the modal
       setQuoteToManage(prev => prev ? ({ ...prev, status: 'CORREO_ENVIADO' }) : null);

    } catch (error: any) {
      console.error('Error al enviar cotización:', error);
      toast({
        title: 'Error Crítico de Envío',
        description: error.message || 'No se pudo completar el envío. Revise la consola.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (quoteId: string, newStatus: StatusCotizacion) => {
    if (!quoteId) return;
    setIsUpdatingStatus(true);
    try {
      const quoteRef = doc(firestore, 'cotizaciones', quoteId);
      await updateDoc(quoteRef, { status: newStatus });
      toast({
        title: 'Estado Actualizado',
        description: `La cotización ahora está en estado: ${newStatus}`,
      });
      refetchQuotes();
      // Optimistically update status in the modal
      setQuoteToManage(prev => prev ? { ...prev, status: newStatus } : null);

    } catch (error: any) {
      console.error('Error al actualizar estado:', error);
      toast({
        title: 'Error al actualizar estado',
        description: `Fallo al actualizar el estado: ${error.code || error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };


  const handleDelete = async (quote: Cotizacion | null) => {
    if (!quote || !quote.id) return;
    setIsDeleting(true);
    try {
      const quoteRef = doc(firestore, 'cotizaciones', quote.id);
      await deleteDoc(quoteRef);
      toast({
        title: "Cotización Eliminada",
        description: `La cotización N° ${quote.id.slice(-6)} ha sido eliminada.`,
      });
      refetchQuotes();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar la cotización.",
      });
    } finally {
      setIsDeleting(false);
      setQuoteToDelete(null);
    }
  };

  const handleInvoiceNow = async (quoteId: string) => {
    toast({
      title: "Iniciando facturación...",
      description: `Se está procesando la factura para la cotización ${quoteId.slice(-6)}.`,
    });
    
    setIsInvoicing(quoteId);
    try {
      const result = await emitirDTEInmediato(quoteId);
      if (result.success) {
        toast({
          title: 'Factura Emitida',
          description: `DTE Folio ${result.folio} enviado a Lioren.`,
        });
        refetchQuotes();
        // Cierra el dialogo si la facturación es exitosa
        setQuoteToManage(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al Facturar',
        description: error.message,
      });
    } finally {
      setIsInvoicing(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !quoteToManage) {
      return;
    }
    const file = event.target.files[0];
    const quoteId = quoteToManage.id;
    
    setIsUploading(true);
    try {
      const storage = getStorage();
      const filePath = `vouchers/${quoteId}_${file.name}`;
      const fileRef = storageRef(storage, filePath);
      
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      
      const quoteDocRef = doc(firestore, 'cotizaciones', quoteId);
      await updateDoc(quoteDocRef, {
        pagoVoucherUrl: downloadURL,
        status: 'PAGADO',
      });

      // Optimistically update local state to reflect the change
      setQuoteToManage(prev => prev ? ({ ...prev, pagoVoucherUrl: downloadURL, status: 'PAGADO' }) : null);

      toast({
        title: 'Voucher Subido Correctamente',
        description: 'Estado actualizado a PAGADO.',
      });

      refetchQuotes(); // Refrescar los datos para asegurar consistencia
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        variant: 'destructive',
        title: 'Error de Carga',
        description: error.message || 'No se pudo subir el archivo.',
      });
    } finally {
      setIsUploading(false);
    }
  };


  const handleOpenDownloadPage = (quote: any) => {
    const dataString = encodeURIComponent(JSON.stringify(quote));
    router.push(`/cotizacion?data=${dataString}`);
  };

  const handleCopyQuoteId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: 'Copiado',
      description: `ID de Cotización (${id.slice(-6)}) copiado al portapapeles.`,
    });
  };

  const sortedQuotes = useMemo(() => {
    if (!quotes) return [];
    return [...quotes].sort((a, b) => {
        const dateA = a.fechaCreacion?.seconds || 0;
        const dateB = b.fechaCreacion?.seconds || 0;
        return dateB - dateA;
    });
  }, [quotes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <span className="text-xl text-gray-600">Cargando cotizaciones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded">
        <h2 className="text-xl font-bold">Error de Carga</h2>
        <p>No se pudieron cargar las cotizaciones: {error.message}</p>
      </div>
    );
  }

  return (
      <>
        <div className="container mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-xl">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 uppercase font-headline">Administración de Cotizaciones</h1>

          {sortedQuotes.length === 0 ? (
            <div className="text-center p-10 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <p className="text-lg text-gray-500">No hay cotizaciones pendientes ni creadas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Email Solicitante</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center w-[200px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedQuotes.map((quote) => {
                    const isBilled = quote.status === 'FACTURADO' || quote.status === 'facturado_lioren';
                    
                    return (
                    <TableRow key={quote.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium flex items-center space-x-2">
                        <span>{quote.id.slice(-6)}</span>
                        <ClipboardCopy
                          className="h-4 w-4 cursor-pointer text-gray-400 hover:text-primary transition-colors"
                          onClick={() => handleCopyQuoteId(quote.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-700">{quote.empresaData?.razonSocial || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{quote.solicitanteData?.nombre || 'N/A'}</div>
                      </TableCell>
                      <TableCell>{quote.solicitanteData?.mail || 'N/A'}</TableCell>
                      <TableCell>
                        {quote.fechaCreacion ? format(new Date(quote.fechaCreacion.seconds * 1000), 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A'}
                      </TableCell>
                      <TableCell className="font-bold text-lg text-primary">
                        {new Intl.NumberFormat('es-CL', {
                          style: 'currency',
                          currency: 'CLP',
                          minimumFractionDigits: 0,
                        }).format(quote.total || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={QuoteStatusMap[quote.status] || 'default'} className="uppercase">
                          {quote.status === 'facturado_lioren' ? 'FACTURADO' : quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                          {isBilled && (
                            <Button asChild size="sm" variant="secondary" className='bg-green-600 hover:bg-green-700 text-white'>
                                <a href={quote.liorenPdfUrl} target="_blank" rel="noopener noreferrer">
                                    <FileCheck className="mr-2 h-4 w-4"/> Ver Factura
                                </a>
                            </Button>
                          )}
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-9 w-9">
                                      <MoreVertical className="h-4 w-4" />
                                      <span className="sr-only">Acciones</span>
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setQuoteToManage(quote)}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Gestionar Cotización
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenDownloadPage(quote)}>
                                      <Download className="mr-2 h-4 w-4" />
                                      Ver / Descargar PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setQuoteToDelete(quote)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Dialog open={!!quoteToManage} onOpenChange={(open) => !open && setQuoteToManage(null)}>
          <DialogContent className="max-w-6xl w-[95%] h-[95%] flex flex-col p-6">
            {quoteToManage && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">
                    Gestión de Cotización ID: {quoteToManage?.id?.slice(-6)}
                    <Badge variant={QuoteStatusMap[quoteToManage?.status] || 'default'} className="ml-3 text-lg uppercase">
                      {quoteToManage?.status === 'facturado_lioren' ? 'FACTURADO' : quoteToManage.status}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border mb-4 sticky top-0 z-10">
                   <div className="flex items-center gap-4">
                     {['CONFIRMADA', 'CORREO_ENVIADO'].includes(quoteToManage.status) && !quoteToManage.pagoVoucherUrl && (
                        <>
                         <Input id="voucherUpload" type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png" />
                          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                            Subir Voucher
                          </Button>
                        </>
                     )}
                     {quoteToManage.pagoVoucherUrl && (
                        <div className='flex items-center gap-2 text-sm text-green-600'>
                            <FileCheck className="h-5 w-5" />
                            <span>Voucher Cargado</span>
                             <a href={quoteToManage.pagoVoucherUrl} target="_blank" rel="noopener noreferrer" className="ml-2 hover:underline">
                                <ExternalLink className='h-4 w-4'/>
                            </a>
                        </div>
                     )}
                   </div>
                   <div className="flex space-x-3">
                     {['CONFIRMADA', 'CORREO_ENVIADO'].includes(quoteToManage.status) && (
                        <Button variant="outline" onClick={() => handleSendEmail(quoteToManage)} disabled={isSending}>
                          {isSending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : <><Send className="mr-2 h-4 w-4" /> Enviar Correo</>}
                        </Button>
                     )}
                     {quoteToManage.status === 'PAGADO' && (
                        <Button onClick={() => handleInvoiceNow(quoteToManage.id)} disabled={isInvoicing}>
                            {isInvoicing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                            {isInvoicing ? 'Facturando...' : 'Facturar Ahora'}
                        </Button>
                     )}
                     {(quoteToManage.status === 'FACTURADO' || quoteToManage.status === 'facturado_lioren') && (
                        <Button asChild variant="secondary" className='bg-green-600 hover:bg-green-700 text-white'>
                            <a href={quoteToManage.liorenPdfUrl} target="_blank" rel="noopener noreferrer">
                                <FileCheck className="mr-2 h-4 w-4"/> Ver Factura Emitida
                            </a>
                        </Button>
                     )}
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto bg-gray-100 p-4 rounded-lg">
                  <DetalleCotizacion quote={quoteToManage} />
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!quoteToDelete} onOpenChange={(open) => !open && setQuoteToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente la cotización
                        <span className='font-bold'> N° {quoteToDelete?.id.slice(-6)} </span>
                        de los servidores.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(quoteToDelete)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Eliminar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
  );
}

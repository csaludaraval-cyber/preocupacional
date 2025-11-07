
"use client";

import React, { useMemo, useState } from 'react';
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
import { Loader2, Send, Download, Check, X, ClipboardCopy, Trash2, FileCheck2, FlaskConical } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { GeneradorPDF, OrdenDeExamen } from '@/components/cotizacion/GeneradorPDF';
import { enviarCotizacion } from '@/ai/flows/enviar-cotizacion-flow';
import { useRouter } from 'next/navigation';
import { updateQuoteStatus, deleteQuote } from '@/lib/firestore';
import type { Cotizacion, CotizacionFirestore, WithId, StatusCotizacion } from '@/lib/types';
import { createSimpleFacturaInvoice } from '@/server/simplefactura';
import { updateCotizacionStatus } from '@/server/cotizaciones';
import { cleanRut } from '@/lib/utils';
import { DTE_TIPO } from '@/config/simplefactura';

const QuoteStatusMap: Record<string, 'default' | 'outline' | 'destructive' | 'secondary' | 'success'> = {
  PENDIENTE: 'secondary',
  ENVIADA: 'default',
  ACEPTADA: 'success',
  RECHAZADA: 'destructive',
  facturado_simplefactura: 'default',
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

const downloadPdfFromBase64 = (base64: string, folio: number, quote: Cotizacion) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const cleanedRut = cleanRut(quote.empresaData.rut);
    link.download = `FACTURA_DTE${DTE_TIPO.FACTURA_EXENTA}_${folio}_${cleanedRut}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


export default function AdminCotizaciones() {
  const { quotes, isLoading, error, refetchQuotes } = useCotizaciones();
  
  const [quoteToDelete, setQuoteToDelete] = useState<Cotizacion | null>(null);
  const [quoteToSend, setQuoteToSend] = useState<Cotizacion | null>(null);
  
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [facturingQuoteId, setFacturingQuoteId] = useState<string | null>(null);

  const { toast } = useToast();
  const router = useRouter();


  const handleSendEmail = async (quote: Cotizacion | null) => {
    if (!quote) return;

    const recipientEmail = quote.solicitante?.mail;

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
      const pdfBlob = await GeneradorPDF.generar(quote);
      const pdfBase64 = await blobToBase64(pdfBlob);

      await enviarCotizacion({
        clienteEmail: recipientEmail,
        cotizacionId: quote.id?.slice(-6) || 'S/N',
        pdfBase64: pdfBase64,
      });

      // IMPORTANT: Only update status on successful send
      if (quote.status !== 'ENVIADA') {
        await handleUpdateStatus(quote.id, 'ENVIADA');
      }

      toast({
        title: 'Correo Enviado',
        description: `La cotización se ha enviado a ${recipientEmail}.`,
      });
      setQuoteToSend(null); // Close dialog on success

    } catch (error: any) {
      console.error('Error al enviar cotización:', error);
      toast({
        title: 'Error Crítico de Envío',
        description: error.message || 'No se pudo completar el envío.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (quoteId: string, newStatus: StatusCotizacion) => {
    setIsUpdatingStatus(true);
    try {
        const result = await updateCotizacionStatus(quoteId, newStatus);
        if (result.success) {
            toast({
                title: 'Estado Actualizado',
                description: `La cotización ${quoteId.slice(-6)} ahora está en estado: ${newStatus}`,
            });
            refetchQuotes(); // Refrescar los datos para mostrar el cambio
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
      console.error('Error al actualizar estado:', error);
      toast({
        title: 'Error al Actualizar Estado',
        description: 'No se pudo guardar el nuevo estado. Intente de nuevo.',
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
      await deleteQuote(quote.id);
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
      setQuoteToDelete(null); // Close confirmation dialog
    }
  };

  const handleImmediateInvoice = async (quote: Cotizacion) => {
    setFacturingQuoteId(quote.id);
    try {
        // The server action expects the full CotizacionFirestore object.
        // We can reconstruct it from the Cotizacion object.
        const quoteToBill: WithId<CotizacionFirestore> = {
            id: quote.id,
            empresaId: quote.empresa.rut, // Assuming clean RUT is needed, server can handle it
            solicitanteId: quote.solicitante.rut, // Placeholder, may need user ID
            fechaCreacion: quote.fechaCreacion,
            total: quote.total,
            empresaData: quote.empresaData,
            solicitanteData: quote.solicitanteData,
            solicitudesData: quote.solicitudesData,
            status: 'ACEPTADA',
        }
        
        const { pdfBase64, folio } = await createSimpleFacturaInvoice(
            quote.empresaData,
            [quoteToBill],
            quote.total
        );

        toast({
            title: '¡Factura Inmediata Emitida!',
            description: `Se generó el DTE Folio N° ${folio}.`,
        });

        // Offer download
        downloadPdfFromBase64(pdfBase64, folio, quote);

        refetchQuotes();
    } catch(err: any) {
        toast({
            variant: 'destructive',
            title: 'Error al Facturar',
            description: err.message,
        });
    } finally {
        setFacturingQuoteId(null);
    }
  }


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
        const dateA = a.fechaCreacion?.toMillis() || 0;
        const dateB = b.fechaCreacion?.toMillis() || 0;
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
    <TooltipProvider>
      <div className="container mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Administración de Cotizaciones</h1>

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
                  <TableHead className="text-center w-[300px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedQuotes.map((quote) => {
                  const isNormalAccepted = quote.status === 'ACEPTADA' && quote.empresaData.modalidadFacturacion === 'normal';
                  const isFacturing = facturingQuoteId === quote.id;

                  return (
                  <TableRow key={quote.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium flex items-center space-x-2">
                      <span>{quote.id.slice(-6)}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <ClipboardCopy
                            className="h-4 w-4 cursor-pointer text-gray-400 hover:text-primary transition-colors"
                            onClick={() => handleCopyQuoteId(quote.id)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copiar ID completo</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-gray-700">{quote.empresa.razonSocial}</div>
                      <div className="text-sm text-gray-500">{quote.solicitante.nombre}</div>
                    </TableCell>
                    <TableCell>{quote.solicitante.mail}</TableCell>
                    <TableCell>
                      {quote.fechaCreacion ? format(quote.fechaCreacion.toDate(), 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A'}
                    </TableCell>
                    <TableCell className="font-bold text-lg text-primary">
                      {new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP',
                        minimumFractionDigits: 0,
                      }).format(quote.total || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={QuoteStatusMap[quote.status]}>
                        {quote.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center space-x-1">
                      {isNormalAccepted ? (
                        <Button variant="destructive" size="sm" onClick={() => handleImmediateInvoice(quote)} disabled={isFacturing}>
                          {isFacturing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileCheck2 className="mr-2 h-4 w-4"/>}
                          {isFacturing ? 'Facturando...' : 'Facturar Ahora (DTE)'}
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="default" size="sm" onClick={() => setQuoteToSend(quote)}>
                              Gestionar
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Ver detalles y gestionar envío/estado</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => handleOpenDownloadPage(quote)}
                            className="h-9 w-9"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver en página de descarga/exportación</p>
                        </TooltipContent>
                      </Tooltip>
                       <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" onClick={() => setQuoteToDelete(quote)} className="h-9 w-9">
                              <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Eliminar Cotización</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

    {/* Send Email Dialog */}
      <Dialog open={!!quoteToSend} onOpenChange={(open) => !open && setQuoteToSend(null)}>
        <DialogContent className="max-w-6xl w-[95%] h-[95%] flex flex-col p-6">
          {quoteToSend && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  Gestión de Cotización ID: {quoteToSend?.id?.slice(-6)}
                  <Badge variant={QuoteStatusMap[quoteToSend?.status || 'PENDIENTE']} className="ml-3 text-lg">
                    {quoteToSend?.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border mb-4 sticky top-0 z-10">
                <div className="flex space-x-3">
                   <Button
                      onClick={() => handleSendEmail(quoteToSend)}
                      disabled={isSending || isUpdatingStatus}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando a {quoteToSend.solicitante.mail}...</>
                      ) : (
                        <><Send className="mr-2 h-4 w-4" /> Confirmar Envío / Reenviar</>
                      )}
                    </Button>
                </div>
                 <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(quoteToSend.id, 'ACEPTADA')}
                    disabled={isUpdatingStatus || quoteToSend?.status === 'ACEPTADA' || quoteToSend?.status === 'RECHAZADA'}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Marcar como ACEPTADA
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(quoteToSend.id, 'RECHAZADA')}
                    disabled={isUpdatingStatus || quoteToSend?.status === 'ACEPTADA' || quoteToSend?.status === 'RECHAZADA'}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                    Marcar como RECHAZADA
                  </Button>
                  {quoteToSend.status === 'ENVIADA' && (
                    <Button
                        variant="secondary"
                        onClick={() => handleUpdateStatus(quoteToSend.id, 'ACEPTADA')}
                        disabled={isUpdatingStatus}
                    >
                        <FlaskConical className="mr-2 h-4 w-4" /> Forzar Aceptación (Prueba)
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-grow overflow-y-auto bg-gray-100 p-4 rounded-lg">
                {quoteToSend.solicitudesData && quoteToSend.solicitudesData.length > 0 ? (
                    <OrdenDeExamen solicitud={quoteToSend.solicitudesData[0]} empresa={quoteToSend.empresaData} />
                ) : (
                    <div className="text-center text-muted-foreground">No hay detalles de solicitud para mostrar.</div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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

    </TooltipProvider>
  );
}

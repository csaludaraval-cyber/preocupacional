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
import { Loader2, Send, Download, Check, X, ClipboardCopy } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GeneradorPDF } from '@/components/cotizacion/GeneradorPDF';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { enviarCotizacion } from '@/ai/flows/enviar-cotizacion-flow';
import { useRouter } from 'next/navigation';
import { updateQuoteStatus } from '@/lib/firestore';

// --- NUEVA LÓGICA DE GESTIÓN DE ESTADO ---
const QuoteStatusMap: Record<string, 'default' | 'outline' | 'destructive' | 'secondary' | 'success'> = {
  PENDIENTE: 'secondary',
  ENVIADA: 'default',
  ACEPTADA: 'success',
  RECHAZADA: 'destructive',
};

export default function AdminCotizaciones() {
  const { quotes, isLoading, error, refetchQuotes } = useCotizaciones();
  const [isSending, setIsSending] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSendEmail = async () => {
    if (!selectedQuote || isSending) return;

    const recipientEmail = selectedQuote.solicitante?.mail;
    if (!recipientEmail) {
      toast({
        title: 'Error de Destinatario',
        description: 'No se encontró un correo de solicitante para enviar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    let success = false;

    try {
      // 1. Generar PDF (GeneradorPDF ya tiene su try/catch interno)
      const pdfBlob = await GeneradorPDF.generar(selectedQuote);

      // 2. Convertir Blob a Base64
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          if (typeof base64data !== 'string') {
            return reject(new Error('Error convirtiendo PDF a Base64'));
          }
          resolve(base64data.split(',')[1]);
        };

        reader.onerror = () => {
          reject(new Error('Fallo la lectura del Blob del PDF.'));
        };

        reader.readAsDataURL(pdfBlob);
      });

      // 3. Enviar Correo usando el flow de AI
      await enviarCotizacion({
        clienteEmail: recipientEmail,
        cotizacionId: selectedQuote.id?.slice(-6) || 'S/N',
        pdfBase64: pdfBase64,
      });

      // 4. Actualizar estado y mostrar éxito
      await handleUpdateStatus('ENVIADA');

      toast({
        title: 'Correo Enviado',
        description: `La cotización se ha enviado a ${recipientEmail} y el estado ha sido actualizado.`,
      });
      success = true;

    } catch (error: any) {
      console.error('Error al enviar cotización:', error);
      toast({
        title: 'Error Crítico de Envío',
        description:
          error.message ||
          'No se pudo completar el envío. Revisar consola para más detalles (puede ser el PDF o el servicio de email).',
        variant: 'destructive',
      });
    } finally {
      // ESTE BLOQUE ES EL CRUCIAL: Detiene el estado de carga SIEMPRE.
      setIsSending(false);
      if (success) {
        setPreviewOpen(false);
      }
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedQuote) return;
    setIsUpdatingStatus(true);
    try {
      await updateQuoteStatus(selectedQuote.id, newStatus);
      toast({
        title: 'Estado Actualizado',
        description: `La cotización ${selectedQuote.id.slice(-6)} ahora está en estado: ${newStatus}`,
      });
      refetchQuotes();
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

  const handlePreviewQuote = (quote: any, viewType: 'preview' | 'download') => {
    if (viewType === 'preview') {
      setSelectedQuote(quote);
      setPreviewOpen(true);
    } else {
      const dataString = encodeURIComponent(JSON.stringify(quote));
      // Redirige a la vista de cotización con los datos para que el usuario pueda descargar o enviar.
      router.push(`/app/quote-view?data=${dataString}`);
    }
  };

  const handleCopyQuoteId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: 'Copiado',
      description: `ID de Cotización (${id.slice(-6)}) copiado al portapapeles.`,
    });
  };

  const filteredQuotes = useMemo(() => {
    return quotes.sort((a, b) => b.fechaCreacion.toMillis() - a.fechaCreacion.toMillis());
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

        {filteredQuotes.length === 0 ? (
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
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center w-[200px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => (
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
                    <TableCell>
                      {format(quote.fechaCreacion.toDate(), 'dd/MM/yyyy HH:mm', { locale: es })}
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
                    <TableCell className="text-center space-x-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePreviewQuote(quote, 'preview')}
                            disabled={isSending}
                          >
                            {quote.status === 'ENVIADA' ? 'Ver' : 'Gestionar'}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver detalles y gestionar envío/estado</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handlePreviewQuote(quote, 'download')}
                            disabled={isSending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver en página de descarga/exportación</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl w-[95%] h-[95%] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Gestión de Cotización ID: {selectedQuote?.id?.slice(-6)}
              <Badge variant={QuoteStatusMap[selectedQuote?.status || 'PENDIENTE']} className="ml-3 text-lg">
                {selectedQuote?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Área de Botones de Gestión */}
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border mb-4 sticky top-0 z-10">
            <div className="flex space-x-3">
              <Button
                onClick={handleSendEmail}
                disabled={isSending || isUpdatingStatus || selectedQuote?.status === 'ACEPTADA' || selectedQuote?.status === 'RECHAZADA'}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Confirmar Envío / Reenviar</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePreviewQuote(selectedQuote, 'download')}
                disabled={isSending || isUpdatingStatus}
              >
                <Download className="mr-2 h-4 w-4" /> Ver Descarga/Exportación
              </Button>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => handleUpdateStatus('ACEPTADA')}
                disabled={isUpdatingStatus || selectedQuote?.status === 'ACEPTADA' || selectedQuote?.status === 'RECHAZADA'}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                {isUpdatingStatus ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Marcar como ACEPTADA
              </Button>
              <Button
                variant="outline"
                onClick={() => handleUpdateStatus('RECHAZADA')}
                disabled={isUpdatingStatus || selectedQuote?.status === 'ACEPTADA' || selectedQuote?.status === 'RECHAZADA'}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                {isUpdatingStatus ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Marcar como RECHAZADA
              </Button>
            </div>
          </div>

          {/* Área de Visualización del Detalle (Ocupa el resto del espacio) */}
          <div className="flex-grow overflow-y-auto bg-gray-100 p-4 rounded-lg">
            {selectedQuote && <GeneradorPDF.OrdenDeExamen solicitud={selectedQuote.solicitudes[0]} empresa={selectedQuote.empresa} />}
            {/* NO usar DetalleCotizacion aquí directamente, ya que GeneradorPDF.OrdenDeExamen es un componente */}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
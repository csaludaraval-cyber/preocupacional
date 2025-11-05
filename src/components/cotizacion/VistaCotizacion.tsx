
"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Loader2, Send } from 'lucide-react';
import type { Cotizacion } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { enviarCotizacion } from '@/ai/flows/enviar-cotizacion-flow';
import { GeneradorPDF } from './GeneradorPDF';
import { DetalleCotizacion } from './DetalleCotizacion';

// Helper function to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result;
      if (typeof base64data !== 'string') {
        return reject(new Error('Error convirtiendo PDF a Base64'));
      }
      // Remove the data URI prefix
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = (error) => {
      reject(new Error('Fallo la lectura del Blob del PDF: ' + error));
    };
    reader.readAsDataURL(blob);
  });
};

export function VistaCotizacion() {
  const [quote, setQuote] = useState<Cotizacion | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(data));
        setQuote(parsedData);
      } catch (error) {
        console.error("Error parsing quote data:", error);
      }
    }
  }, [searchParams]);

  const handleExportPDF = async () => {
    if (loadingPdf || !quote) return;
    setLoadingPdf(true);
    try {
        const blob = await GeneradorPDF.generar(quote);
        const date = new Date();
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const month = monthNames[date.getMonth()];
        const day = date.getDate();
        const correlative = quote?.id ? quote.id.slice(-6) : "000000";
        const fileName = `Cot-${month}${day}-${correlative}.pdf`;
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error: any) {
      console.error("Error al generar PDF:", error);
      toast({
          title: "Error al generar PDF",
          description: error.message || "Hubo un problema al crear el archivo.",
          variant: "destructive"
      })
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleSendEmail = async () => {
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
      
      setSendingEmail(true);
      try {
        const pdfBlob = await GeneradorPDF.generar(quote);
        const pdfBase64 = await blobToBase64(pdfBlob);
        
        await enviarCotizacion({
            clienteEmail: recipientEmail,
            cotizacionId: quote.id?.slice(-6) || 'S/N',
            pdfBase64: pdfBase64,
        });

        toast({
            title: "Correo Enviado",
            description: `El correo con la cotización se ha enviado a ${recipientEmail}.`
        });

      } catch (error: any) {
          console.error("Error al enviar correo:", error);
          toast({
              title: "Error al Enviar Correo",
              description: error.message || "No se pudo enviar la cotización. Revise la consola para más detalles.",
              variant: "destructive",
          });
      } finally {
          setSendingEmail(false);
      }
  };


  if (!quote) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-md flex items-center justify-center">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
        <h2 className="text-xl font-semibold">Cargando cotización...</h2>
      </div>
    );
  }

  return (
    <>
      <div id="button-container" className="flex justify-end gap-2 mb-4 print:hidden">
        <Button onClick={handleSendEmail} disabled={sendingEmail || loadingPdf || !quote.solicitante?.mail}>
          {sendingEmail ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
          ) : (
            <><Send className="mr-2 h-4 w-4" /> Enviar por Email</>
          )}
        </Button>
        <Button onClick={handleExportPDF} disabled={loadingPdf || sendingEmail} variant="secondary">
          {loadingPdf ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exportando...</>
          ) : (
            <><Download className="mr-2 h-4 w-4" /> Exportar a PDF</>
          )}
        </Button>
      </div>

       <div id="pdf-content-area" className="bg-gray-100 p-0 sm:p-4 print:p-0 print:bg-white">
        <DetalleCotizacion quote={quote} />
      </div>

      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #button-container, #pdf-content-area > .bg-gray-100 {
            display: none !important;
          }
           .print-container {
             page-break-before: always;
          }
        }
      `}</style>
    </>
  );
}

    

"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Download, Loader2, Send } from 'lucide-react';
import type { Cotizacion, Empresa, SolicitudTrabajador, Examen } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { enviarCotizacion } from '@/ai/flows/enviar-cotizacion-flow';
import { GeneradorPDF, OrdenDeExamen } from './GeneradorPDF';
import { DetalleCotizacion } from './DetalleCotizacion';

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

    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast({
          title: "Error al generar PDF",
          description: "Hubo un problema al crear el archivo.",
          variant: "destructive"
      })
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleSendEmail = async () => {
      if (!quote) return;
      setSendingEmail(true);

      try {
        // 1. Generar el PDF en Blob y luego en base64
        const pdfBlob = await GeneradorPDF.generar(quote);
        const reader = new FileReader();
        
        reader.onloadend = async () => {
            const base64data = reader.result;
            if (typeof base64data !== 'string') {
                throw new Error("Error convirtiendo PDF a Base64");
            }
            const pdfBase64 = base64data.split(',')[1];
            
            // 2. Llamar al flow de Genkit
            await enviarCotizacion({
                clienteEmail: quote.empresa.email,
                cotizacionId: quote.id?.slice(-6) || 'S/N',
                pdfBase64: pdfBase64,
            });

            toast({
                title: "Correo Enviado",
                description: "El correo con la cotizacion formal se ha enviado con exito al cliente."
            });
        };
        
        reader.onerror = () => {
            throw new Error("Fallo la lectura del Blob del PDF.");
        };

        reader.readAsDataURL(pdfBlob);

      } catch (error: any) {
          console.error("Error al enviar correo:", error);
          toast({
              title: "Error al Enviar Correo",
              description: error.message || "No se pudo enviar la cotización.",
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
        <Button onClick={handleSendEmail} disabled={sendingEmail || loadingPdf}>
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

    
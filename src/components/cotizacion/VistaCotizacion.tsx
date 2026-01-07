"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Loader2, Send, CheckCircle } from 'lucide-react';
import type { Cotizacion } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { enviarCotizacion } from '@/ai/flows/enviar-cotizacion-flow';
import { GeneradorPDF } from './GeneradorPDF';
import { DetalleCotizacion } from './DetalleCotizacion';
// Importaciones de Firebase para actualizar el estado
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result;
      if (typeof base64data !== 'string') return reject(new Error('Error en Base64'));
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
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
        console.error("Error parsing quote:", error);
      }
    }
  }, [searchParams]);

  const handleExportPDF = async () => {
    if (loadingPdf || !quote) return;
    setLoadingPdf(true);
    try {
        const blob = await GeneradorPDF.generar(quote);
        const fileName = `Cotizacion-${quote.id?.slice(-6) || 'Doc'}.pdf`;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);
    } catch (error: any) {
      toast({ title: "Error PDF", description: error.message, variant: "destructive" });
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleSendEmail = async () => {
      if (!quote || !quote.id) return;

      // FIX QUIRÚRGICO PARA TYPESCRIPT: Usamos (quote as any) para acceder a propiedades dinámicas
      const solicitanteEmail = quote.solicitanteData?.mail || (quote as any).solicitante?.mail;
      
      if (!solicitanteEmail) {
        toast({ title: 'Error', description: 'No se encontró el email del destinatario.', variant: 'destructive' });
        return;
      }
      
      setSendingEmail(true);
      try {
        const pdfBlob = await GeneradorPDF.generar(quote);
        const pdfBase64 = await blobToBase64(pdfBlob);
        
        await enviarCotizacion({
            clienteEmail: solicitanteEmail,
            cotizacionId: quote.id.slice(-6),
            pdfBase64: pdfBase64,
        });

        // Actualización de estado en Firestore
        const quoteRef = doc(firestore, 'cotizaciones', quote.id);
        await updateDoc(quoteRef, {
            status: 'CORREO_ENVIADO',
            fechaEnvioEmail: new Date().toISOString()
        });

        // Actualizar estado local para feedback inmediato
        setQuote(prev => prev ? { ...prev, status: 'CORREO_ENVIADO' } : null);

        toast({
            title: "Correo Enviado",
            description: `Cotización enviada a ${solicitanteEmail} con éxito.`
        });

      } catch (error: any) {
          console.error("Error envío:", error);
          toast({
              title: "Error al Enviar",
              description: error.message || "Fallo técnico en el servidor.",
              variant: "destructive",
          });
      } finally {
          setSendingEmail(false);
      }
  };

  if (!quote) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-10 w-10 text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex justify-between items-center gap-2 mb-6 print:hidden bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Estado Actual:</span>
            <span className={`text-xs font-black px-3 py-1 rounded-full ${quote.status === 'CORREO_ENVIADO' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'}`}>
                {quote.status}
            </span>
        </div>
        <div className="flex gap-2">
            <Button 
              onClick={handleSendEmail} 
              disabled={sendingEmail || quote.status === 'CORREO_ENVIADO'} 
              className={quote.status === 'CORREO_ENVIADO' ? "bg-slate-100 text-slate-400" : "bg-primary"}
            >
            {sendingEmail ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
            ) : quote.status === 'CORREO_ENVIADO' ? (
                <><CheckCircle className="mr-2 h-4 w-4" /> Cotización Enviada</>
            ) : (
                <><Send className="mr-2 h-4 w-4" /> Enviar por Email</>
            )}
            </Button>
            <Button onClick={handleExportPDF} disabled={loadingPdf} variant="outline" size="icon">
              {loadingPdf ? <Loader2 className="animate-spin h-4 w-4" /> : <Download className="h-4 w-4" />}
            </Button>
        </div>
      </div>

      <div id="pdf-content-area" className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
        <DetalleCotizacion quote={quote} />
      </div>
    </div>
  );
}
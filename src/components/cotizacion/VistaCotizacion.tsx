
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Mail, Building, User, Users, Phone, Clock, MapPin, Loader2, FileText } from 'lucide-react';
import type { Cotizacion, Empresa, SolicitudTrabajador, Examen } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';


const OrdenDeExamen = ({ solicitud, empresa }: { solicitud: SolicitudTrabajador, empresa: Empresa }) => (
    <div className="order-page-container bg-white p-8">
      <div className="max-w-4xl mx-auto my-12 p-8 border border-gray-200 bg-white shadow-md font-sans">

        {/* Encabezado */}
        <header className="flex justify-between items-center mb-10">
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">
            <h3 className="text-lg font-semibold">Orden de Examen Ocupacionales</h3>
          </div>
          <Image 
            src="/images/logo.png" 
            alt="Araval Logo" 
            width={140} 
            height={40} 
            unoptimized
          />
        </header>

        {/* Cuerpo del Formulario */}
        <main className="text-sm text-gray-700">
          {/* Sección de Datos */}
          <section className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="font-semibold text-base text-gray-800 mb-1">Empresa</p>
              <p>{empresa.razonSocial}</p>
              <p>RUT: {empresa.rut}</p>
            </div>
            <div>
              <p className="font-semibold text-base text-gray-800 mb-1">Trabajador</p>
              <p>{solicitud.trabajador.nombre}</p>
              <p>RUT: {solicitud.trabajador.rut}</p>
            </div>
          </section>

          {/* Sección de Exámenes */}
          <section className="mb-12">
            <h4 className="font-semibold text-base text-gray-800 border-b pb-2 mb-4">Exámenes a Realizar</h4>
            <ul className="space-y-2 list-disc list-inside text-base">
              {solicitud.examenes.map(exam => (
                <li key={exam.id}>{exam.nombre}</li>
              ))}
            </ul>
          </section>
          
          <Separator className="my-8" />

          {/* Información de la Clínica */}
          <section>
             <h4 className="font-semibold text-base text-gray-800 text-center mb-4">Información para el Paciente</h4>
              <div className="text-center">
                  <p className="font-bold text-lg text-gray-900">Centro Medico Araval</p>
                  <p>Juan Martinez 235, Taltal Chile</p>
                  <p>+56 9 7541 1515</p>
                  <p>Lunes a Viernes: 08:00 - 12:00 / 15:00 - 20:00</p>
              </div>
          </section>
        </main>
      </div>
      <footer className="text-center text-xs text-gray-400 mt-8 absolute bottom-8 w-full left-0">
        Centro médico, Laboratorio Clínico, Salud Ocupacional y Toma de muestras - Araval Taltal.
      </footer>
    </div>
);


export function VistaCotizacion() {
  const [quote, setQuote] = useState<Cotizacion | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const allExams = useMemo(() => {
    if (!quote?.solicitudes) return [];
    return quote.solicitudes.flatMap(s => s.examenes);
  }, [quote]);

  const examsByMainCategory = useMemo(() => {
    if (!allExams) return {};
    const uniqueExams = new Map<string, Examen>();
    allExams.forEach(exam => {
        if (!uniqueExams.has(exam.id)) {
            uniqueExams.set(exam.id, exam);
        }
    });

    return Array.from(uniqueExams.values()).reduce((acc, exam) => {
      const { categoria } = exam;
      if (!acc[categoria]) {
        acc[categoria] = [];
      }
      acc[categoria].push(exam);
      return acc;
    }, {} as Record<string, Examen[]>);
  }, [allExams]);

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
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  const handleExportPDF = async () => {
    const quoteElement = document.getElementById('printable-quote');
    const annexContainer = document.getElementById('annex-container');

    if (!quoteElement || !annexContainer || !quote) return;

    setLoadingPdf(true);

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'letter',
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    
    const buttonContainer = document.getElementById('button-container');
    if (buttonContainer) buttonContainer.style.display = 'none';
    
    // Make annexes temporarily visible for capture
    annexContainer.style.display = 'block';
    annexContainer.style.position = 'fixed';
    annexContainer.style.left = '0';
    annexContainer.style.top = '0';
    annexContainer.style.zIndex = '-1'; 
    annexContainer.style.opacity = '1';


    try {
      // 1. Process Main Quote
      const mainCanvas = await html2canvas(quoteElement, { scale: 2, useCORS: true });
      const mainImgData = mainCanvas.toDataURL('image/png');
      const mainRatio = mainCanvas.height / mainCanvas.width;
      let mainImgHeight = pdfWidth * mainRatio;
      
      pdf.addImage(mainImgData, 'PNG', 0, 0, pdfWidth, mainImgHeight);
      
      // 2. Process Annexes
      const annexElements = annexContainer.querySelectorAll<HTMLDivElement>('.order-page-container');
      for (let i = 0; i < annexElements.length; i++) {
        const annexElement = annexElements[i];
        // Ensure the element has a defined size before capturing
        annexElement.style.width = '8.5in';
        annexElement.style.height = '11in';
        
        const annexCanvas = await html2canvas(annexElement, { scale: 2, useCORS: true, windowWidth: annexElement.scrollWidth, windowHeight: annexElement.scrollHeight });
        const annexImgData = annexCanvas.toDataURL('image/png');
        const annexRatio = annexCanvas.height / annexCanvas.width;
        const annexImgHeight = pdfWidth * annexRatio;

        pdf.addPage();
        pdf.addImage(annexImgData, 'PNG', 0, 0, pdfWidth, annexImgHeight);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
          title: "Error al generar PDF",
          description: "Hubo un problema al crear el archivo. Revisa la consola.",
          variant: "destructive"
      })
    } finally {
      // Restore styles
      if (buttonContainer) buttonContainer.style.display = 'flex';
      
      annexContainer.style.display = 'none';
      annexContainer.style.position = 'absolute';
      annexContainer.style.left = '-9999px';
      annexContainer.style.zIndex = '';
      annexContainer.style.opacity = '0';

      setLoadingPdf(false);

      const date = new Date();
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      const correlative = quote.id ? quote.id.slice(-6) : "000000";
      const fileName = `Cot-${month}${day}-${correlative}.pdf`;
      pdf.save(fileName);
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

  const mailToLink = `mailto:${quote.solicitante.mail}?subject=${encodeURIComponent(`Cotización de Servicios Araval Nº ${quote.id?.slice(-6)}`)}&body=${encodeURIComponent(`Estimado(a) ${quote.solicitante.nombre},\n\nAdjunto encontrará la cotización Nº ${quote.id?.slice(-6)} solicitada.\n\nPor favor, recuerde adjuntar el archivo PDF antes de enviar.\n\nSaludos cordiales,\nEquipo Araval.`)}`;
  const neto = quote.total;
  const iva = neto * 0.19;
  const totalFinal = neto + iva;

  return (
    <>
      <div id="button-container" className="flex justify-end gap-2 mb-4 print:hidden">
        <Button asChild variant="secondary">
          <a href={mailToLink}>
            <Mail className="mr-2 h-4 w-4" />
            Enviar por Email
          </a>
        </Button>
        <Button onClick={handleExportPDF} disabled={loadingPdf}>
          {loadingPdf ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exportando...</>
          ) : (
            <><Download className="mr-2 h-4 w-4" /> Exportar a PDF</>
          )}
        </Button>
      </div>

      <div id="pdf-content-area" className="bg-gray-100 p-0 sm:p-4 print:p-0 print:bg-white">
        <div id="printable-quote" className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg print:shadow-none print:border-none print:rounded-none p-16">
           <header className="flex justify-between items-start pb-6 border-b-2 border-primary">
                <div>
                    <h2 className="text-3xl font-bold font-headline text-primary">COTIZACIÓN</h2>
                    <p className="mt-1 text-sm text-gray-500">Nº: {quote.id ? quote.id.slice(-6) : 'N/A'}</p>
                    <p className="mt-1 text-sm text-gray-500">Fecha: {quote.fecha}</p>
                </div>
                 <Image
                    src="/images/logo.png"
                    alt="Araval Logo"
                    width={150}
                    height={40}
                    priority
                    unoptimized
                />
            </header>

          <main className="py-8">
            <section className="grid grid-cols-2 gap-8 mb-8">
              <div className="space-y-2">
                <h3 className="font-headline text-lg font-semibold text-gray-700 border-b pb-2 flex items-center gap-2"><Building className="h-5 w-5 text-gray-500" />Datos Empresa</h3>
                <p className="text-sm"><strong className="font-medium text-gray-600">Razón Social:</strong> {quote.empresa.razonSocial}</p>
                <p className="text-sm"><strong className="font-medium text-gray-600">RUT:</strong> {quote.empresa.rut}</p>
                <p className="text-sm"><strong className="font-medium text-gray-600">Dirección:</strong> {quote.empresa.direccion}</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-headline text-lg font-semibold text-gray-700 border-b pb-2 flex items-center gap-2"><User className="h-5 w-5 text-gray-500" />Datos Solicitante</h3>
                <p className="text-sm"><strong className="font-medium text-gray-600">Nombre:</strong> {quote.solicitante.nombre}</p>
                <p className="text-sm"><strong className="font-medium text-gray-600">RUT:</strong> {quote.solicitante.rut}</p>
                <p className="text-sm"><strong className="font-medium text-gray-600">Email:</strong> {quote.solicitante.mail}</p>
              </div>
            </section>

            {quote.solicitudes && quote.solicitudes.length > 0 && (
              <section className="mb-8">
                <Card className="shadow-sm border-gray-200">
                  <CardHeader className="p-3 bg-primary text-primary-foreground rounded-t-lg">
                    <CardTitle className="font-headline text-base flex items-center gap-2"><Users className="h-5 w-5" />Trabajadores Incluidos ({quote.solicitudes.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 text-sm">
                     <ul className="space-y-1 list-disc list-inside text-muted-foreground columns-2 md:columns-3">
                      {quote.solicitudes.map((s, i) => (
                        <li key={s.id || i}><span className="text-foreground font-medium">{s.trabajador.nombre}</span></li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            )}

            <section>
              <h3 className="font-headline text-lg font-semibold mb-2 text-gray-700">Detalle de Servicios Consolidados</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-primary">
                    <TableRow>
                      <TableHead className="w-[70%] font-semibold text-primary-foreground text-sm py-2 px-4">Examen</TableHead>
                      <TableHead className="text-right font-semibold text-primary-foreground text-sm py-2 px-4">Valor Unitario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(examsByMainCategory).length > 0 ? (
                      Object.entries(examsByMainCategory).map(([category, exams]) => (
                        <React.Fragment key={category}>
                           <TableRow className="bg-gray-100">
                            <TableCell colSpan={2} className="font-headline font-semibold text-gray-800 text-sm py-2 px-4">
                              {category}
                            </TableCell>
                          </TableRow>
                          {exams.map((exam) => (
                            <TableRow key={exam.id} className="border-b-0 text-sm">
                              <TableCell className="font-medium text-gray-800 pl-8 py-2 px-4">{exam.nombre}</TableCell>
                              <TableCell className="text-right font-medium text-gray-700 py-2 px-4">{formatCurrency(exam.valor)}</TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-gray-500 py-8 text-sm">
                          No hay exámenes seleccionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="mt-8 flex justify-end">
              <div className="w-full max-w-sm space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Neto</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(neto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">IVA (19%)</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(iva)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center text-lg font-bold bg-primary text-primary-foreground p-3 rounded-lg">
                  <span>TOTAL A PAGAR</span>
                  <span>{formatCurrency(totalFinal)}</span>
                </div>
              </div>
            </section>
          </main>

          <footer className="mt-8 pt-6 text-center text-xs text-gray-500 border-t">
            <p>Cotización válida por 30 días. Para agendar, por favor contacte a nuestro equipo.</p>
            <p className="font-semibold mt-1">contacto@araval.cl | +56 9 7541 1515</p>
          </footer>
        </div>
      </div>

      <div id="annex-container" style={{ display: 'none', position: 'absolute', left: '-9999px', top: '0', zIndex: -1, opacity: 0 }}>
           {quote?.solicitudes.map((solicitud, index) => (
                <OrdenDeExamen 
                    key={solicitud.id || index} 
                    solicitud={solicitud} 
                    empresa={quote.empresa}
                />
            ))}
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
          #printable-quote {
            box-shadow: none !important;
            border: none !important;
            padding: 2rem !important;
          }
          .order-page-container {
             page-break-before: always;
          }
        }
      `}</style>
    </>
  );
}

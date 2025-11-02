
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Mail, Building, User, Users, Phone, Clock, MapPin, Loader2 } from 'lucide-react';
import type { Cotizacion, Empresa, SolicitudTrabajador, Examen } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Componente para la Orden de Examen (Anexo)
const OrdenDeExamen = ({ solicitud, empresa, quoteId, index }: { solicitud: SolicitudTrabajador, empresa: Empresa, quoteId: string, index: number }) => (
    <div id={`annex-page-${index}`} className="order-page-container max-w-xl mx-auto bg-white p-6 border rounded-lg">
      <header className="bg-gray-50 p-4 rounded-t-lg">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold font-headline text-primary">Orden de Examen</h3>
            <p className="text-xs text-muted-foreground">Referencia Cotización Nº: {quoteId}</p>
          </div>
          <Image 
            src="/images/logo.png" 
            alt="Araval Logo" 
            width={100} 
            height={26} 
            unoptimized
          />
        </div>
      </header>
      <main className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="space-y-1">
            <h4 className="font-semibold text-gray-600">Paciente:</h4>
            <p>{solicitud.trabajador.nombre}</p>
            <p className="text-xs text-muted-foreground">RUT: {solicitud.trabajador.rut}</p>
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-gray-600">Empresa:</h4>
            <p>{empresa.razonSocial}</p>
            <p className="text-xs text-muted-foreground">RUT: {empresa.rut}</p>
          </div>
        </div>

        <h4 className="font-semibold text-gray-600 mb-2 text-sm">Exámenes a Realizar:</h4>
        <div className="border rounded-md p-3 bg-gray-50/50">
          <ul className="space-y-1 list-disc list-inside text-gray-700 text-sm">
            {solicitud.examenes.map(exam => (
              <li key={exam.id}>{exam.nombre}</li>
            ))}
          </ul>
        </div>

        <Separator className="my-4" />

        <div>
          <h4 className="font-semibold text-gray-600 mb-3 text-center text-sm">Información para el Paciente</h4>
          <div className="border rounded-lg p-3 bg-blue-50/50 text-blue-900">
            <p className="font-bold text-base text-center mb-2">Centro Médico Araval</p>
            <div className='text-xs space-y-1.5'>
              <div className="flex items-start gap-2">
                <MapPin className="h-3 w-3 text-blue-600 shrink-0 mt-0.5"/>
                <span>Juan Martinez 235, Taltal, Chile</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-3 w-3 text-blue-600 shrink-0 mt-0.5"/>
                <span>+56 9 7541 1515</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-3 w-3 text-blue-600 shrink-0 mt-0.5"/>
                <span>Lunes a Viernes: 08:00-12:00 / 15:00-20:00</span>
              </div>
            </div>
            <Separator className="my-3 bg-blue-200"/>
            <p className="text-xs text-center text-blue-800">Centro Médico, Laboratorio Clínico, Salud Ocupacional, Toma De Muestras.</p>
          </div>
        </div>
      </main>
       <style jsx>{`
        .order-page-container {
          margin-top: 1rem;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
);


export function VistaCotizacion() {
  const [quote, setQuote] = useState<Cotizacion | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const searchParams = useSearchParams();

  const allExams = useMemo(() => {
    if (!quote?.solicitudes) return [];
    const uniqueExams = new Map<string, Examen>();
    quote.solicitudes.flatMap(s => s.examenes).forEach(exam => {
        if (!uniqueExams.has(exam.id)) {
            uniqueExams.set(exam.id, exam);
        }
    });
    return Array.from(uniqueExams.values());
  }, [quote]);

  const examsByMainCategory = useMemo(() => {
    if (!allExams) return {};
    return allExams.reduce((acc, exam) => {
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
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Hide buttons during processing
    const buttonContainer = document.getElementById('button-container');
    if (buttonContainer) buttonContainer.style.display = 'none';
    
    // Temporarily make annex container visible for rendering, but position it off-screen
    const originalAnnexClasses = annexContainer.className;
    annexContainer.className = "fixed top-0 left-0 -z-50 opacity-100";


    try {
      // 1. Process Main Quote
      const mainCanvas = await html2canvas(quoteElement, { scale: 2 });
      const mainImgData = mainCanvas.toDataURL('image/png');
      const mainRatio = mainCanvas.height / mainCanvas.width;
      const mainImgHeight = pdfWidth * mainRatio;
      
      let heightLeft = mainImgHeight;
      let position = 0;
      
      pdf.addImage(mainImgData, 'PNG', 0, position, pdfWidth, mainImgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - mainImgHeight;
        pdf.addPage();
        pdf.addImage(mainImgData, 'PNG', 0, position, pdfWidth, mainImgHeight);
        heightLeft -= pdfHeight;
      }


      // 2. Process Annexes
      const annexElements = annexContainer.querySelectorAll<HTMLDivElement>('.order-page-container');
      for (let i = 0; i < annexElements.length; i++) {
        const annexElement = annexElements[i];
        const annexCanvas = await html2canvas(annexElement, { scale: 2 });
        const annexImgData = annexCanvas.toDataURL('image/png');
        const annexRatio = annexCanvas.height / annexCanvas.width;
        const annexImgHeight = pdfWidth * annexRatio;

        pdf.addPage();
        pdf.addImage(annexImgData, 'PNG', 0, 0, pdfWidth, annexImgHeight);
      }

    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      // Restore everything
      if (buttonContainer) buttonContainer.style.display = 'flex';
      annexContainer.className = originalAnnexClasses;
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
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md flex items-center justify-center">
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

        {/* --- Main Quotation for Display and PDF --- */}
        <div id="printable-quote" className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg print:shadow-none print:border-none print:rounded-none">
           <header className="bg-primary text-primary-foreground p-4 rounded-t-lg print:rounded-none">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <Image
                  src="/images/logo2.png"
                  alt="Araval Logo"
                  width={120}
                  height={32}
                  priority
                  unoptimized
                />
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold font-headline">COTIZACIÓN</h2>
                <p className="mt-1 text-xs">Nº: {quote.id ? quote.id.slice(-6) : 'N/A'}</p>
                <p className="mt-1 text-xs">Fecha: {quote.fecha}</p>
              </div>
            </div>
          </header>

          <main className="p-4">
            <section className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-1 text-xs">
                <h3 className="font-headline text-sm font-semibold text-gray-700 border-b pb-1 mb-1 flex items-center gap-2"><Building className="h-4 w-4 text-gray-500" />Datos Empresa</h3>
                <p><strong className="font-medium text-gray-600">Razón Social:</strong> {quote.empresa.razonSocial}</p>
                <p><strong className="font-medium text-gray-600">RUT:</strong> {quote.empresa.rut}</p>
                <p><strong className="font-medium text-gray-600">Dirección:</strong> {quote.empresa.direccion}</p>
              </div>
              <div className="space-y-1 text-xs">
                <h3 className="font-headline text-sm font-semibold text-gray-700 border-b pb-1 mb-1 flex items-center gap-2"><User className="h-4 w-4 text-gray-500" />Datos Solicitante</h3>
                <p><strong className="font-medium text-gray-600">Nombre:</strong> {quote.solicitante.nombre}</p>
                <p><strong className="font-medium text-gray-600">RUT:</strong> {quote.solicitante.rut}</p>
                <p><strong className="font-medium text-gray-600">Email:</strong> {quote.solicitante.mail}</p>
              </div>
            </section>

            {quote.solicitudes && quote.solicitudes.length > 0 && (
              <section className="mb-4">
                <Card className="shadow-none border-gray-200">
                  <CardHeader className="p-2 bg-gray-50 rounded-t-lg">
                    <CardTitle className="font-headline text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Trabajadores Incluidos ({quote.solicitudes.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 text-xs">
                     <ul className="space-y-0.5 list-disc list-inside text-muted-foreground columns-2">
                      {quote.solicitudes.map((s, i) => (
                        <li key={s.id || i}><span className="text-foreground font-medium">{s.trabajador.nombre}</span></li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            )}

            <section>
              <h3 className="font-headline text-sm font-semibold mb-1 text-gray-700">Detalle de Servicios Consolidados</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[70%] font-semibold text-gray-600 text-xs py-1 px-2">Examen</TableHead>
                      <TableHead className="text-right font-semibold text-gray-600 text-xs py-1 px-2">Valor Unitario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(examsByMainCategory).length > 0 ? (
                      Object.entries(examsByMainCategory).map(([category, exams]) => (
                        <React.Fragment key={category}>
                          <TableRow className="bg-gray-100/70">
                            <TableCell colSpan={2} className="font-headline font-semibold text-foreground text-xs py-1 px-2">
                              {category}
                            </TableCell>
                          </TableRow>
                          {exams.map((exam) => (
                            <TableRow key={exam.id} className="border-b-0 text-xs">
                              <TableCell className="font-medium text-gray-800 pl-4 py-1 px-2">{exam.nombre}</TableCell>
                              <TableCell className="text-right font-medium text-gray-700 py-1 px-2">{formatCurrency(exam.valor)}</TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-gray-500 py-4 text-xs">
                          No hay exámenes seleccionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="mt-4 flex justify-end">
              <div className="w-full max-w-[250px] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Neto</span>
                  <span className="font-medium text-gray-700">{formatCurrency(neto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">IVA (19%)</span>
                  <span className="font-medium text-gray-700">{formatCurrency(iva)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between items-center text-sm font-bold bg-primary text-primary-foreground p-1.5 rounded-md">
                  <span>TOTAL A PAGAR</span>
                  <span>{formatCurrency(totalFinal)}</span>
                </div>
              </div>
            </section>
          </main>

          <footer className="mt-2 p-4 text-center text-xs text-gray-400 border-t">
            <p>Cotización válida por 30 días. Para agendar, por favor contacte a nuestro equipo.</p>
            <p className="font-semibold mt-1">contacto@araval.cl | +56 9 7541 1515</p>
          </footer>
        </div>
      </div>

      {/* --- Annex Container for PDF Generation ONLY --- */}
      <div id="annex-container" className="hidden">
           {quote?.solicitudes.map((solicitud, index) => (
                <OrdenDeExamen 
                    key={solicitud.id || index} 
                    solicitud={solicitud} 
                    empresa={quote.empresa}
                    quoteId={quote.id ? quote.id.slice(-6) : 'N/A'}
                    index={index}
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
          }
          #annex-container {
            display: block !important;
          }
          .order-page-container {
             page-break-before: always;
          }
        }
      `}</style>
    </>
  );
}


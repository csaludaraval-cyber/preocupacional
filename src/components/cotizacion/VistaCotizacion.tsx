
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Mail, Building, User, Users, Phone, Clock, MapPin, Loader2 } from 'lucide-react';
import type { Cotizacion, Examen, SolicitudTrabajador } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function VistaCotizacion() {
  const [quote, setQuote] = useState<Cotizacion | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const searchParams = useSearchParams();

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

  const handleExportPDF = async () => {
    if (!quote) return;
    setLoadingPdf(true);

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'letter',
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    
    // Hide buttons during canvas operations
    const buttonContainer = document.getElementById('button-container');
    if (buttonContainer) buttonContainer.style.visibility = 'hidden';

    // 1. Process Main Quote
    const quoteElement = document.getElementById('printable-quote');
    if (quoteElement) {
        const canvas = await html2canvas(quoteElement, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasHeight / canvasWidth;
        const imgHeight = pdfWidth * ratio;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
    }
    
    // 2. Process Annexes (Order Forms) one by one
    if (quote.solicitudes) {
      for (let i = 0; i < quote.solicitudes.length; i++) {
        const orderElementId = `order-page-${i}`;
        const orderElement = document.getElementById(orderElementId);

        if (orderElement) {
          pdf.addPage();
          const canvas = await html2canvas(orderElement, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          const ratio = canvasHeight / canvasWidth;
          const imgHeight = pdfWidth * ratio;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        }
      }
    }
    
    // Show buttons again
    if (buttonContainer) buttonContainer.style.visibility = 'visible';

    // 3. Save PDF
    const date = new Date();
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const correlative = quote.id ? quote.id.slice(-6) : "000000";
    const fileName = `Cot-${month}${day}-${correlative}.pdf`;

    pdf.save(fileName);
    setLoadingPdf(false);
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  if (!quote) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold">Cargando cotización...</h2>
          <p className="text-muted-foreground">Si no se carga, es posible que los datos de la cotización no sean válidos.</p>
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
      
      {/* This container is for on-screen display and PDF generation */}
      <div id="pdf-content-area" className="bg-gray-100 p-0 sm:p-4 print:p-0 print:bg-white">
        
        {/* --- MAIN QUOTE --- */}
        <div id="printable-quote" className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg print:shadow-none print:border-none print:rounded-none">
          <header className="bg-primary text-primary-foreground p-8 rounded-t-lg print:rounded-none">
              <div className="grid grid-cols-2 gap-8">
                  <div className="flex items-center">
                      <Image 
                        src="/images/logo2.png" 
                        alt="Araval Logo" 
                        width={150} 
                        height={40} 
                        priority 
                        unoptimized
                      />
                  </div>
                  <div className="text-right">
                      <h2 className="text-3xl font-bold font-headline">COTIZACIÓN</h2>
                      <p className="mt-1">Nº: {quote.id ? quote.id.slice(-6) : 'N/A'}</p>
                      <p className="mt-1">Fecha: {quote.fecha}</p>
                  </div>
              </div>
          </header>

          <main className="p-8">
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-2">
                      <h3 className="font-headline text-lg font-semibold text-gray-700 border-b pb-2 flex items-center gap-2"><Building className="h-5 w-5 text-gray-500"/>Datos Empresa</h3>
                      <p className="text-sm"><strong className="font-medium text-gray-600">Razón Social:</strong> {quote.empresa.razonSocial}</p>
                      <p className="text-sm"><strong className="font-medium text-gray-600">RUT:</strong> {quote.empresa.rut}</p>
                      <p className="text-sm"><strong className="font-medium text-gray-600">Dirección:</strong> {quote.empresa.direccion}</p>
                  </div>
                  <div className="space-y-2">
                      <h3 className="font-headline text-lg font-semibold text-gray-700 border-b pb-2 flex items-center gap-2"><User className="h-5 w-5 text-gray-500"/>Datos Solicitante/Contacto</h3>
                      <p className="text-sm"><strong className="font-medium text-gray-600">Nombre:</strong> {quote.solicitante.nombre}</p>
                      <p className="text-sm"><strong className="font-medium text-gray-600">RUT:</strong> {quote.solicitante.rut}</p>
                      <p className="text-sm"><strong className="font-medium text-gray-600">Cargo:</strong> {quote.solicitante.cargo}</p>
                      <p className="text-sm"><strong className="font-medium text-gray-600">Email:</strong> {quote.solicitante.mail}</p>
                  </div>
              </section>
              
              {quote.solicitudes && quote.solicitudes.length > 0 && (
                   <section className="mb-8">
                      <Card>
                          <CardHeader>
                              <CardTitle className="font-headline text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary"/>Trabajadores Incluidos en esta Cotización</CardTitle>
                          </CardHeader>
                          <CardContent>
                               <ul className="space-y-1 text-sm list-disc list-inside text-muted-foreground columns-2">
                                  {quote.solicitudes.map((s, i) => (
                                      <li key={s.id || i}><span className="text-foreground font-medium">{s.trabajador.nombre}</span> (RUT: {s.trabajador.rut})</li>
                                  ))}
                              </ul>
                          </CardContent>
                      </Card>
                  </section>
              )}

              <section>
                  <h3 className="font-headline text-lg font-semibold mb-4 text-gray-700">Detalle de Servicios Consolidados</h3>
                  <div className="border rounded-lg overflow-hidden">
                      <Table>
                          <TableHeader className="bg-gray-50">
                              <TableRow>
                                  <TableHead className="w-[70%] font-semibold text-gray-600">Examen</TableHead>
                                  <TableHead className="text-right font-semibold text-gray-600">Valor Unitario</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {Object.keys(examsByMainCategory).length > 0 ? (
                                  Object.entries(examsByMainCategory).map(([category, exams]) => (
                                      <React.Fragment key={category}>
                                          <TableRow className="bg-gray-100/70">
                                              <TableCell colSpan={2} className="font-headline font-semibold text-foreground">
                                                  {category}
                                              </TableCell>
                                          </TableRow>
                                          {exams.map((exam) => (
                                              <TableRow key={exam.id} className="border-b-0">
                                                  <TableCell className="font-medium text-gray-800 pl-8">{exam.nombre}</TableCell>
                                                  <TableCell className="text-right font-medium text-gray-700">{formatCurrency(exam.valor)}</TableCell>
                                              </TableRow>
                                          ))}
                                      </React.Fragment>
                                  ))
                              ) : (
                                  <TableRow>
                                      <TableCell colSpan={2} className="text-center text-gray-500 py-8">
                                          No hay exámenes seleccionados.
                                      </TableCell>
                                  </TableRow>
                              )}
                          </TableBody>
                      </Table>
                  </div>
              </section>

              <section className="mt-8 flex justify-end">
                  <div className="w-full max-w-xs space-y-2 text-sm">
                      <div className="flex justify-between">
                          <span className="text-gray-600">Neto</span>
                          <span className="font-medium text-gray-700">{formatCurrency(neto)}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-gray-600">IVA (19%)</span>
                          <span className="font-medium text-gray-700">{formatCurrency(iva)}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center text-base font-bold bg-primary text-primary-foreground p-3 rounded-md">
                          <span>TOTAL A PAGAR</span>
                          <span>{formatCurrency(totalFinal)}</span>
                      </div>
                  </div>
              </section>
          </main>
          
          <footer className="mt-8 p-8 text-center text-xs text-gray-400 border-t">
              <p>Cotización válida por 30 días. Para agendar, por favor contacte a nuestro equipo.</p>
              <p className="font-semibold mt-1">contacto@araval.cl | +56 9 7541 1515</p>
          </footer>
        </div>

        {/* --- ANNEXES: EXAMINATION ORDERS (These are for PDF generation logic) --- */}
        {quote.solicitudes && quote.solicitudes.length > 0 && (
          <div id="annex-container" className="hidden print:block">
            {quote.solicitudes.map((solicitud, index) => (
              <div id={`order-page-${index}`} key={solicitud.id || index} className="order-page-container max-w-4xl mx-auto bg-white p-8" style={{pageBreakBefore: 'always'}}>
                <header className="bg-gray-100 p-6 rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-bold font-headline text-primary">Orden de Examen</h3>
                      <p className="text-muted-foreground">Referencia Cotización Nº: {quote.id ? quote.id.slice(-6) : 'N/A'}</p>
                    </div>
                    <Image 
                      src="/images/logo.png" 
                      alt="Araval Logo" 
                      width={120} 
                      height={32} 
                      unoptimized
                    />
                  </div>
                </header>
                <main className="p-6">
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-gray-600">Paciente:</h4>
                      <p>{solicitud.trabajador.nombre}</p>
                      <p className="text-sm text-muted-foreground">RUT: {solicitud.trabajador.rut}</p>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-gray-600">Empresa:</h4>
                      <p>{quote.empresa.razonSocial}</p>
                      <p className="text-sm text-muted-foreground">RUT: {quote.empresa.rut}</p>
                    </div>
                  </div>

                  <h4 className="font-semibold text-gray-600 mb-2">Exámenes a Realizar:</h4>
                  <div className="border rounded-md p-4 bg-gray-50/50">
                    <ul className="space-y-1 list-disc list-inside text-gray-700">
                      {solicitud.examenes.map(exam => (
                        <li key={exam.id}>{exam.nombre}</li>
                      ))}
                    </ul>
                  </div>

                  <Separator className="my-6" />

                  <div>
                    <h4 className="font-semibold text-gray-600 mb-4 text-center">Información para el Paciente</h4>
                    <div className="border rounded-lg p-4 bg-blue-50/50 text-blue-900">
                      <p className="font-bold text-lg text-center mb-3">Centro Médico Araval</p>
                      <div className='text-sm space-y-2'>
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-blue-600 shrink-0 mt-0.5"/>
                          <span>Juan Martinez 235, Taltal, Chile</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone className="h-4 w-4 text-blue-600 shrink-0 mt-0.5"/>
                          <span>+56 9 7541 1515</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5"/>
                          <span>Lunes a Viernes: 08:00-12:00 / 15:00-20:00</span>
                        </div>
                      </div>
                      <Separator className="my-4 bg-blue-200"/>
                      <p className="text-xs text-center text-blue-800">Centro Médico, Laboratorio Clínico, Salud Ocupacional, Toma De Muestras.</p>
                    </div>
                  </div>
                </main>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #button-container, #annex-container {
            display: none !important;
          }
          #pdf-content-area {
            padding: 0;
            margin: 0;
          }
          .order-page-container {
             page-break-before: always;
          }
        }
      `}</style>
    </>
  );
}

    

    
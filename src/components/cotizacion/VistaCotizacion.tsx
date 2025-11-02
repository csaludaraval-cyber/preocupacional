
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Mail, Building, User, Users, Phone, Clock, MapPin } from 'lucide-react';
import type { Cotizacion, Examen, Trabajador } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function VistaCotizacion() {
  const [quote, setQuote] = useState<Cotizacion | null>(null);
  const [loading, setLoading] = useState(false);
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

  const examsByWorker = useMemo(() => {
      if (!quote?.trabajadores || !quote?.examenes) return {};
      
      const workerExams: Record<string, { trabajador: Trabajador; examenes: Examen[] }> = {};
      
      // Since we consolidated exams, we have to assume all exams apply to all workers in this view.
      // This is a known limitation of the current data structure passed to this component.
      // For a more accurate breakdown, the data structure would need to change.
      quote.trabajadores.forEach(worker => {
          // This part is tricky if exams are consolidated. 
          // If the original request structure is not available, we show all exams for all workers.
          // Ideally, the quote object should retain which exams belong to which worker.
          // For now, we assume all exams in the quote apply to every worker listed in it
          // for the purpose of generating the order.
          workerExams[worker.rut || worker.nombre] = {
              trabajador: worker,
              examenes: quote.examenes // Assigning all exams to each worker for the order form.
          };
      });
      return workerExams;
  }, [quote]);

  const examsByMainCategory = useMemo(() => {
    if (!quote) return {};
    return quote.examenes.reduce((acc, exam) => {
      const { categoria } = exam;
      if (!acc[categoria]) {
        acc[categoria] = [];
      }
      acc[categoria].push(exam);
      return acc;
    }, {} as Record<string, Examen[]>);
  }, [quote]);

  const mailToLink = useMemo(() => {
    if (!quote?.solicitante?.mail) return '#';

    return `mailto:${quote.solicitante.mail}?subject=${encodeURIComponent(`Cotización de Servicios Araval Nº ${quote.id?.slice(-6)}`)}&body=${encodeURIComponent(`Estimado(a) ${quote.solicitante.nombre},\n\nAdjunto encontrará la cotización Nº ${quote.id?.slice(-6)} solicitada.\n\nPor favor, recuerde adjuntar el archivo PDF antes de enviar.\n\nSaludos cordiales,\nEquipo Araval.`)}`;
  }, [quote]);


  const handleExportPDF = async () => {
    setLoading(true);
    const quoteElement = document.getElementById('printable-area');
    if (!quoteElement || !quote) {
        setLoading(false);
        return;
    }

    const buttonContainer = document.getElementById('button-container');
    if(buttonContainer) buttonContainer.style.display = 'none';

    const canvas = await html2canvas(quoteElement, {
        scale: 2,
        windowWidth: quoteElement.scrollWidth,
        windowHeight: quoteElement.scrollHeight
    });

    if(buttonContainer) buttonContainer.style.display = 'flex';

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasHeight / canvasWidth;
    let imgHeight = pdfWidth * ratio;
    
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
        position = - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
    }

    const date = new Date();
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const correlative = quote.id ? quote.id.slice(-6) : "000000";
    const fileName = `Cot-${month}${day}-${correlative}.pdf`;


    pdf.save(fileName);
    setLoading(false);
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

  const neto = quote.total;
  const iva = neto * 0.19;
  const totalFinal = neto + iva;
  
  return (
    <>
      <div id="button-container" className="flex justify-end gap-2 mb-4 print:hidden">
        <a href={mailToLink} className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2 ${!quote.solicitante?.mail && 'pointer-events-none opacity-50'}`}>
            <Mail className="mr-2 h-4 w-4" />
            Enviar por Email
        </a>
        <Button onClick={handleExportPDF} disabled={loading}>
          {loading ? (
            <>
              <Download className="mr-2 h-4 w-4 animate-pulse" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exportar a PDF
            </>
          )}
        </Button>
      </div>
      
      <div id="printable-area" className="bg-gray-100 p-0 sm:p-4 print:p-0 print:bg-white">
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
              
              {quote.trabajadores && quote.trabajadores.length > 0 && (
                   <section className="mb-8">
                      <Card>
                          <CardHeader>
                              <CardTitle className="font-headline text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary"/>Trabajadores Incluidos en esta Cotización</CardTitle>
                          </CardHeader>
                          <CardContent>
                               <ul className="space-y-1 text-sm list-disc list-inside text-muted-foreground columns-2">
                                  {quote.trabajadores.map((t, i) => (
                                      <li key={i}><span className="text-foreground font-medium">{t.nombre}</span> (RUT: {t.rut})</li>
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

        {/* --- ANNEXES: EXAMINATION ORDERS --- */}
        {Object.keys(examsByWorker).length > 0 && (
          <section className="annex-section">
            <h2 className="text-center text-2xl font-headline font-bold text-gray-700 my-4 print:my-8">Anexos: Órdenes de Examen</h2>
            {Object.values(examsByWorker).map(({ trabajador, examenes }, index) => (
              <div key={trabajador.rut || index} className="order-page-container max-w-4xl mx-auto bg-white rounded-lg shadow-lg mb-8 print:shadow-none print:border-t-2 print:border-dashed print:mt-8 print:rounded-none">
                 <header className="bg-gray-100 p-6 rounded-t-lg print:rounded-none">
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
                             <p>{trabajador.nombre}</p>
                             <p className="text-sm text-muted-foreground">RUT: {trabajador.rut}</p>
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
                           {/* This logic assumes each worker has their own exam list. If not, it will show all exams. */}
                           {examenes.map(exam => (
                               <li key={exam.id}>{exam.nombre}</li>
                           ))}
                        </ul>
                    </div>

                    <Separator className="my-6" />

                     <div>
                        <h4 className="font-semibold text-gray-600 mb-4 text-center">Información para el Paciente</h4>
                        <div className="border rounded-lg p-4 bg-blue-50/50 text-blue-900">
                             <p className="font-bold text-lg text-center mb-3">Centro Médico Araval</p>
                             <div className="flex items-center gap-4 mb-2">
                                <MapPin className="h-5 w-5 text-blue-600 shrink-0"/>
                                <span>Juan Martinez 235, Taltal, Chile</span>
                             </div>
                             <div className="flex items-center gap-4 mb-2">
                                <Phone className="h-5 w-5 text-blue-600 shrink-0"/>
                                <span>+56 9 7541 1515</span>
                             </div>
                             <div className="flex items-center gap-4">
                                <Clock className="h-5 w-5 text-blue-600 shrink-0"/>
                                <span>Lunes a Viernes: 08:00-12:00 / 15:00-20:00</span>
                             </div>
                             <Separator className="my-4 bg-blue-200"/>
                             <p className="text-xs text-center text-blue-800">Centro Médico, Laboratorio Clínico, Salud Ocupacional, Toma De Muestras.</p>
                        </div>
                     </div>
                </main>
              </div>
            ))}
          </section>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #printable-area {
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

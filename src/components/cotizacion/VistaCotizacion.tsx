
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Mail, Building, User, Users } from 'lucide-react';
import type { Cotizacion, Examen } from '@/lib/types';
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

  const examsByCategory = useMemo(() => {
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

  const handleExportPDF = async () => {
    setLoading(true);
    const quoteElement = document.getElementById('printable-quote');
    if (!quoteElement || !quote) {
        setLoading(false);
        return;
    }

    // Hide buttons before taking screenshot
    const buttonContainer = document.getElementById('button-container');
    if(buttonContainer) buttonContainer.style.display = 'none';

    const canvas = await html2canvas(quoteElement, {
        scale: 2, // Increase scale for better resolution
    });

    // Show buttons again
    if(buttonContainer) buttonContainer.style.display = 'flex';

    const imgData = canvas.toDataURL('image/png');
    
    // a4 size in points (width, height)
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
    const imgHeight = pdfWidth * ratio;
    
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
        position = heightLeft - imgHeight;
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
          <h2 className="text-xl font-semibold">No se encontró la cotización</h2>
          <p className="text-muted-foreground">Los datos de la cotización no son válidos o no se proporcionaron.</p>
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
        <a href={mailToLink} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2">
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
                            <CardTitle className="font-headline text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary"/>Trabajadores Incluidos</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ul className="space-y-1 text-sm list-disc list-inside text-muted-foreground">
                                {quote.trabajadores.map((t, i) => (
                                    <li key={i}><span className="text-foreground font-medium">{t.nombre}</span> (RUT: {t.rut})</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </section>
            )}

            <section>
                <h3 className="font-headline text-lg font-semibold mb-4 text-gray-700">Detalle de Servicios</h3>
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead className="w-[70%] font-semibold text-gray-600">Examen</TableHead>
                                <TableHead className="text-right font-semibold text-gray-600">Valor Unitario</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.keys(examsByCategory).length > 0 ? (
                                Object.entries(examsByCategory).map(([category, exams]) => (
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
            <p className="font-semibold mt-1">contacto@araval.cl | +56 9 1234 5678</p>
        </footer>
      </div>

      <style jsx global>{`
        @page {
          size: letter;
          margin: 0;
        }
        @media print {
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-container {
            padding: 0;
            margin: 0;
          }
          #printable-quote {
            box-shadow: none;
            border: none;
            width: 100%;
            max-width: 100%;
            padding: 0;
            border-radius: 0;
          }
        }
      `}</style>
    </>
  );
}

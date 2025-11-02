
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Printer, FileText, Building, User } from 'lucide-react';
import type { Cotizacion, Examen } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

export function VistaCotizacion() {
  const [quote, setQuote] = useState<Cotizacion | null>(null);
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

  const handlePrint = () => {
    window.print();
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

  const neto = quote.total;
  const iva = neto * 0.19;
  const totalFinal = neto + iva;

  return (
    <>
      <div className="flex justify-end mb-4 print:hidden">
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir / Exportar
        </Button>
      </div>
      
      <div id="printable-quote" className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg print:shadow-none print:border-none print:rounded-none">
        <header className="bg-primary text-primary-foreground p-8 rounded-t-lg print:rounded-none">
            <div className="grid grid-cols-2 gap-8">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-md">
                        <Image src="/images/logo.png" alt="Araval Logo" width={40} height={40} className="text-primary"/>
                    </div>
                    <div>
                        <h1 className="font-headline text-2xl font-bold">ARAVAL</h1>
                        <p className="text-sm opacity-80">Servicios Médicos</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold font-headline">COTIZACIÓN</h2>
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
                    <h3 className="font-headline text-lg font-semibold text-gray-700 border-b pb-2 flex items-center gap-2"><User className="h-5 w-5 text-gray-500"/>Datos Trabajador</h3>
                    <p className="text-sm"><strong className="font-medium text-gray-600">Nombre:</strong> {quote.trabajador.nombre}</p>
                    <p className="text-sm"><strong className="font-medium text-gray-600">RUT:</strong> {quote.trabajador.rut}</p>
                    <p className="text-sm"><strong className="font-medium text-gray-600">Cargo:</strong> {quote.trabajador.cargo}</p>
                    <p className="text-sm"><strong className="font-medium text-gray-600">Email:</strong> {quote.trabajador.mail}</p>
                </div>
            </section>

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

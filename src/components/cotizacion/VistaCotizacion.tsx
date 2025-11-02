
"use client";

import React, { useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Printer, FileText } from 'lucide-react';
import type { Cotizacion, Examen } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
      <Card className="max-w-4xl mx-auto p-6">
          <h2 className="text-xl font-semibold">No se encontró la cotización</h2>
          <p className="text-muted-foreground">Los datos de la cotización no son válidos o no se proporcionaron.</p>
      </Card>
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
      
      <Card id="printable-quote" className="max-w-4xl mx-auto p-4 sm:p-8 shadow-lg bg-white print:shadow-none print:border-none">
        <header className="flex justify-between items-start mb-8">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <FileText className="h-10 w-10 text-primary" />
                    <h1 className="font-headline text-4xl font-bold text-gray-800">Cotización</h1>
                </div>
                <p className="text-gray-500">Araval Servicios Médicos</p>
            </div>
            <div className="text-right">
                <p className="font-semibold text-gray-700">Fecha: {quote.fecha}</p>
                <p className="text-sm text-gray-500">Válida por 30 días</p>
            </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            <div className="space-y-1">
                <h2 className="font-headline text-lg font-semibold border-b pb-2 mb-2 text-gray-700">Datos Empresa</h2>
                <p><strong className="font-medium text-gray-600">Razón Social:</strong> {quote.empresa.razonSocial}</p>
                <p><strong className="font-medium text-gray-600">RUT:</strong> {quote.empresa.rut}</p>
                <p><strong className="font-medium text-gray-600">Dirección:</strong> {quote.empresa.direccion}</p>
            </div>
             <div className="space-y-1">
                <h2 className="font-headline text-lg font-semibold border-b pb-2 mb-2 text-gray-700">Datos Trabajador</h2>
                <p><strong className="font-medium text-gray-600">Nombre:</strong> {quote.trabajador.nombre}</p>
                <p><strong className="font-medium text-gray-600">RUT:</strong> {quote.trabajador.rut}</p>
                <p><strong className="font-medium text-gray-600">Cargo:</strong> {quote.trabajador.cargo}</p>
                 <p><strong className="font-medium text-gray-600">Email:</strong> {quote.trabajador.mail}</p>
            </div>
        </section>

        <section>
            <h2 className="font-headline text-lg font-semibold mb-4 text-gray-700">Detalle de Exámenes</h2>
            <Table>
                <TableHeader>
                    <TableRow className="bg-gray-50">
                        <TableHead className="w-[60%]">Examen</TableHead>
                        <TableHead className="text-right">Valor Unitario</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.entries(examsByCategory).map(([category, exams]) => (
                        <React.Fragment key={category}>
                            <TableRow className="bg-gray-100/50">
                                <TableCell colSpan={2} className="font-headline font-semibold text-primary">
                                    {category}
                                </TableCell>
                            </TableRow>
                            {exams.map((exam) => (
                                <TableRow key={exam.id}>
                                    <TableCell className="font-medium text-gray-800 pl-8">{exam.nombre}</TableCell>
                                    <TableCell className="text-right font-medium text-gray-700">{formatCurrency(exam.valor)}</TableCell>
                                </TableRow>
                            ))}
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </section>

        <section className="mt-8 flex justify-end">
            <div className="w-full max-w-sm space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Neto</span>
                    <span className="font-medium text-gray-700">{formatCurrency(neto)}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-gray-600">Descuentos</span>
                    <span className="font-medium text-gray-700">{formatCurrency(0)}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-gray-600">Adicional</span>
                    <span className="font-medium text-gray-700">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">IVA (19%)</span>
                    <span className="font-medium text-gray-700">{formatCurrency(iva)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center text-xl font-bold">
                    <span className="text-gray-800">TOTAL</span>
                    <span className="text-primary">{formatCurrency(totalFinal)}</span>
                </div>
                <Separator className="my-2"/>
            </div>
        </section>
        
        <footer className="mt-16 text-center text-xs text-gray-400">
            <p>Gracias por preferir Araval. Para agendar, por favor contacte a nuestro equipo.</p>
            <p>contacto@araval.cl | +56 9 1234 5678</p>
        </footer>
      </Card>

      <style jsx global>{`
        @media print {
          body {
            background-color: white;
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
          }
        }
      `}</style>
    </>
  );
}

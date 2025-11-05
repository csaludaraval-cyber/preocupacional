
"use client";

import React from 'react';
import Image from 'next/image';
import { Building, User, Users } from 'lucide-react';
import type { Cotizacion, Examen } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DetalleCotizacionProps {
  quote: Cotizacion;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
};

export function DetalleCotizacion({ quote }: DetalleCotizacionProps) {

    const allExams = React.useMemo(() => {
        if (!quote?.solicitudes) return [];
        return quote.solicitudes.flatMap(s => s.examenes);
    }, [quote]);

    const examsByMainCategory = React.useMemo(() => {
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

    const neto = quote.total;
    const iva = neto * 0.19;
    const totalFinal = neto + iva;

  return (
    <div id="printable-quote" className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg print:shadow-none print:border-none print:rounded-none px-12 py-8">
        <header className="flex justify-between items-start pb-6 bg-primary text-primary-foreground -m-12 mb-8 p-12 -mx-12">
            <div>
                <h2 className="text-3xl font-bold font-headline">COTIZACIÓN</h2>
                <p className="mt-1 text-sm">Nº: {quote.id ? quote.id.slice(-6) : 'N/A'}</p>
                <p className="mt-1 text-sm">Fecha: {quote.fecha}</p>
            </div>
                <Image
                src="/logo2.png"
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
            <p className="text-sm"><strong className="font-medium text-gray-600">Email:</strong> {quote.empresa.email}</p>
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
                <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
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
  );
}

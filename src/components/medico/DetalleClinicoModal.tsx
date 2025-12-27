'use client';

import React from 'react';
import type { CotizacionFirestore } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { User, ClipboardList, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    quote: CotizacionFirestore;
}

export function DetalleClinicoModal({ quote }: Props) {
    
    const totalWorkers = quote.solicitudesData?.length || 0;
    
    // Función para generar una lista de exámenes simple para descarga
    const handleDownloadNomenclature = () => {
        let content = `Órdenes de Examen para: ${quote.empresaData?.razonSocial || 'N/A'}\nFecha: ${new Date().toLocaleDateString('es-CL')}\n\n`;
        
        quote.solicitudesData?.forEach((solicitud, index) => {
            const trabajador = solicitud.trabajador;
            content += `--- Trabajador ${index + 1} ---\n`;
            content += `Nombre: ${trabajador?.nombre || 'N/A'}\n`;
            content += `RUT: ${trabajador?.rut || 'N/A'}\n`;
            content += `Exámenes:\n`;
            solicitud.examenes?.forEach(examen => {
                content += `  - ${examen.nombre || 'Examen sin nombre'}\n`;
            });
            content += '\n';
        });

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Ordenes_Clinicas_${quote.empresaData?.razonSocial || 'Orden'}_${quote.id?.slice(-6)}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
                <div className='flex items-center gap-4'>
                    <Building className='w-6 h-6 text-primary'/>
                    <div>
                        <h3 className="text-xl font-bold">{quote.empresaData?.razonSocial || 'Empresa No Identificada'}</h3>
                        <p className="text-sm text-muted-foreground">RUT: {quote.empresaData?.rut || 'N/A'} | {totalWorkers} Trabajadores</p>
                    </div>
                </div>
                <Button variant="outline" onClick={handleDownloadNomenclature}>
                    <ClipboardList className='w-4 h-4 mr-2'/> Descargar Nómina Simple
                </Button>
            </div>

            <Card className='shadow-sm'>
                <CardHeader>
                    <CardTitle className='text-lg'>Detalle de Exámenes por Trabajador</CardTitle>
                    <CardDescription>Verifique qué exámenes corresponden a cada paciente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className='w-[200px]'>Trabajador / RUT</TableHead>
                                <TableHead>Cargo</TableHead>
                                <TableHead>Exámenes Solicitados</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quote.solicitudesData?.map((solicitud, index) => (
                                <TableRow key={index} className='hover:bg-blue-50/50'>
                                    <TableCell className='font-medium'>
                                        <div className='flex items-center gap-2'>
                                            <User className='w-4 h-4'/>
                                            {solicitud.trabajador?.nombre || 'Paciente sin Nombre'}
                                        </div>
                                        <p className='text-xs text-muted-foreground'>{solicitud.trabajador?.rut || 'RUT N/A'}</p>
                                    </TableCell>
                                    <TableCell>{solicitud.trabajador?.cargo || 'N/A'}</TableCell>
                                    <TableCell>
                                        <div className='flex flex-wrap gap-2'>
                                            {solicitud.examenes?.map((examen, idx) => (
                                                // Solo mostramos el nombre del examen
                                                <Badge key={idx} variant="secondary" className='bg-primary/10 text-primary hover:bg-primary/20'>
                                                    {examen.nombre || 'Examen Indefinido'}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
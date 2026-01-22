'use client';

import React from 'react';
import type { CotizacionFirestore } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { User, ClipboardList, Building, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { differenceInYears, format } from 'date-fns';

interface Props {
    quote: CotizacionFirestore;
}

/**
 * Helper para cálculo de edad
 */
const getEdad = (fechaNac?: string) => {
    if (!fechaNac) return 'N/A';
    try {
        const d = new Date(fechaNac);
        if (isNaN(d.getTime())) return 'N/A';
        return differenceInYears(new Date(), d) + " años";
    } catch (e) {
        return 'N/A';
    }
};

/**
 * Helper para formateo de fecha
 */
const fmtFecha = (fecha?: string) => {
    if (!fecha) return 'N/A';
    try {
        const d = new Date(fecha);
        return isNaN(d.getTime()) ? fecha : format(d, 'dd/MM/yyyy');
    } catch (e) {
        return 'N/A';
    }
};

export function DetalleClinicoModal({ quote }: Props) {
    const totalWorkers = quote.solicitudesData?.length || 0;
    
    const handleDownloadNomenclature = () => {
        let content = `ÓRDEN CLÍNICA: ${quote.empresaData?.razonSocial || 'N/A'}\n`;
        content += `RUT Empresa: ${quote.empresaData?.rut || 'N/A'}\n`;
        content += `Fecha de Reporte: ${new Date().toLocaleDateString('es-CL')}\n`;
        content += `--------------------------------------------------\n\n`;
        
        quote.solicitudesData?.forEach((solicitud, index) => {
            const t = solicitud.trabajador;
            content += `TRABAJADOR ${index + 1}:\n`;
            content += `Evaluación: ${fmtFecha(t?.fechaAtencion)}\n`;
            content += `Nombre: ${t?.nombre || 'N/A'}\n`;
            content += `RUT: ${t?.rut || 'N/A'}\n`;
            content += `Fecha Nacimiento: ${fmtFecha(t?.fechaNacimiento)}\n`;
            content += `Edad: ${getEdad(t?.fechaNacimiento)}\n`;
            content += `Cargo: ${t?.cargo || 'N/A'}\n`;
            content += `Exámenes:\n`;
            solicitud.examenes?.forEach(ex => {
                content += `  [ ] ${ex.nombre}\n`;
            });
            content += '\n';
        });

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Nomina_Clinica_${quote.empresaData?.razonSocial || 'Araval'}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
                <div className='flex items-center gap-4'>
                    <div className='p-2 bg-primary/10 rounded-lg'>
                        <Building className='w-6 h-6 text-primary'/>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{quote.empresaData?.razonSocial || 'Empresa No Identificada'}</h3>
                        <p className="text-sm text-muted-foreground">RUT: {quote.empresaData?.rut || 'N/A'} • {totalWorkers} Pacientes</p>
                    </div>
                </div>
                <Button variant="default" onClick={handleDownloadNomenclature} className='bg-slate-900 hover:bg-slate-800 text-white'>
                    <ClipboardList className='w-4 h-4 mr-2'/> Descargar Nómina Simple
                </Button>
            </div>

            <Card className='shadow-sm border-slate-200'>
                <CardHeader className='bg-slate-50/50'>
                    <CardTitle className='text-lg flex items-center gap-2'>
                        <ClipboardList className='w-5 h-5 text-primary'/>
                        Nómina Detallada para Evaluación
                    </CardTitle>
                    <CardDescription>Información demográfica y clínica del paciente</CardDescription>
                </CardHeader>
                <CardContent className='p-0'>
                    <Table>
                        <TableHeader>
                            <TableRow className='bg-slate-50'>
                                <TableHead className='font-bold text-slate-600'>Fecha Eval.</TableHead>
                                <TableHead className='font-bold text-slate-600'>Paciente / RUT</TableHead>
                                <TableHead className='font-bold text-slate-600'>Datos Personales</TableHead>
                                <TableHead className='font-bold text-slate-600'>Cargo</TableHead>
                                <TableHead className='font-bold text-slate-600'>Exámenes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quote.solicitudesData?.map((solicitud, index) => (
                                <TableRow key={index} className='hover:bg-blue-50/30'>
                                    <TableCell className='text-xs font-semibold'>
                                        {fmtFecha(solicitud.trabajador?.fechaAtencion)}
                                    </TableCell>
                                    <TableCell>
                                        <div className='flex items-center gap-2 font-bold text-slate-700'>
                                            <User className='w-3 h-3 text-slate-400'/>
                                            {solicitud.trabajador?.nombre || 'S/N'}
                                        </div>
                                        <p className='text-[10px] text-muted-foreground ml-5'>{solicitud.trabajador?.rut || 'RUT N/A'}</p>
                                    </TableCell>
                                    <TableCell>
                                        <div className='space-y-0.5'>
                                            <p className='text-xs font-medium'>Nac: {fmtFecha(solicitud.trabajador?.fechaNacimiento)}</p>
                                            <Badge variant="outline" className='text-[9px] px-1 h-4 bg-white'>
                                                {getEdad(solicitud.trabajador?.fechaNacimiento)}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className='text-xs'>{solicitud.trabajador?.cargo || 'N/A'}</TableCell>
                                    <TableCell>
                                        <div className='flex flex-wrap gap-1'>
                                            {solicitud.examenes?.map((examen, idx) => (
                                                <Badge key={idx} variant="secondary" className='text-[9px] bg-blue-100 text-blue-700 border-none'>
                                                    {examen.nombre}
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
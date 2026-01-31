'use client';

import React from 'react';
import type { CotizacionFirestore } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { User, ClipboardList, Building, MapPin, Mail, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { differenceInYears, format } from 'date-fns';

interface Props {
    quote: CotizacionFirestore;
}

const getEdad = (fechaNac?: string) => {
    if (!fechaNac) return 'N/A';
    try {
        const d = new Date(fechaNac);
        if (isNaN(d.getTime())) return 'N/A';
        return differenceInYears(new Date(), d) + " años";
    } catch (e) { return 'N/A'; }
};

const fmtFecha = (fecha?: string) => {
    if (!fecha) return 'N/A';
    try {
        const d = new Date(fecha);
        return isNaN(d.getTime()) ? fecha : format(d, 'dd/MM/yyyy');
    } catch (e) { return 'N/A'; }
};

export function DetalleClinicoModal({ quote }: Props) {
    const totalWorkers = quote.solicitudesData?.length || 0;
    
    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b pb-6">
                <div className='flex items-start gap-4'>
                    <div className='p-3 bg-blue-50 rounded-xl'>
                        <Building className='w-8 h-8 text-blue-600'/>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">{quote.empresaData?.razonSocial || 'Empresa'}</h3>
                        <p className="text-xs font-bold text-slate-400">RUT: {quote.empresaData?.rut || 'N/A'}</p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                            <MapPin className="w-4 h-4 text-blue-500"/>
                            {quote.empresaData?.direccion}, {quote.empresaData?.comuna}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[250px]">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Contacto Solicitante</p>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <UserCheck className="w-4 h-4 text-blue-600"/> {quote.solicitanteData?.nombre || 'No registrado'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-blue-600 underline">
                            <Mail className="w-4 h-4"/> {quote.solicitanteData?.mail || 'Sin correo'}
                        </div>
                    </div>
                </div>
            </div>

            <Card className='shadow-sm border-slate-200'>
                <CardHeader className='bg-slate-50/50'>
                    <CardTitle className='text-lg flex items-center gap-2 uppercase font-bold tracking-tight'>
                        <ClipboardList className='w-5 h-5 text-blue-600'/>
                        Nómina de Evaluación ({totalWorkers})
                    </CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                    <Table>
                        <TableHeader>
                            <TableRow className='bg-slate-50'>
                                <TableHead className='font-bold text-[10px] uppercase'>Fecha Eval.</TableHead>
                                <TableHead className='font-bold text-[10px] uppercase'>Paciente / RUT</TableHead>
                                <TableHead className='font-bold text-[10px] uppercase'>Datos Personales</TableHead>
                                <TableHead className='font-bold text-[10px] uppercase'>Cargo</TableHead>
                                <TableHead className='font-bold text-[10px] uppercase'>Exámenes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quote.solicitudesData?.map((solicitud, index) => (
                                <TableRow key={index} className='hover:bg-blue-50/30'>
                                    <TableCell className='text-xs font-bold'>{fmtFecha(solicitud.trabajador?.fechaAtencion)}</TableCell>
                                    <TableCell>
                                        <div className='flex items-center gap-2 font-bold text-slate-700 text-xs uppercase'>
                                            <User className='w-3 h-3 text-slate-400'/> {solicitud.trabajador?.nombre || 'S/N'}
                                        </div>
                                        <p className='text-[10px] text-slate-400 ml-5'>{solicitud.trabajador?.rut}</p>
                                    </TableCell>
                                    <TableCell>
                                        <div className='text-[10px] font-medium'>Nac: {fmtFecha(solicitud.trabajador?.fechaNacimiento)}</div>
                                        <Badge variant="outline" className='text-[9px] px-1 h-4 bg-white mt-1'>{getEdad(solicitud.trabajador?.fechaNacimiento)}</Badge>
                                    </TableCell>
                                    <TableCell className='text-xs'>{solicitud.trabajador?.cargo || 'N/A'}</TableCell>
                                    <TableCell>
                                        <div className='flex flex-wrap gap-1'>
                                            {solicitud.examenes?.map((examen, idx) => (
                                                <Badge key={idx} variant="secondary" className='text-[9px] bg-blue-50 text-blue-700 border-none font-bold'>
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
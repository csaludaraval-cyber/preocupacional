"use client";

import React from 'react';
import ReactDOM from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Cotizacion } from '@/lib/types';
import { DetalleCotizacion } from './DetalleCotizacion';
import { format, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * HELPER: Calcula edad exacta
 */
const calcularEdad = (fechaNac: string) => {
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
 * HELPER: Formateo de fecha seguro
 */
const formatFechaSafe = (fecha: string) => {
    if (!fecha) return 'N/A';
    try {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return fecha;
        return format(d, 'dd/MM/yyyy');
    } catch (e) {
        return fecha;
    }
};

// Componente para las Órdenes de Examen (Anexos)
export const OrdenDeExamen = ({ solicitud, empresa, fechaCotizacion }: { solicitud: any, empresa: any, fechaCotizacion: string }) => {
    const trabajador = solicitud.trabajador || {};
    
    return (
        <div className="order-page-container bg-white text-black p-8" style={{ width: '800px' }}>
            <div className="max-w-4xl mx-auto text-sm space-y-4 font-sans">
                <header className="flex justify-between items-center mb-10 border-b-2 border-slate-900 pb-4">
                     <div className="bg-slate-900 text-white py-2 px-4 rounded-sm">
                        <h2 className="font-bold text-lg uppercase tracking-tight">Orden de Examen</h2>
                    </div>
                     <div className="text-right">
                         <p className="text-2xl font-black text-slate-900">ARAVAL</p>
                         <p className='text-[10px] text-slate-500 font-bold uppercase'>Centro de Salud</p>
                     </div>
                </header>

                <main className="space-y-8">
                    <section className="grid grid-cols-2 gap-8">
                        {/* DATOS EMPRESA */}
                        <div className="bg-slate-50 p-4 border border-slate-200">
                            <h3 className="font-bold text-[10px] uppercase text-slate-400 mb-2 border-b border-slate-200 pb-1">Datos de Empresa</h3>
                            <p className="font-bold text-slate-800 text-sm">{empresa?.razonSocial || 'N/A'}</p>
                            <p className="text-xs text-slate-600">RUT: {empresa?.rut || 'N/A'}</p>
                        </div>

                        {/* DATOS TRABAJADOR (REDISEÑADO) */}
                        <div className="bg-slate-50 p-4 border border-slate-200">
                            <h3 className="font-bold text-[10px] uppercase text-slate-400 mb-2 border-b border-slate-200 pb-1">Datos del Trabajador</h3>
                            <div className="grid grid-cols-1 gap-1">
                                <p className="text-xs">
                                    <span className="font-bold text-slate-400 uppercase text-[9px]">Fecha Eval:</span> 
                                    <span className="ml-2 font-bold text-slate-700">{formatFechaSafe(trabajador.fechaAtencion)}</span>
                                </p>
                                <p className="text-xs">
                                    <span className="font-bold text-slate-400 uppercase text-[9px]">Nombre:</span> 
                                    <span className="ml-2 font-bold text-slate-700">{trabajador.nombre || 'N/A'}</span>
                                </p>
                                <p className="text-xs">
                                    <span className="font-bold text-slate-400 uppercase text-[9px]">RUT:</span> 
                                    <span className="ml-2 font-bold text-slate-700">{trabajador.rut || 'N/A'}</span>
                                </p>
                                <p className="text-xs">
                                    <span className="font-bold text-slate-400 uppercase text-[9px]">Fecha Nac:</span> 
                                    <span className="ml-2 font-bold text-slate-700">{formatFechaSafe(trabajador.fechaNacimiento)}</span>
                                </p>
                                <p className="text-xs">
                                    <span className="font-bold text-slate-400 uppercase text-[9px]">Edad:</span> 
                                    <span className="ml-2 font-bold text-slate-700">{calcularEdad(trabajador.fechaNacimiento)}</span>
                                </p>
                            </div>
                        </div>
                    </section>
                    
                    <section className="space-y-2">
                        <h3 className="font-bold text-[10px] uppercase text-slate-400">Prestaciones a realizar</h3>
                        <div className="border border-slate-200 rounded-sm overflow-hidden">
                            {(solicitud.examenes || []).map((exam: any, idx: number) => (
                                <div key={idx} className="p-2 text-xs border-b border-slate-100 last:border-none bg-white">
                                    • {exam.nombre}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="pt-20">
                        <div className="flex justify-between items-end border-t border-slate-200 pt-4">
                            <div className="text-[10px] text-slate-400">
                                <p>Fecha de emisión: {fechaCotizacion}</p>
                                <p>Documento generado electrónicamente</p>
                            </div>
                            <div className="w-48 border-t-2 border-slate-900 text-center pt-2">
                                <p className="text-[10px] font-bold uppercase">Firma y Timbre Araval</p>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export class GeneradorPDF {
  static async generar(quote: Cotizacion, includeAnnexes = true): Promise<Blob> {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px'; 
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);

    let fechaStr = "S/F";
    try {
        const fc = quote.fechaCreacion as any;
        if (fc && typeof fc === 'object' && (fc.seconds || fc._seconds)) {
            const s = fc.seconds || fc._seconds;
            fechaStr = format(new Date(s * 1000), 'dd/MM/yyyy', { locale: es });
        } else {
            fechaStr = (quote as any).fecha || format(new Date(), 'dd/MM/yyyy');
        }
    } catch (e) {
        fechaStr = format(new Date(), 'dd/MM/yyyy');
    }

    const content = (
        <React.Fragment>
            <div id="pdf-main-content">
                <DetalleCotizacion quote={quote} />
            </div>
            {includeAnnexes && (quote.solicitudesData || []).map((sol: any, i: number) => (
                <OrdenDeExamen 
                    key={i} 
                    solicitud={sol} 
                    empresa={quote.empresaData || {}} 
                    fechaCotizacion={fechaStr} 
                />
            ))}
        </React.Fragment>
    );

    try {
        root.render(content);
        await new Promise(r => setTimeout(r, 1000)); // Aumentado a 1s para asegurar renderizado de datos nuevos

        const pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
        const pdfWidth = pdf.internal.pageSize.getWidth();

        const process = async (el: HTMLElement, isNext = false) => {
            if (isNext) pdf.addPage();
            const canvas = await html2canvas(el, { scale: 1.5, useCORS: true });
            const data = canvas.toDataURL('image/jpeg', 0.7);
            const height = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(data, 'JPEG', 0, 0, pdfWidth, height, undefined, 'FAST');
        };

        const main = container.querySelector<HTMLElement>('#pdf-main-content');
        if (main) await process(main);

        if (includeAnnexes) {
            const annexes = container.querySelectorAll<HTMLElement>('.order-page-container');
            for (let i = 0; i < annexes.length; i++) {
                await process(annexes[i], true);
            }
        }

        return pdf.output('blob');
    } finally {
        root.unmount();
        if (document.body.contains(container)) document.body.removeChild(container);
    }
  }
}
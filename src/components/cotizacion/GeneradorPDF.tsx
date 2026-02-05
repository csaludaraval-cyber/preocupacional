"use client";

import React from 'react';
import ReactDOM from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Cotizacion } from '@/lib/types';
import { DetalleCotizacion } from './DetalleCotizacion';
import { format, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';

const calcularEdad = (fechaNac: string) => {
    if (!fechaNac) return 'N/A';
    try {
        const d = new Date(fechaNac);
        if (isNaN(d.getTime())) return 'N/A';
        return differenceInYears(new Date(), d) + " años";
    } catch (e) { return 'N/A'; }
};

const formatFechaSafe = (fecha: string) => {
    if (!fecha) return 'N/A';
    try {
        const d = new Date(fecha);
        return isNaN(d.getTime()) ? fecha : format(d, 'dd/MM/yyyy');
    } catch (e) { return fecha; }
};

export const OrdenDeExamen = ({ solicitud, empresa, fechaCotizacion }: { solicitud: any, empresa: any, fechaCotizacion: string }) => {
    const trabajador = solicitud.trabajador || {};
    return (
        <div className="order-page-container bg-white text-black p-12 mx-auto" style={{ width: '800px' }}>
            <div className="max-w-4xl mx-auto text-sm space-y-8 font-sans">
                <header className="flex justify-between items-center mb-10 border-b-4 border-slate-900 pb-6">
                     <div className="bg-slate-900 text-white py-2 px-8 rounded-sm">
                        <h2 className="font-black text-lg uppercase tracking-[0.2em] italic">Orden de Examen</h2>
                    </div>
                     <img src="/images/logo.png" alt="Araval Logo" className="h-14 w-auto object-contain" />
                </header>

                <main className="space-y-10">
                    <section className="grid grid-cols-2 gap-10">
                        {/* DATOS EMPRESA */}
                        <div className="bg-slate-100 border border-slate-300 p-6 rounded-sm relative text-left">
                            <span className="absolute -top-2.5 left-4 bg-white px-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Datos de Empresa</span>
                            <p className="font-black text-slate-900 text-sm mt-2 uppercase leading-tight">{empresa?.razonSocial || 'N/A'}</p>
                            <p className="text-xs text-slate-600 font-bold">RUT: {empresa?.rut || 'N/A'}</p>
                        </div>

                        {/* DATOS TRABAJADOR (ALINEACIÓN IZQUIERDA CORREGIDA) */}
                        <div className="bg-slate-100 border border-slate-300 p-6 rounded-sm relative text-left">
                            <span className="absolute -top-2.5 left-4 bg-white px-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Datos del Trabajador</span>
                            <div className="space-y-1.5 mt-2">
                                <div className="flex items-center text-xs">
                                    <span className="font-bold text-slate-500 uppercase text-[9px] w-20">Fecha Eval:</span>
                                    <span className="font-black text-slate-800">{formatFechaSafe(trabajador.fechaAtencion)}</span>
                                </div>
                                <div className="flex items-center text-xs">
                                    <span className="font-bold text-slate-500 uppercase text-[9px] w-20">Nombre:</span>
                                    <span className="font-black text-slate-800 uppercase">{trabajador.nombre || 'N/A'}</span>
                                </div>
                                <div className="flex items-center text-xs">
                                    <span className="font-bold text-slate-500 uppercase text-[9px] w-20">RUT:</span>
                                    <span className="font-black text-slate-800">{trabajador.rut || 'N/A'}</span>
                                </div>
                                <div className="flex items-center text-xs">
                                    <span className="font-bold text-slate-500 uppercase text-[9px] w-20">Edad:</span>
                                    <span className="font-black text-slate-800">{calcularEdad(trabajador.fechaNacimiento)}</span>
                                </div>
                            </div>
                        </div>
                    </section>
                    
                    <section className="space-y-4">
                        <h3 className="font-black text-[10px] uppercase text-slate-500 tracking-widest border-l-4 border-slate-900 pl-3">Prestaciones a realizar</h3>
                        <div className="border border-slate-300 rounded-sm overflow-hidden shadow-sm">
                            {(solicitud.examenes || []).map((exam: any, idx: number) => (
                                <div key={idx} className="p-5 text-xs border-b border-slate-200 last:border-none bg-white text-left">
                                    <p className="font-black text-slate-900 uppercase tracking-tight">• {exam.nombre}</p>
                                    {exam.descripcion && <p className="text-[10px] text-slate-500 mt-1 ml-4 italic uppercase leading-relaxed font-medium">{exam.descripcion}</p>}
                                </div>
                            ))}
                        </div>
                    </section>

                    <footer className="pt-32">
                        <div className="border-t-2 border-slate-200 pt-6 flex justify-between items-center opacity-70">
                            <div className="text-left text-[9px] text-slate-500 uppercase font-black tracking-widest space-y-1">
                                <p>Fecha de emisión: {fechaCotizacion}</p>
                                <p>Documento electrónico Araval B2B</p>
                            </div>
                            <p className="text-[9px] font-black text-slate-900 uppercase tracking-tighter">Válido para atención en Centros Araval</p>
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
};

export class GeneradorPDF {
  static async generar(quote: Cotizacion, includeAnnexes = true): Promise<Blob> {
    const container = document.createElement('div');
    container.style.position = 'absolute'; container.style.left = '-9999px'; container.style.width = '800px'; 
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    let fechaStr = format(new Date(), 'dd/MM/yyyy');
    try { const fc = quote.fechaCreacion as any; if (fc?.seconds) fechaStr = format(new Date(fc.seconds * 1000), 'dd/MM/yyyy'); } catch (e) {}

    const content = (
        <React.Fragment>
            <div id="pdf-main-content"><DetalleCotizacion quote={quote} /></div>
            {includeAnnexes && (quote.solicitudesData || []).map((sol: any, i: number) => (
                <OrdenDeExamen key={i} solicitud={sol} empresa={quote.empresaData || {}} fechaCotizacion={fechaStr} />
            ))}
        </React.Fragment>
    );

    try {
        root.render(content);
        await new Promise(r => setTimeout(r, 1000));
        const pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const process = async (el: HTMLElement, isNext = false) => {
            if (isNext) pdf.addPage();
            const canvas = await html2canvas(el, { scale: 2, useCORS: true });
            const data = canvas.toDataURL('image/jpeg', 0.8);
            const height = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(data, 'JPEG', 0, 0, pdfWidth, height, undefined, 'FAST');
        };
        const main = container.querySelector<HTMLElement>('#pdf-main-content');
        if (main) await process(main);
        if (includeAnnexes) {
            const annexes = container.querySelectorAll<HTMLElement>('.order-page-container');
            for (let i = 0; i < annexes.length; i++) await process(annexes[i] as HTMLElement, true);
        }
        return pdf.output('blob');
    } finally { root.unmount(); document.body.removeChild(container); }
  }
}
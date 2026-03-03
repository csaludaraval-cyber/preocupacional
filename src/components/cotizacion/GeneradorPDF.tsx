"use client";

import React from 'react';
import ReactDOM from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DetalleCotizacion } from './DetalleCotizacion';
import { format, differenceInYears } from 'date-fns';

const calcularEdad = (fechaNac: string) => {
    if (!fechaNac) return 'N/A';
    try {
        const d = new Date(fechaNac);
        return isNaN(d.getTime()) ? 'N/A' : differenceInYears(new Date(), d) + " años";
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
        <div className="order-page-container bg-white text-black p-10 mx-auto" style={{ width: '800px' }}>
            <div className="max-w-4xl mx-auto text-sm space-y-4 font-sans antialiased">
                
                {/* HEADER CLÍNICO COMPACTO */}
                <header className="flex justify-between items-center mb-2 border-b-2 border-slate-900 pb-3 text-left">
                     <div className="bg-slate-900 text-white py-1 px-5 rounded-sm">
                        <h2 className="font-black text-xs uppercase tracking-[0.2em] italic">Orden de Examen</h2>
                    </div>
                     <img src="/images/logo.png" alt="Araval Logo" className="h-8 w-auto object-contain" />
                </header>

                <main className="space-y-4 text-left">
                    <section className="grid grid-cols-2 gap-4 text-left">
                        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-sm text-left">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Empresa Solicitante</span>
                            <p className="font-black text-slate-900 text-[10px] uppercase leading-tight tracking-tighter">{empresa?.razonSocial || 'N/A'}</p>
                            <p className="text-[9px] text-slate-600 font-bold">RUT: {empresa?.rut || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-sm text-left">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Datos del Paciente</span>
                            <div className="space-y-0">
                                <p className="text-[10px] font-black uppercase text-slate-800 tracking-tighter">{trabajador.nombre || 'N/A'}</p>
                                <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                                    <span>RUT: {trabajador.rut}</span>
                                    <span>Edad: {calcularEdad(trabajador.fechaNacimiento)}</span>
                                </div>
                                <p className="text-[8px] font-black text-blue-600 uppercase border-t border-slate-200 mt-1 pt-0.5 tracking-tighter italic">Atención: {formatFechaSafe(trabajador.fechaAtencion)}</p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-2">
                        <h3 className="font-black text-[8px] uppercase text-slate-500 tracking-widest border-l-4 border-slate-900 pl-2">Prestaciones Autorizadas</h3>
                        <div className="border border-slate-200 rounded-sm divide-y divide-slate-100">
                            {(solicitud.examenes || []).map((exam: any, idx: number) => (
                                <div key={idx} className="py-1 px-3 bg-white text-left">
                                    <p className="font-black text-slate-900 uppercase text-[9px] tracking-tighter leading-tight">• {exam.nombre}</p>
                                    {exam.descripcion && (
                                        <p className="text-[8px] text-slate-400 ml-3 italic uppercase leading-none tracking-tighter">
                                            {exam.descripcion}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <footer className="pt-6 border-t border-slate-100">
                        <div className="flex justify-between items-end opacity-50">
                            <div className="text-left text-[7px] text-slate-400 uppercase font-black tracking-widest space-y-0"><p>Emisión: {fechaCotizacion}</p><p>Gestión Araval B2B</p></div>
                            <div className="text-right"><p className="text-[7px] font-black text-slate-900 uppercase italic">Válido para atención en sucursales Araval</p></div>
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
};

export class GeneradorPDF {
  static async generar(quote: any, includeAnnexes = true, soloOrdenes = false): Promise<Blob> {
    const container = document.createElement('div');
    container.style.position = 'absolute'; container.style.left = '-9999px'; container.style.width = '800px'; 
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    
    const quotePages: any[] = [];
    const EXAMS_PER_PAGE = 8; 
    let currentExamsCount = 0;
    let currentSolicitudes: any[] = [];

    (quote.solicitudesData || []).forEach((sol: any) => {
        let examsRemaining = [...sol.examenes];
        let isFirstPart = true;

        while (examsRemaining.length > 0) {
            const spaceLeft = EXAMS_PER_PAGE - currentExamsCount;
            const examsForThisPage = examsRemaining.slice(0, spaceLeft);
            examsRemaining = examsRemaining.slice(spaceLeft);

            currentSolicitudes.push({ ...sol, examenes: examsForThisPage, isContinuation: !isFirstPart });
            currentExamsCount += examsForThisPage.length;
            isFirstPart = false;

            if (currentExamsCount >= EXAMS_PER_PAGE) {
                quotePages.push({ solicitudes: currentSolicitudes, isLast: false });
                currentSolicitudes = [];
                currentExamsCount = 0;
            }
        }
    });
    if (currentSolicitudes.length > 0) quotePages.push({ solicitudes: currentSolicitudes, isLast: true });

    try {
        const pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
        const pdfWidth = pdf.internal.pageSize.getWidth();

        if (!soloOrdenes) {
            for (let i = 0; i < quotePages.length; i++) {
                if (i > 0) pdf.addPage();
                root.render(<DetalleCotizacion quote={quote} solicitudesSlice={quotePages[i].solicitudes} isLastPage={quotePages[i].isLast} showNextPageLabel={!quotePages[i].isLast} />);
                await new Promise(r => setTimeout(r, 1200));
                const canvas = await html2canvas(container, { scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff' });
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfWidth, (canvas.height * pdfWidth) / canvas.width, undefined, 'FAST');
            }
        }

        if (includeAnnexes) {
            for (const sol of (quote.solicitudesData || [])) {
                let annexExams = [...sol.examenes];
                while (annexExams.length > 0) {
                    pdf.addPage();
                    // CAPACIDAD AUMENTADA A 14 POR EL DISEÑO COMPACTO
                    const examsForThisOrderPage = annexExams.slice(0, 14); 
                    annexExams = annexExams.slice(14);

                    let fechaStr = format(new Date(), 'dd/MM/yyyy');
                    try { const fc = quote.fechaCreacion as any; if (fc?.seconds) fechaStr = format(new Date(fc.seconds * 1000), 'dd/MM/yyyy'); } catch (e) {}

                    root.render(<OrdenDeExamen solicitud={{...sol, examenes: examsForThisOrderPage}} empresa={quote.empresaData || {}} fechaCotizacion={fechaStr} />);
                    await new Promise(r => setTimeout(r, 1000));
                    const canvas = await html2canvas(container, { scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff' });
                    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfWidth, (canvas.height * pdfWidth) / canvas.width, undefined, 'FAST');
                }
            }
        }
        return pdf.output('blob');
    } finally { 
        root.unmount(); 
        if (document.body.contains(container)) document.body.removeChild(container); 
    }
  }
}

"use client";

import React from 'react';
import ReactDOM from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Image from 'next/image';
import type { Cotizacion, Empresa, SolicitudTrabajador } from '@/lib/types';
import { DetalleCotizacion } from './DetalleCotizacion';

export const OrdenDeExamen = ({ solicitud, empresa }: { solicitud: SolicitudTrabajador, empresa: Empresa }) => (
    <div className="order-page-container bg-white text-black p-8 print-container">
        <div className="max-w-4xl mx-auto text-sm space-y-4 font-sans">
            <header className="flex justify-between items-center mb-10">
                 <div className="bg-[#3b82f6] text-white py-2 px-4 rounded-md">
                    <h2 className="font-semibold text-base tracking-wide">Orden de Examen Ocupacionales</h2>
                </div>
                 <Image
                    src="/logo.png"
                    alt="Araval Logo"
                    width={150}
                    height={40}
                    priority
                    unoptimized
                />
            </header>

            <main className="space-y-8">
                <section className="grid grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-bold text-base mb-1">Empresa</h3>
                        <p>{empresa.razonSocial}</p>
                        <p>RUT: {empresa.rut}</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-base mb-1">Trabajador</h3>
                        <p>{solicitud.trabajador.nombre}</p>
                        <p>RUT: {solicitud.trabajador.rut}</p>
                    </div>
                </section>
                
                <section>
                    <h3 className="font-bold text-base">Exámenes a Realizar</h3>
                    <hr className="my-2 border-gray-400"/>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        {solicitud.examenes.map(exam => (
                            <li key={exam.id}>
                                {exam.nombre}
                            </li>
                        ))}
                    </ul>
                </section>

                <section className='pt-4'>
                    <h3 className="font-bold text-base text-center">Información para el Paciente</h3>
                     <hr className="my-2 border-gray-400"/>
                </section>
                
                <section className='pt-4'>
                    <h3 className="font-bold text-base">Centro Medico Araval</h3>
                    <div className='text-gray-700 space-y-0.5 mt-1'>
                        <p>Juan Martinez 235, Taltal Chile</p>
                        <p>+56 9 7541 1515</p>
                        <p>Lunes a Viernes: 08:00 - 12:00 / 15:00 - 20:00</p>
                    </div>
                    <hr className="my-3 border-gray-400"/>
                </section>
            </main>
            
            <footer className="text-center text-gray-500 text-xs pt-24">
                 <p>Centro médico, Laboratorio Clínico, Salud Ocupacional y Toma de muestras - Araval Taltal.</p>
            </footer>
        </div>
    </div>
);


export class GeneradorPDF {
  static async generar(quote: Cotizacion, includeAnnexes = true): Promise<Blob> {
    
    // Crear un contenedor temporal que no será visible en el DOM principal
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '8.5in'; // Ancho de página carta
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);

    // Envolver todo en un Fragmento para el renderizado
    const contentToRender = (
        <React.Fragment>
            <div id="printable-quote-temp">
                <DetalleCotizacion quote={quote} />
            </div>
            {includeAnnexes && quote.solicitudes.map((solicitud, index) => (
                <OrdenDeExamen 
                    key={solicitud.id || index} 
                    solicitud={solicitud} 
                    empresa={quote.empresa}
                />
            ))}
        </React.Fragment>
    );

    // Renderizar los componentes en el contenedor temporal
    await new Promise<void>(resolve => root.render(contentToRender, () => resolve()));
    
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'letter',
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    
    try {
      const mainElement = container.querySelector<HTMLElement>('#printable-quote-temp');
      if (!mainElement) throw new Error("Elemento principal de la cotización no encontrado para generar PDF");

      const mainCanvas = await html2canvas(mainElement, { scale: 2, useCORS: true });
      const mainImgData = mainCanvas.toDataURL('image/png');
      const mainRatio = mainCanvas.height / mainCanvas.width;
      let mainImgHeight = pdfWidth * mainRatio;
      
      pdf.addImage(mainImgData, 'PNG', 0, 0, pdfWidth, mainImgHeight);
      
      if(includeAnnexes) {
          const annexElements = container.querySelectorAll<HTMLElement>('.order-page-container');
          for (let i = 0; i < annexElements.length; i++) {
            const annexElement = annexElements[i];
            
            const annexCanvas = await html2canvas(annexElement, { scale: 2, useCORS: true });
            const annexImgData = annexCanvas.toDataURL('image/png');
            const annexRatio = annexCanvas.height / annexCanvas.width;
            const annexImgHeight = pdfWidth * annexRatio;

            pdf.addPage();
            pdf.addImage(annexImgData, 'PNG', 0, 0, pdfWidth, annexImgHeight);
          }
      }
    } catch (error) {
      console.error("Error durante generación de PDF:", error);
      throw error;
    } finally {
        // Limpiar el contenedor temporal
        root.unmount();
        document.body.removeChild(container);
    }
    
    return pdf.output('blob');
  }
}

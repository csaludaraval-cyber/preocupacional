"use client";

import React from 'react';
import type { Cotizacion } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  quote: Cotizacion;
  solicitudesSlice?: any[]; 
  isLastPage?: boolean;     
  showNextPageLabel?: boolean; 
}

export function DetalleCotizacion({ quote, solicitudesSlice, isLastPage = true, showNextPageLabel = false }: Props) {
  const formatDate = (date: any) => {
    if (!date) return 'S/F';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return format(d, "dd 'de' MMMM, yyyy", { locale: es });
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

  const dataToShow = solicitudesSlice || quote.solicitudesData;

  return (
    <div className="bg-white w-[800px] mx-auto font-sans overflow-hidden antialiased">
      {/* HEADER CORPORATIVO */}
      <div className="bg-[#0a0a4d] text-white p-8 flex justify-between items-center border-b-4 border-[#1a1a1a]">
        <div className="space-y-1 text-left">
          <h1 className="text-xl font-black uppercase tracking-tighter italic text-white/90 leading-none">Cotización de Servicios</h1>
          <div className="flex items-center gap-3 text-white/50 text-[9px] font-bold uppercase tracking-widest">
            <span>ID: #{quote.id?.slice(-6).toUpperCase()}</span>
            <span className="opacity-20">|</span>
            <span>Emisión: {formatDate(quote.fechaCreacion)}</span>
          </div>
        </div>
        <img src="/images/logo2.png" alt="Araval" className="h-8 w-auto object-contain" />
      </div>

      <div className="p-10 space-y-6 text-left">
        {/* BLOQUES DE DATOS */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-sm relative">
            <span className="absolute -top-2 left-4 bg-white px-2 text-[7px] font-black text-slate-400 uppercase tracking-widest">Datos de Empresa</span>
            <div className="space-y-0.5 mt-1">
              <p className="font-black text-slate-900 text-[11px] uppercase leading-tight">{quote.empresaData?.razonSocial}</p>
              <p className="text-[9px] text-slate-500 font-bold">RUT: {quote.empresaData?.rut}</p>
              <p className="text-[9px] text-slate-400 uppercase">{quote.empresaData?.direccion} · {quote.empresaData?.comuna}</p>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-sm relative">
            <span className="absolute -top-2 left-4 bg-white px-2 text-[7px] font-black text-slate-400 uppercase tracking-widest">Contacto Autorizado</span>
            <div className="space-y-0.5 mt-1">
              <p className="font-black text-slate-900 text-[11px] uppercase leading-tight">{quote.solicitanteData?.nombre || 'N/A'}</p>
              <p className="text-[9px] text-slate-500 font-medium uppercase">Email: {quote.solicitanteData?.mail || 'S/C'}</p>
            </div>
          </div>
        </div>

        {/* TABLA DE PRESTACIONES */}
        <div className="border border-slate-200 rounded-sm overflow-hidden shadow-sm">
          <table className="w-full text-xs table-fixed border-collapse">
            <thead>
              <tr className="bg-[#1a1a1a] text-white uppercase text-[8px] font-black tracking-[0.2em] text-left">
                <th className="py-2 px-5 w-[78%]">Descripción de Servicio</th>
                <th className="py-2 px-5 text-right w-[22%]">Valor Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dataToShow?.map((sol: any, sIdx: number) => (
                <React.Fragment key={sIdx}>
                  <tr className="bg-slate-100/60">
                    <td colSpan={2} className="py-1 px-5 border-y border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-800 font-black text-[8px] uppercase tracking-tighter">
                          Paciente: <span className="text-[#0a0a4d]">{sol.trabajador.nombre}</span> ({sol.trabajador.rut}) 
                          {sol.isContinuation && <span className="ml-2 text-slate-400 italic">(CONTINUACIÓN)</span>}
                        </span>
                        {!sol.isContinuation && (
                          <span className="text-slate-400 font-bold text-[7.5px] uppercase tracking-tighter">
                            Atención: {sol.trabajador.fechaAtencion ? format(parseISO(sol.trabajador.fechaAtencion), 'dd/MM/yyyy') : 'S/F'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {sol.examenes.map((ex: any, eIdx: number) => (
                    <tr key={eIdx}>
                      <td className="py-1.5 px-5 text-left">
                        <div className="flex flex-col">
                            <p className="font-bold text-slate-700 uppercase text-[9px] leading-tight tracking-tighter">• {ex.nombre}</p>
                            {ex.descripcion && <p className="text-[7.5px] text-slate-400 italic ml-4 leading-none uppercase mt-0.5 tracking-tighter">· {ex.descripcion}</p>}
                        </div>
                      </td>
                      <td className="py-1.5 px-5 text-right font-black text-slate-900 text-[9px] align-top tracking-tighter">{formatCurrency(ex.valor)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* PIE DE PÁGINA */}
        <div className="pt-4 flex justify-end">
          {isLastPage ? (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-10 border-t-2 border-slate-900 pt-2 w-64 justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Neto Exento</span>
                <span className="text-base font-black text-slate-900 tracking-tighter">{formatCurrency(quote.total)}</span>
              </div>
              <p className="text-[7px] text-slate-400 uppercase font-bold mt-1">Documento electrónico Araval B2B</p>
            </div>
          ) : (
            showNextPageLabel && <p className="text-[9px] text-slate-400 italic uppercase tracking-widest border-t border-slate-100 pt-2">Continúa en página siguiente...</p>
          )}
        </div>
        <div className="pt-6 text-center opacity-40">
          <p className="text-[8px] text-slate-900 font-black uppercase tracking-widest italic">Araval Salud · Taltal · Chile</p>
        </div>
      </div>
    </div>
  );
}
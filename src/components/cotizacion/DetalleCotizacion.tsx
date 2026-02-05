"use client";

import React from 'react';
import type { Cotizacion } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock } from 'lucide-react';

interface Props {
  quote: Cotizacion;
}

export function DetalleCotizacion({ quote }: Props) {
  const formatDate = (date: any) => {
    if (!date) return 'S/F';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return format(d, "dd 'de' MMMM, yyyy", { locale: es });
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

  return (
    <div className="bg-white w-[800px] mx-auto font-sans shadow-lg print:shadow-none print:border-none">
      
      {/* HEADER CORPORATIVO */}
      <div className="bg-[#0a0a4d] text-white p-10 flex justify-between items-center border-b-4 border-[#1a1a1a]">
        <div className="space-y-1 text-left">
          <h1 className="text-xl font-black uppercase tracking-tight italic text-white/90">Cotización de Servicios</h1>
          <div className="flex items-center gap-3 text-white/50 text-[9px] font-bold uppercase tracking-[0.2em]">
            <span>ID: #{quote.id?.slice(-6).toUpperCase()}</span>
            <span className="opacity-20">|</span>
            <span>Emisión: {formatDate(quote.fechaCreacion)}</span>
          </div>
        </div>
        <img src="/images/logo2.png" alt="Araval" className="h-10 w-auto object-contain" />
      </div>

      <div className="p-12 space-y-10">
        
        {/* BLOQUES DE DATOS (GRIS OSCURECIDO PARA IMPRESIÓN) */}
        <div className="grid grid-cols-2 gap-8 text-left">
          <div className="bg-slate-100 border border-slate-300 p-6 rounded-sm relative">
            <span className="absolute -top-2.5 left-4 bg-white px-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Datos de Empresa</span>
            <div className="space-y-1 mt-2">
              <p className="font-black text-slate-900 text-sm uppercase leading-tight">{quote.empresaData?.razonSocial}</p>
              <p className="text-xs text-slate-600 font-bold tracking-tight">RUT: {quote.empresaData?.rut}</p>
              <div className="text-[11px] text-slate-600 leading-relaxed mt-3 uppercase font-medium">
                <p>{quote.empresaData?.direccion}</p>
                <p>{quote.empresaData?.comuna}, {quote.empresaData?.ciudad}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 border border-slate-300 p-6 rounded-sm relative">
            <span className="absolute -top-2.5 left-4 bg-white px-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Contacto Autorizado</span>
            <div className="space-y-1 mt-2">
              <p className="font-black text-slate-900 text-sm uppercase leading-tight">{quote.solicitanteData?.nombre || 'N/A'}</p>
              <div className="pt-4 space-y-1 text-[11px]">
                <p className="flex items-center gap-2"><span className="font-bold text-slate-500 uppercase text-[9px] w-12">Email:</span> <span className="text-slate-700 uppercase font-medium">{quote.solicitanteData?.mail || 'S/C'}</span></p>
                <p className="flex items-center gap-2 mt-1"><span className="font-bold text-slate-500 uppercase text-[9px] w-12">Cargo:</span> <span className="text-slate-700 uppercase font-medium">{quote.solicitanteData?.cargo || 'N/A'}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* PRESTACIONES */}
        <div className="space-y-6">
          {quote.solicitudesData?.map((sol: any, idx: number) => (
            <div key={idx} className="space-y-4 text-left">
              <div className="flex justify-between items-center bg-slate-100 px-4 py-2 border border-slate-200">
                <span className="text-slate-600 font-black text-[10px] uppercase tracking-wider">Paciente: <span className="text-slate-900">{sol.trabajador.nombre} ({sol.trabajador.rut})</span></span>
                <span className="text-slate-500 font-bold text-[9px] uppercase flex items-center gap-2 tracking-widest">
                  <Clock className="h-3 w-3" /> Atención: {sol.trabajador.fechaAtencion ? format(parseISO(sol.trabajador.fechaAtencion), 'dd/MM/yyyy') : 'S/F'}
                </span>
              </div>

              <table className="w-full text-xs border border-slate-200">
                <thead>
                  <tr className="bg-[#1a1a1a] text-white uppercase text-[9px] font-black tracking-[0.2em] text-left">
                    <th className="py-3 px-6">Descripción de Servicio</th>
                    <th className="py-3 px-6 text-right w-32">Valor Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sol.examenes.map((ex: any, eIdx: number) => (
                    <tr key={eIdx}>
                      <td className="py-5 px-6">
                        <div className="flex flex-col gap-1">
                            <p className="font-bold text-slate-800 uppercase text-[11px] tracking-tight">• {ex.nombre}</p>
                            {ex.descripcion && <p className="text-[10px] text-slate-500 italic ml-5 leading-normal uppercase">{ex.descripcion}</p>}
                        </div>
                      </td>
                      <td className="py-5 px-6 text-right font-black text-slate-900 text-xs">{formatCurrency(ex.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="pt-10 flex justify-end border-t-4 border-slate-900">
          <div className="flex items-center gap-8">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Total Neto Exento</span>
            <span className="text-xl font-black text-slate-900">{formatCurrency(quote.total)}</span>
          </div>
        </div>

        <div className="pt-20 text-center opacity-80">
          <p className="text-[10px] text-slate-900 font-black uppercase tracking-widest italic">Araval Fisioterapia y Medicina Spa</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Juan Martínez Nº 235, Taltal • Región de Antofagasta • www.aravalcsalud.cl</p>
        </div>
      </div>
    </div>
  );
}

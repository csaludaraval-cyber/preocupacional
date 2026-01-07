"use client";

import React from 'react';
import type { Cotizacion } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  quote: Cotizacion;
}

export function DetalleCotizacion({ quote }: Props) {
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return format(d, "dd/MM/yyyy", { locale: es });
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

  return (
    <div className="bg-white w-full max-w-4xl mx-auto print:border-none">
      {/* HEADER FORMAL */}
      <div className="bg-[#000080] text-white p-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wide">Cotización de Servicios</h1>
          <p className="text-blue-100 text-xs mt-1">ID: {quote.id?.slice(-6).toUpperCase()} | Fecha: {formatDate(quote.fechaCreacion)}</p>
        </div>
        <img src="/images/logo2.png" alt="Araval" className="h-12 w-auto" />
      </div>

      <div className="p-10 space-y-10 border-x border-b print:border-none">
        <div className="grid grid-cols-2 gap-12 text-sm">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Empresa Cliente</p>
            <div className="text-slate-800 space-y-0.5">
              <p className="font-bold text-sm uppercase">{quote.empresaData?.razonSocial}</p>
              <p>RUT: {quote.empresaData?.rut}</p>
              <p>Giro: {quote.empresaData?.giro}</p>
              <p>Dirección: {quote.empresaData?.direccion}</p>
              <p>{quote.empresaData?.comuna}, {quote.empresaData?.ciudad}</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Contacto Solicitante</p>
            <div className="text-slate-800 space-y-0.5">
              <p className="font-bold">{quote.solicitanteData?.nombre}</p>
              <p>Email: {quote.solicitanteData?.mail}</p>
              <p>Cargo: {quote.solicitanteData?.cargo}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Detalle de Prestaciones</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-900 text-slate-900 font-bold uppercase">
                <th className="py-2 text-left">Descripción Servicio / Trabajador</th>
                <th className="py-2 text-right">Monto Exento</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quote.solicitudesData?.map((sol: any, idx: number) => (
                <React.Fragment key={idx}>
                  <tr className="bg-slate-50/50">
                    <td colSpan={2} className="py-2 px-2 font-bold text-slate-700 uppercase">Trabajador: {sol.trabajador.nombre} ({sol.trabajador.rut})</td>
                  </tr>
                  {sol.examenes.map((ex: any, eIdx: number) => (
                    <tr key={eIdx}>
                      <td className="py-2 px-6 text-slate-500 italic">{ex.nombre}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(ex.valor)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="py-6 text-right font-bold text-slate-400 uppercase">Total Neto Exento</td>
                <td className="py-6 text-right text-xl font-bold text-slate-900">{formatCurrency(quote.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="pt-8 border-t">
          <p className="text-[9px] text-slate-400 uppercase text-center font-bold tracking-widest">
            Araval Fisioterapia y Medicina Spa • Juan Martínez Nº 235, Taltal • www.aravalcsalud.cl
          </p>
        </div>
      </div>
    </div>
  );
}
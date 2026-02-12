"use client";

import { type Dispatch, type SetStateAction, useState, useCallback, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Building, User, Loader2, Contact, CalendarDays, MapPin, Briefcase } from 'lucide-react';
import { firestore } from '@/lib/firebase';
import type { Empresa, Trabajador, Solicitante } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '../ui/date-picker';
import { formatRut, cleanRut } from '@/lib/utils';
import { parseISO, differenceInYears } from 'date-fns';

interface Props {
  empresa: Empresa;
  setEmpresa: Dispatch<SetStateAction<Empresa>>;
  trabajador: Trabajador;
  setTrabajador: Dispatch<SetStateAction<Trabajador>>;
  solicitante: Solicitante;
  setSolicitante: Dispatch<SetStateAction<Solicitante>>;
}

export default function Paso1DatosGenerales({ empresa, setEmpresa, trabajador, setTrabajador, solicitante, setSolicitante }: Props) {
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleRutBlur = useCallback(async () => {
    if (!empresa.rut) return;
    const cleaned = cleanRut(empresa.rut);
    setIsSearching(true);
    try {
      const docSnap = await getDoc(doc(firestore, 'empresas', cleaned));
      if (docSnap.exists()) {
        const data = docSnap.data() as Empresa;
        setEmpresa({ ...data, rut: formatRut(data.rut) });
        if(data.email && !solicitante.mail) setSolicitante(prev => ({...prev, mail: data.email}));
        toast({ title: 'Empresa Encontrada' });
      }
    } catch (e) { toast({ variant: "destructive", title: 'Error de red' }); }
    finally { setIsSearching(false); }
  }, [empresa.rut, setEmpresa, setSolicitante, solicitante.mail, toast]);

  // CÁLCULO DE EDAD EN TIEMPO REAL
  const edadCalculada = useMemo(() => {
    if (!trabajador.fechaNacimiento) return null;
    try {
        const birth = parseISO(trabajador.fechaNacimiento);
        if (isNaN(birth.getTime())) return null;
        return differenceInYears(new Date(), birth);
    } catch (e) { return null; }
  }, [trabajador.fechaNacimiento]);

  const birthDate = useMemo(() => {
    if (!trabajador.fechaNacimiento) return undefined;
    const d = parseISO(trabajador.fechaNacimiento);
    return isNaN(d.getTime()) ? undefined : d;
  }, [trabajador.fechaNacimiento]);

  const atencionDate = useMemo(() => {
    if (!trabajador.fechaAtencion) return undefined;
    const d = parseISO(trabajador.fechaAtencion);
    return isNaN(d.getTime()) ? undefined : d;
  }, [trabajador.fechaAtencion]);

  return (
    <div className="space-y-6">
      {/* 1. DATOS EMPRESA COMPLETO */}
      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardHeader className="flex flex-row items-center gap-4 text-left">
          <Building className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-sm font-black uppercase tracking-tight">Datos de la Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
            <div className="relative space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">RUT Empresa *</Label>
              <Input value={empresa.rut} onChange={(e) => setEmpresa({...empresa, rut: formatRut(e.target.value)})} onBlur={handleRutBlur} placeholder="76.xxx.xxx-x" className="bg-white h-10 text-xs font-bold uppercase" />
              {isSearching && <Loader2 className="absolute right-3 top-9 h-4 w-4 animate-spin text-blue-600" />}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Razón Social *</Label>
              <Input value={empresa.razonSocial} onChange={e => setEmpresa({...empresa, razonSocial: e.target.value.toUpperCase()})} className="bg-white h-10 text-xs font-bold" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Giro *</Label>
              <Input value={empresa.giro} onChange={e => setEmpresa({...empresa, giro: e.target.value.toUpperCase()})} className="bg-white h-10 text-xs font-bold" />
            </div>
             <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Email *</Label>
              <Input type="email" value={empresa.email} onChange={e => setEmpresa({...empresa, email: e.target.value.toLowerCase()})} className="bg-white h-10 text-xs font-bold" />
            </div>
          </div>
          <div className="space-y-2 text-left">
            <Label className="text-[10px] font-bold uppercase text-slate-400">Dirección Fiscal *</Label>
            <Input value={empresa.direccion} onChange={e => setEmpresa({...empresa, direccion: e.target.value.toUpperCase()})} className="bg-white h-10 text-xs font-bold" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-left">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Ciudad *</Label>
                <Input value={empresa.ciudad} onChange={e => setEmpresa({...empresa, ciudad: e.target.value.toUpperCase()})} className="bg-white h-10 text-xs font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Comuna *</Label>
                <Input value={empresa.comuna} onChange={e => setEmpresa({...empresa, comuna: e.target.value.toUpperCase()})} className="bg-white h-10 text-xs font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Región *</Label>
                <Input value={empresa.region} onChange={e => setEmpresa({...empresa, region: e.target.value.toUpperCase()})} className="bg-white h-10 text-xs font-bold" />
              </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. DATOS SOLICITANTE */}
      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardHeader className="flex flex-row items-center gap-4 text-left">
          <Contact className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-sm font-black uppercase tracking-tight">Datos del Solicitante *</CardTitle>
        </CardHeader>
         <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Nombre Contacto *</Label>
                    <Input value={solicitante.nombre} onChange={e => setSolicitante({...solicitante, nombre: e.target.value.toUpperCase()})} className="bg-white h-10 text-xs font-bold" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Email Cotización *</Label>
                    <Input type="email" value={solicitante.mail} onChange={e => setSolicitante({...solicitante, mail: e.target.value.toLowerCase()})} className="bg-white h-10 text-xs font-bold" />
                </div>
            </div>
         </CardContent>
      </Card>

      {/* 3. DATOS TRABAJADOR COMPLETO */}
      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardHeader className="flex flex-row items-center gap-4 text-left">
          <User className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-sm font-black uppercase tracking-tight">Datos del Trabajador *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-left">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Nombre Completo *</Label>
              <Input value={trabajador.nombre} onChange={e => setTrabajador({...trabajador, nombre: e.target.value.toUpperCase()})} className="bg-white h-10 text-xs font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">RUT Trabajador *</Label>
              <Input value={trabajador.rut} onChange={e => setTrabajador({...trabajador, rut: formatRut(e.target.value)})} className="bg-white h-10 text-xs font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-2"><Briefcase className="w-3 h-3"/> Cargo / Función *</Label>
              <Input value={trabajador.cargo} onChange={e => setTrabajador({...trabajador, cargo: e.target.value.toUpperCase()})} className="bg-white h-10 text-xs font-bold" />
            </div>
            <div className="space-y-2 relative">
                <Label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-2">
                    <CalendarDays className="w-3 h-3 text-blue-500" /> Fecha Nacimiento *
                </Label>
                <DatePicker 
                    value={birthDate}
                    onSelect={(date) => setTrabajador({ ...trabajador, fechaNacimiento: date ? date.toISOString() : '' })}
                />
                {edadCalculada !== null && (
                    <div className="absolute right-3 bottom-2 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-full shadow-lg">
                        {edadCalculada} AÑOS
                    </div>
                )}
            </div>
            <div className="col-span-full">
                <Label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-2 mb-2"><CalendarDays className="w-3 h-3 text-blue-500" /> Fecha Atención Solicitada *</Label>
                <DatePicker 
                    value={atencionDate}
                    onSelect={(date) => setTrabajador({ ...trabajador, fechaAtencion: date ? date.toISOString() : '' })}
                />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
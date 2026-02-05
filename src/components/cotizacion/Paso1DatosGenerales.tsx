"use client";

import { type Dispatch, type SetStateAction, useState, useCallback, ChangeEvent, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Building, User, Loader2, Contact, CalendarDays } from 'lucide-react';
import { firestore } from '@/lib/firebase';
import type { Empresa, Trabajador, Solicitante } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '../ui/date-picker';
import { formatRut, cleanRut } from '@/lib/utils';
import { parseISO } from 'date-fns';

interface Props {
  empresa: Empresa;
  setEmpresa: Dispatch<SetStateAction<Empresa>>;
  trabajador: Trabajador;
  setTrabajador: Dispatch<SetStateAction<Trabajador>>;
  solicitante?: Omit<Trabajador, 'fechaNacimiento' | 'fechaAtencion'> & { mail: string, centroDeCostos: string };
  setSolicitante?: Dispatch<SetStateAction<Omit<Trabajador, 'fechaNacimiento' | 'fechaAtencion'> & { mail: string, centroDeCostos: string }>>;
}

export default function Paso1DatosGenerales({ empresa, setEmpresa, trabajador, setTrabajador, solicitante, setSolicitante }: Props) {
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleRutBlur = useCallback(async () => {
    if (!empresa.rut) return;
    const cleanedRut = cleanRut(empresa.rut);
    if (!cleanedRut) return;
    setIsSearching(true);
    try {
      const docSnap = await getDoc(doc(firestore, 'empresas', cleanedRut));
      if (docSnap.exists()) {
        const data = docSnap.data() as Empresa;
        setEmpresa({ ...data, rut: formatRut(data.rut) });
        if(data.email && setSolicitante && solicitante && !solicitante.mail) {
          setSolicitante(prev => ({...prev, mail: data.email}));
        }
        toast({ title: 'Empresa Encontrada' });
      }
    } catch (error) {
      toast({ variant: "destructive", title: 'Error de búsqueda' });
    } finally {
      setIsSearching(false);
    }
  }, [empresa.rut, setEmpresa, setSolicitante, solicitante, toast]);

  // CONVERSIÓN SEGURA PARA DATEPICKERS
  const birthDate = useMemo(() => {
    if (!trabajador.fechaNacimiento || typeof trabajador.fechaNacimiento !== 'string') return undefined;
    const d = parseISO(trabajador.fechaNacimiento);
    return isNaN(d.getTime()) ? undefined : d;
  }, [trabajador.fechaNacimiento]);

  const atencionDate = useMemo(() => {
    if (!trabajador.fechaAtencion || typeof trabajador.fechaAtencion !== 'string') return undefined;
    const d = parseISO(trabajador.fechaAtencion);
    return isNaN(d.getTime()) ? undefined : d;
  }, [trabajador.fechaAtencion]);

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardHeader className="flex flex-row items-center gap-4">
          <Building className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-sm font-black uppercase tracking-tight">Datos de la Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative space-y-2 text-left">
              <Label className="text-[10px] font-bold uppercase text-slate-400">RUT Empresa</Label>
              <Input value={empresa.rut} onChange={(e) => setEmpresa({...empresa, rut: formatRut(e.target.value)})} onBlur={handleRutBlur} placeholder="76.xxx.xxx-x" className="bg-white" />
              {isSearching && <Loader2 className="absolute right-3 top-9 h-4 w-4 animate-spin text-blue-600" />}
            </div>
            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Razón Social</Label>
              <Input value={empresa.razonSocial} onChange={e => setEmpresa({...empresa, razonSocial: e.target.value})} className="bg-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {setSolicitante && solicitante && (
        <Card className="border-none shadow-sm bg-slate-50/50">
          <CardHeader className="flex flex-row items-center gap-4 text-left">
            <Contact className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-sm font-black uppercase tracking-tight">Datos del Solicitante</CardTitle>
          </CardHeader>
           <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400">Nombre Completo</Label>
                      <Input value={solicitante.nombre} onChange={e => setSolicitante({...solicitante, nombre: e.target.value})} className="bg-white border-blue-100" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400">Email de Contacto</Label>
                      <Input type="email" value={solicitante.mail} onChange={e => setSolicitante({...solicitante, mail: e.target.value})} className="bg-white border-blue-100" />
                  </div>
              </div>
           </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardHeader className="flex flex-row items-center gap-4 text-left">
          <User className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-sm font-black uppercase tracking-tight">Datos del Trabajador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Nombre del Trabajador</Label>
              <Input value={trabajador.nombre} onChange={e => setTrabajador({...trabajador, nombre: e.target.value})} className="bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">RUT</Label>
              <Input value={trabajador.rut} onChange={e => setTrabajador({...trabajador, rut: e.target.value})} className="bg-white" />
            </div>
            {/* SECCIÓN CALENDARIOS: ELIMINADO INPUT MANUAL */}
            <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-2"><CalendarDays className="w-3 h-3 text-blue-500" /> Fecha de Nacimiento</Label>
                <DatePicker 
                    value={birthDate}
                    onSelect={(date) => setTrabajador({ ...trabajador, fechaNacimiento: date ? date.toISOString() : '' })}
                />
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-2"><CalendarDays className="w-3 h-3 text-blue-500" /> Fecha de Atención</Label>
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
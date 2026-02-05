"use client";

import { type Dispatch, type SetStateAction, useState, useCallback, ChangeEvent, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Building, User, Loader2, Contact } from 'lucide-react';
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

  const handleRutChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formattedRut = formatRut(e.target.value);
    setEmpresa({ ...empresa, rut: formattedRut });
  };

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
      toast({ variant: "destructive", title: 'Error al buscar empresa' });
    } finally {
      setIsSearching(false);
    }
  }, [empresa.rut, setEmpresa, setSolicitante, solicitante, toast]);

  // MÁSCARA DE FECHA INTELIGENTE
  const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
    
    if (v.length === 1 && parseInt(v) > 3) v = "0" + v;
    if (v.length === 3 && parseInt(v[2]) > 1) v = v.slice(0, 2) + "0" + v[2];

    let final = "";
    if (v.length > 0) final += v.slice(0, 2);
    if (v.length > 2) final += "/" + v.slice(2, 4);
    if (v.length > 4) final += "/" + v.slice(4, 8);
    
    setTrabajador({ ...trabajador, fechaNacimiento: final });
  };
  
  const selectedDate = useMemo(() => {
    if (!trabajador.fechaAtencion || typeof trabajador.fechaAtencion !== 'string') return undefined;
    const date = parseISO(trabajador.fechaAtencion);
    return isNaN(date.getTime()) ? undefined : date;
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
            <div className="relative space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">RUT</Label>
              <Input id="rut-empresa" value={empresa.rut} onChange={handleRutChange} onBlur={handleRutBlur} placeholder="Ej: 76.123.456-7" className="bg-white" />
              {isSearching && <Loader2 className="absolute right-3 top-9 h-4 w-4 animate-spin text-blue-600" />}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Razón Social</Label>
              <Input id="razon-social" value={empresa.razonSocial} onChange={e => setEmpresa({...empresa, razonSocial: e.target.value})} className="bg-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Giro</Label>
              <Input id="giro" value={empresa.giro} onChange={e => setEmpresa({...empresa, giro: e.target.value})} className="bg-white" />
            </div>
             <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Email Empresa</Label>
              <Input id="email-empresa" type="email" value={empresa.email} onChange={e => setEmpresa({...empresa, email: e.target.value})} className="bg-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {setSolicitante && solicitante && (
        <Card className="border-none shadow-sm bg-slate-50/50">
          <CardHeader className="flex flex-row items-center gap-4">
            <Contact className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-sm font-black uppercase tracking-tight">Datos del Solicitante (Obligatorio)</CardTitle>
          </CardHeader>
           <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400">Nombre Contacto</Label>
                      <Input id="nombre-solicitante" value={solicitante.nombre} onChange={e => setSolicitante({...solicitante, nombre: e.target.value})} className="bg-white border-blue-100" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400">Email Contacto</Label>
                      <Input id="mail-solicitante" type="email" value={solicitante.mail} onChange={e => setSolicitante({...solicitante, mail: e.target.value})} className="bg-white border-blue-100" />
                  </div>
              </div>
           </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardHeader className="flex flex-row items-center gap-4">
          <User className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-sm font-black uppercase tracking-tight">Datos del Trabajador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Nombre Completo</Label>
              <Input id="nombre-trabajador" value={trabajador.nombre} onChange={e => setTrabajador({...trabajador, nombre: e.target.value})} className="bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">RUT</Label>
              <Input id="rut-trabajador" value={trabajador.rut} onChange={e => setTrabajador({...trabajador, rut: e.target.value})} className="bg-white" />
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Fecha de Nacimiento</Label>
                <Input 
                    id="fecha-nacimiento"
                    type="text"
                    placeholder="DD/MM/AAAA"
                    value={trabajador.fechaNacimiento}
                    onChange={handleFechaChange}
                    maxLength={10}
                    className="bg-white font-mono"
                />
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Fecha de Atención</Label>
                <DatePicker 
                    value={selectedDate}
                    onSelect={(date) => setTrabajador({ ...trabajador, fechaAtencion: date ? date.toISOString() : '' })}
                />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
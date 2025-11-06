
"use client";

import { type Dispatch, type SetStateAction, useState, useCallback, ChangeEvent } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Building, User, Loader2, Contact } from 'lucide-react';

import { firestore } from '@/lib/firebase';
import type { Empresa, Trabajador } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '../ui/date-picker';
import { formatRut, cleanRut } from '@/lib/utils';

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
      const empresaRef = doc(firestore, 'empresas', cleanedRut);
      const docSnap = await getDoc(empresaRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as Empresa;
        setEmpresa({
          ...data,
          rut: formatRut(data.rut), // Re-format for display
        });
        if(data.email && setSolicitante && solicitante && !solicitante.mail) {
          setSolicitante(prev => ({...prev, mail: data.email}));
        }
        toast({
          title: 'Empresa Encontrada',
          description: `Se cargaron los datos de ${data.razonSocial}.`,
        });
      }
    } catch (error) {
      console.error("Error fetching company data:", error);
      toast({
        variant: "destructive",
        title: 'Error al buscar empresa',
        description: 'No se pudieron obtener los datos de la empresa.',
      });
    } finally {
      setIsSearching(false);
    }
  }, [empresa.rut, setEmpresa, setSolicitante, solicitante, toast]);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Building className="h-6 w-6 text-primary" />
          <CardTitle className="font-headline text-xl">Datos de la Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="razon-social">Razón Social</Label>
              <Input id="razon-social" value={empresa.razonSocial} onChange={e => setEmpresa({...empresa, razonSocial: e.target.value})} />
            </div>
            <div className="relative space-y-2">
              <Label htmlFor="rut-empresa">RUT</Label>
              <Input 
                id="rut-empresa" 
                value={empresa.rut} 
                onChange={handleRutChange} 
                onBlur={handleRutBlur} 
              />
              {isSearching && <Loader2 className="absolute right-3 top-9 h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
            <div className="space-y-2">
              <Label htmlFor="giro">Giro</Label>
              <Input id="giro" value={empresa.giro} onChange={e => setEmpresa({...empresa, giro: e.target.value})} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="email-empresa">Email Empresa (para cotización)</Label>
              <Input id="email-empresa" type="email" value={empresa.email} onChange={e => setEmpresa({...empresa, email: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección de Facturación</Label>
            <Input id="direccion" value={empresa.direccion} onChange={e => setEmpresa({...empresa, direccion: e.target.value})} />
          </div>
           <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input id="ciudad" value={empresa.ciudad} onChange={e => setEmpresa({...empresa, ciudad: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comuna">Comuna</Label>
                <Input id="comuna" value={empresa.comuna} onChange={e => setEmpresa({...empresa, comuna: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Región</Label>
                <Input id="region" value={empresa.region} onChange={e => setEmpresa({...empresa, region: e.target.value})} />
              </div>
           </div>
        </CardContent>
      </Card>

      {setSolicitante && solicitante && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Contact className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline text-xl">Datos del Solicitante (Contacto)</CardTitle>
          </CardHeader>
           <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                      <Label htmlFor="nombre-solicitante">Nombre Contacto</Label>
                      <Input id="nombre-solicitante" value={solicitante.nombre} onChange={e => setSolicitante({...solicitante, nombre: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="mail-solicitante">Mail Contacto</Label>
                      <Input id="mail-solicitante" type="email" value={solicitante.mail} onChange={e => setSolicitante({...solicitante, mail: e.target.value})} />
                  </div>
              </div>
           </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <User className="h-6 w-6 text-primary" />
          <CardTitle className="font-headline text-xl">Datos del Trabajador a Evaluar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nombre-trabajador">Nombre</Label>
              <Input id="nombre-trabajador" value={trabajador.nombre} onChange={e => setTrabajador({...trabajador, nombre: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rut-trabajador">RUT</Label>
              <Input id="rut-trabajador" value={trabajador.rut} onChange={e => setTrabajador({...trabajador, rut: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input id="cargo" value={trabajador.cargo} onChange={e => setTrabajador({...trabajador, cargo: e.target.value})} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="fecha-nacimiento">Fecha de Nacimiento</Label>
                <Input 
                    id="fecha-nacimiento"
                    type="text"
                    placeholder="DD/MM/AAAA"
                    value={trabajador.fechaNacimiento}
                    onChange={(e) => setTrabajador({...trabajador, fechaNacimiento: e.target.value})}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="fecha-atencion">Fecha de Atención</Label>
                <DatePicker 
                    value={trabajador.fechaAtencion ? new Date(trabajador.fechaAtencion) : undefined}
                    onSelect={(date) => setTrabajador({...trabajador, fechaAtencion: date ? date.toISOString().split('T')[0] : ''})}
                    placeholder="Seleccione una fecha"
                />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

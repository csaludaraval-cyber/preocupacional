"use client";

import type { Dispatch, SetStateAction } from 'react';
import { Building, User } from 'lucide-react';
import type { Empresa, Trabajador } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  empresa: Empresa;
  setEmpresa: Dispatch<SetStateAction<Empresa>>;
  trabajador: Trabajador;
  setTrabajador: Dispatch<SetStateAction<Trabajador>>;
}

export default function Paso1DatosGenerales({ empresa, setEmpresa, trabajador, setTrabajador }: Props) {
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
            <div className="space-y-2">
              <Label htmlFor="rut-empresa">RUT</Label>
              <Input id="rut-empresa" value={empresa.rut} onChange={e => setEmpresa({...empresa, rut: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección de Facturación</Label>
            <Input id="direccion" value={empresa.direccion} onChange={e => setEmpresa({...empresa, direccion: e.target.value})} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <User className="h-6 w-6 text-primary" />
          <CardTitle className="font-headline text-xl">Datos del Solicitante / Trabajador</CardTitle>
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
              <Label htmlFor="centro-costos">Centro de Costos</Label>
              <Input id="centro-costos" value={trabajador.centroDeCostos} onChange={e => setTrabajador({...trabajador, centroDeCostos: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mail">Mail</Label>
            <Input id="mail" type="email" value={trabajador.mail} onChange={e => setTrabajador({...trabajador, mail: e.target.value})} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

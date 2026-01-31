"use client";

import React, { useState, useMemo } from 'react';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { Inbox, Loader2, Search, Shield, Trash2, ArrowRight, Star } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import type { Empresa, Solicitante } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

interface SolicitudPublica {
  id: string;
  empresa: Empresa;
  solicitante: Solicitante;
  solicitudes: any[];
  estado: string;
  fechaCreacion: any;
  isFrecuente?: boolean;
}

export function AdminSolicitudes() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<WithId<SolicitudPublica> | null>(null);

  const solicitudesQuery = useMemoFirebase(() => collection(firestore, 'solicitudes_publicas'), []);
  const { data: solicitudes, isLoading } = useCollection<SolicitudPublica>(solicitudesQuery);
  
  const getMs = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    return 0;
  };

  const filteredSolicitudes = useMemo(() => {
    if (!solicitudes) return [];
    const activeSolicitudes = solicitudes.filter(s => ['pendiente', 'orden_examen_enviada'].includes(s.estado || 'pendiente'));
    const sorted = [...activeSolicitudes].sort((a, b) => getMs(b.fechaCreacion) - getMs(a.fechaCreacion));
    if (!searchTerm) return sorted;
    const lower = searchTerm.toLowerCase().trim();
    return sorted.filter(req => req.empresa?.razonSocial?.toLowerCase().includes(lower) || req.id?.toLowerCase().includes(lower));
  }, [solicitudes, searchTerm]);

  if (authLoading || isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (user?.role !== 'admin') return <Alert variant="destructive"><Shield className="h-4 w-4" /><AlertTitle>Acceso Denegado</AlertTitle></Alert>;

  return (
    <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
      <CardHeader>
        {/* TÍTULO ESTANDARIZADO */}
        <CardTitle className="text-2xl font-bold flex items-center gap-3 text-slate-800 uppercase tracking-tight">
            <Inbox className="h-7 w-7 text-primary"/> Solicitudes Recibidas
        </CardTitle>
        <CardDescription>Buzón de entrada de nuevos exámenes para procesar.</CardDescription>
        <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input placeholder="Buscar por empresa o ID..." className="pl-10 h-12 bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
          <Table>
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Fecha</TableHead><TableHead>Empresa</TableHead><TableHead className="text-center">Pacientes</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
              <TableBody>
                  {filteredSolicitudes.map((req) => (
                      <TableRow key={req.id}>
                          <TableCell className="font-mono text-[10px] font-bold text-slate-400">#{req.id.slice(-6).toUpperCase()}</TableCell>
                          <TableCell className="text-sm">{req.fechaCreacion?.seconds ? new Date(req.fechaCreacion.seconds * 1000).toLocaleDateString('es-CL') : 'N/A'}</TableCell>
                          <TableCell>
                              <div className="flex flex-col gap-1">
                                  <span className="font-bold text-slate-700">{req.empresa?.razonSocial}</span>
                                  {(req.isFrecuente || req.estado === 'orden_examen_enviada') && <Badge className="w-fit bg-amber-100 text-amber-700 text-[9px]">FRECUENTE</Badge>}
                              </div>
                          </TableCell>
                          <TableCell className="text-center font-bold">{req.solicitudes?.length || 0}</TableCell>
                          <TableCell className="text-right space-x-2">
                              <Button asChild size="sm" className="font-bold">
                                <a href={`/?solicitud=${encodeURIComponent(JSON.stringify({originalRequestId: req.id, empresa: req.empresa, solicitudes: req.solicitudes}))}`}>PROCESAR</a>
                              </Button>
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
      </CardContent>
    </Card>
  );
}
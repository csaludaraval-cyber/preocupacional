"use client";

import React, { useState, useMemo } from 'react';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { Inbox, Loader2, Search, Shield, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
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

  const solicitudesQuery = useMemoFirebase(() => collection(firestore, 'solicitudes_publicas'), []);
  const { data: solicitudes, isLoading } = useCollection<SolicitudPublica>(solicitudesQuery);
  
  const filteredSolicitudes = useMemo(() => {
    if (!solicitudes) return [];
    const active = solicitudes.filter(s => s.estado === 'pendiente');
    if (!searchTerm) return active;
    const lower = searchTerm.toLowerCase();
    return active.filter(req => req.empresa?.razonSocial?.toLowerCase().includes(lower) || req.id?.toLowerCase().includes(lower));
  }, [solicitudes, searchTerm]);

  if (authLoading || isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;
  if (user?.role !== 'admin') return <Alert variant="destructive" className="max-w-2xl mx-auto mt-10"><Shield className="h-4 w-4" /><AlertTitle>Acceso Denegado</AlertTitle></Alert>;

  return (
    <div className="container mx-auto p-4 max-w-7xl font-sans pb-20">
      <div className="flex justify-between items-end mb-10 text-left">
        <div className="space-y-1">
            <h1 className="text-2xl font-black uppercase text-slate-800 tracking-tighter">Buzón de Solicitudes</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Requerimientos públicos por procesar</p>
        </div>
        <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Buscar por empresa..." className="pl-10 h-10 bg-white border-slate-200 text-xs font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white border shadow-2xl rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900">
            <TableRow>
              <TableHead className="py-4 px-6 text-[10px] uppercase font-black text-white tracking-widest text-left">ID</TableHead>
              <TableHead className="text-[10px] uppercase font-black text-white tracking-widest text-left">Empresa Cliente</TableHead>
              <TableHead className="text-center text-[10px] uppercase font-black text-white tracking-widest">Pacientes</TableHead>
              <TableHead className="text-right px-6 text-[10px] uppercase font-black text-white tracking-widest">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSolicitudes.map((req) => (
              <TableRow key={req.id} className="text-xs hover:bg-slate-50 transition-colors border-slate-100">
                <TableCell className="font-mono font-black text-blue-600 px-6 italic">#{req.id.slice(-6).toUpperCase()}</TableCell>
                <TableCell className="text-left">
                  <div className="flex flex-col gap-1">
                      <span className="font-black text-slate-700 uppercase">{req.empresa?.razonSocial}</span>
                      <span className="text-[9px] text-slate-400 font-bold">{req.solicitante?.nombre} | {req.solicitante?.mail}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center font-black"><Badge variant="outline">{req.solicitudes?.length || 0}</Badge></TableCell>
                <TableCell className="text-right px-6">
                  <div className="flex justify-end items-center gap-2">
                    <Button asChild size="sm" className="bg-[#0a0a4d] hover:bg-slate-800 font-black text-[10px] px-6 h-9 uppercase tracking-widest">
                      {/* REGLA 1: ENVÍO DE SOLICITANTE INTEGRADO */}
                      <a href={`/admin/crear-cotizacion?solicitud=${encodeURIComponent(JSON.stringify({
                        originalRequestId: req.id, 
                        empresa: req.empresa, 
                        solicitante: req.solicitante, 
                        solicitudes: req.solicitudes
                      }))}`}>PROCESAR</a>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500" onClick={async () => { if(confirm("¿Eliminar?")) await deleteDoc(doc(firestore, 'solicitudes_publicas', req.id)); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
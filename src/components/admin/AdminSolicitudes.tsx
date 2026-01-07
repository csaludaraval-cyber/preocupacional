"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/navigation'; // Corregido: next/link suele dar problemas en algunos setups de app router, next/navigation es más seguro para redirecciones
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { Eye, Inbox, Loader2, Search, Shield, Trash2, XCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
// Importamos tipos base para construir la interfaz local
import type { Empresa, Solicitante } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
} from "@/components/ui/alert-dialog";
import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog';
import {
  TooltipProvider,
} from "@/components/ui/tooltip";

// DEFINICIÓN LOCAL PARA SOLUCIONAR ERROR ts(2305)
interface SolicitudPublica {
  id: string;
  empresa: Empresa;
  solicitante: Solicitante;
  solicitudes: any[]; // Lista de trabajadores y exámenes
  estado: string;
  fechaCreacion: any;
}

export function AdminSolicitudes() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<WithId<SolicitudPublica> | null>(null);

  const solicitudesQuery = useMemoFirebase(() => collection(firestore, 'solicitudes_publicas'), []);
  const { data: solicitudes, isLoading, error } = useCollection<SolicitudPublica>(solicitudesQuery);
  
  const getMs = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    if (ts instanceof Date) return ts.getTime();
    return 0;
  };

  const formatDate = (ts: any) => {
    const ms = getMs(ts);
    return ms === 0 ? 'N/A' : new Date(ms).toLocaleDateString('es-CL');
  };

  const filteredSolicitudes = useMemo(() => {
    if (!solicitudes) return [];
    
    const pendingOnly = solicitudes.filter(s => (s.estado || 'pendiente') === 'pendiente');
    const sorted = [...pendingOnly].sort((a, b) => getMs(b.fechaCreacion) - getMs(a.fechaCreacion));

    if (!searchTerm) return sorted;

    const lower = searchTerm.toLowerCase().trim();
    return sorted.filter(req => {
        const empresaMatch = req.empresa?.razonSocial?.toLowerCase().includes(lower);
        const solicitanteNombreMatch = req.solicitante?.nombre?.toLowerCase().includes(lower);
        const idMatch = req.id?.toLowerCase().includes(lower);
        // FIX PARA ERROR ts(7006): Tipado explícito de 's' como any
        const trabajadorMatch = req.solicitudes?.some((s: any) => s.trabajador?.nombre?.toLowerCase().includes(lower));

        return empresaMatch || solicitanteNombreMatch || idMatch || trabajadorMatch;
    });
  }, [solicitudes, searchTerm]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
        await deleteDoc(doc(firestore, 'solicitudes_publicas', itemToDelete.id));
        toast({ title: 'Solicitud Eliminada' });
    } catch (e) {
        toast({ variant: "destructive", title: "Error al eliminar" });
    } finally {
        setItemToDelete(null);
    }
  };
  
  const prepareQuoteForProcessing = (request: WithId<SolicitudPublica>): string => {
    const requestDataForQuote = {
      originalRequestId: request.id,
      empresa: request.empresa,
      solicitante: request.solicitante,
      solicitudes: request.solicitudes,
    };
    return encodeURIComponent(JSON.stringify(requestDataForQuote));
  };

  if (authLoading || isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  
  if (user?.role !== 'admin') {
    return (
        <Alert variant="destructive" className="max-w-2xl mx-auto mt-10">
            <Shield className="h-4 w-4" />
            <AlertTitle>Acceso Denegado</AlertTitle>
            <AlertDescription>No tienes permisos de administrador para ver las solicitudes.</AlertDescription>
        </Alert>
    );
  }

  return (
    <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-black text-2xl flex items-center gap-3 text-slate-800 uppercase tracking-tighter italic">
            <Inbox className="h-8 w-8 text-primary"/> Solicitudes <span className="text-primary">Recibidas</span>
        </CardTitle>
        <CardDescription>Buzón de entrada de nuevos exámenes para procesar.</CardDescription>
        <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
                placeholder="Buscar por empresa, trabajador o ID..."
                className="pl-10 h-12 bg-white shadow-sm border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Table>
              <TableHeader>
                  <TableRow className="bg-slate-50/50">
                      <TableHead className="font-bold">ID</TableHead>
                      <TableHead className="font-bold">Fecha</TableHead>
                      <TableHead className="font-bold">Empresa</TableHead>
                      <TableHead className="font-bold">Solicitante</TableHead>
                      <TableHead className="text-center font-bold">Dotación</TableHead>
                      <TableHead className="text-center font-bold">Acción</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredSolicitudes.map((req) => (
                      <TableRow key={req.id} className="hover:bg-white transition-colors">
                          <TableCell className="font-mono text-[10px] font-bold text-slate-400">
                              #{req.id.slice(-6).toUpperCase()}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{formatDate(req.fechaCreacion)}</TableCell>
                          <TableCell className="font-bold text-slate-700">{req.empresa?.razonSocial}</TableCell>
                          <TableCell>
                              <div className="flex flex-col">
                                  <span className="text-sm font-semibold">{req.solicitante?.nombre}</span>
                                  <span className="text-[10px] text-slate-400 uppercase">{req.solicitante?.mail}</span>
                              </div>
                          </TableCell>
                          <TableCell className="text-center font-black text-primary">{req.solicitudes?.length || 0}</TableCell>
                          <TableCell className="text-center space-x-2">
                              <Button asChild variant="default" size="sm" className="bg-primary hover:bg-primary/90 font-bold">
                                <a href={`/?solicitud=${prepareQuoteForProcessing(req)}`}>
                                  PROCESAR <ArrowRight className="ml-2 h-4 w-4"/>
                                </a>
                              </Button>
                              
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-slate-300 hover:text-destructive transition-colors">
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="rounded-2xl">
                                      <AlertDialogHeader>
                                          <AlertDialogTitle className="font-black uppercase tracking-tighter">¿Eliminar esta solicitud?</AlertDialogTitle>
                                          <AlertDialogDescription>Esta acción no se puede deshacer y los datos se borrarán permanentemente.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel className="rounded-xl font-bold">CANCELAR</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => { setItemToDelete(req); handleDelete(); }} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold">
                                              ELIMINAR AHORA
                                          </AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
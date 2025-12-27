"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { Eye, Inbox, Loader2, Search, Shield, Trash2, XCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import type { SolicitudPublica } from '@/lib/types';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AdminSolicitudes() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<WithId<SolicitudPublica> | null>(null);

  const solicitudesQuery = useMemoFirebase(() => collection(firestore, 'solicitudes_publicas'), []);
  const { data: solicitudes, isLoading, error } = useCollection<SolicitudPublica>(solicitudesQuery);
  
  // --- UTILIDADES DE SEGURIDAD (Blindaje contra Error 500) ---
  const getMs = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    if (ts instanceof Date) return ts.getTime();
    const parsed = new Date(ts).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatDate = (ts: any) => {
    const ms = getMs(ts);
    if (ms === 0) return 'N/A';
    return new Date(ms).toLocaleDateString('es-CL');
  };

  const filteredSolicitudes = useMemo(() => {
    if (!solicitudes) return [];
    
    // Filtrar solo pendientes y ordenar de forma segura
    const pendingOnly = solicitudes.filter(s => (s.estado || 'pendiente') === 'pendiente');
    const sorted = [...pendingOnly].sort((a, b) => getMs(b.fechaCreacion) - getMs(a.fechaCreacion));

    if (!searchTerm) return sorted;

    const lower = searchTerm.toLowerCase();
    return sorted.filter(req => {
        const empresaMatch = req.empresa?.razonSocial?.toLowerCase().includes(lower);
        const solicitanteNombreMatch = req.solicitante?.nombre?.toLowerCase().includes(lower);
        const idMatch = req.id?.toLowerCase().includes(lower);
        const trabajadorMatch = req.solicitudes?.some(s => s.trabajador?.nombre?.toLowerCase().includes(lower));

        return empresaMatch || solicitanteNombreMatch || idMatch || trabajadorMatch;
    });
  }, [solicitudes, searchTerm]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
        await deleteDoc(doc(firestore, 'solicitudes_publicas', itemToDelete.id));
        toast({
            title: 'Solicitud Eliminada',
            description: `La solicitud ha sido eliminada correctamente.`,
        });
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Error al eliminar",
            description: "No se pudo completar la operación.",
        });
    } finally {
        setItemToDelete(null);
    }
  };
  
  const prepareQuoteForProcessing = (request: WithId<SolicitudPublica>): string => {
    if (!request.solicitudes || request.solicitudes.length === 0) return '';
    const requestDataForQuote = {
      originalRequestId: request.id,
      empresa: request.empresa,
      solicitante: request.solicitante,
      solicitudes: request.solicitudes,
    };
    return encodeURIComponent(JSON.stringify(requestDataForQuote));
  };

  // --- RENDERIZADO DE SEGURIDAD ---
  if (authLoading || isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (user?.role !== 'admin') {
    return (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
            <Shield className="h-4 w-4" />
            <AlertTitle>Acceso Denegado</AlertTitle>
            <AlertDescription>No tienes permisos de administrador.</AlertDescription>
        </Alert>
    );
  }

  if (error) {
      return (
          <Alert variant="destructive" className="max-w-2xl mx-auto">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error de Conexión</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
          </Alert>
      );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-3 text-foreground uppercase font-bold">
            <Inbox className="h-7 w-7"/> Solicitudes Recibidas
        </CardTitle>
        <CardDescription>Revise y procese solicitudes de exámenes. Las procesadas saldrán de esta lista.</CardDescription>
        <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Buscar por empresa, trabajador o ID..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <TooltipProvider>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>N° Solicitud</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Solicitante</TableHead>
                        <TableHead className="text-center">Trabajadores</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSolicitudes.length > 0 ? filteredSolicitudes.map((req) => (
                        <TableRow key={req.id} className="hover:bg-accent/50">
                            <TableCell className="font-mono text-xs font-bold">
                                <Badge variant="secondary">{req.id.slice(-6)}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(req.fechaCreacion)}</TableCell>
                            <TableCell className="font-medium">{req.empresa?.razonSocial || 'N/A'}</TableCell>
                            <TableCell className='text-sm'>
                                {req.solicitante?.nombre ? (
                                  <div className='flex flex-col'>
                                    <span className='font-medium'>{req.solicitante.nombre}</span>
                                    <span className='text-muted-foreground text-xs'>{req.solicitante.mail}</span>
                                  </div>
                                ) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-center">{req.solicitudes?.length || 0}</TableCell>
                            <TableCell><Badge variant="outline" className="capitalize">{req.estado || 'pendiente'}</Badge></TableCell>
                            <TableCell className="text-center space-x-2">
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/?solicitud=${prepareQuoteForProcessing(req)}`}>
                                    Procesar <ArrowRight className="ml-2 h-4 w-4"/>
                                  </Link>
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Eliminar solicitud?</AlertDialogTitle>
                                            <AlertDialogDescription>Esta acción es permanente.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => { setItemToDelete(req); handleDelete(); }} className="bg-destructive text-white hover:bg-destructive/90">
                                                Eliminar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No hay solicitudes pendientes.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
           </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}

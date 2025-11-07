
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Eye, Inbox, Loader2, Search, Shield, Trash2, XCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import type { SolicitudPublica, Cotizacion, Trabajador, Examen } from '@/lib/types';
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
} from "@/components/ui/tooltip"

export function AdminSolicitudes() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<WithId<SolicitudPublica> | null>(null);

  const solicitudesQuery = useMemoFirebase(() => collection(firestore, 'solicitudes_publicas'), []);

  const { data: solicitudes, isLoading, error } = useCollection<SolicitudPublica>(solicitudesQuery);
  
  const filteredSolicitudes = useMemo(() => {
    if (!solicitudes) return [];
    // Filter out processed requests and sort by most recent first
    const pendingOnly = solicitudes.filter(s => s.estado === 'pendiente');
    const sorted = [...pendingOnly].sort((a, b) => b.fechaCreacion.toMillis() - a.fechaCreacion.toMillis());

    if (!searchTerm) return sorted;

    const lowercasedFilter = searchTerm.toLowerCase();
    return sorted.filter(req => {
        const empresaMatch = req.empresa?.razonSocial?.toLowerCase().includes(lowercasedFilter);
        const solicitanteNombreMatch = req.solicitante?.nombre?.toLowerCase().includes(lowercasedFilter);
        const solicitanteMailMatch = req.solicitante?.mail?.toLowerCase().includes(lowercasedFilter);
        const trabajadorMatch = req.solicitudes?.some(s => s.trabajador?.nombre?.toLowerCase().includes(lowercasedFilter));
        const idMatch = req.id?.toLowerCase().includes(lowercasedFilter);

        return empresaMatch || solicitanteNombreMatch || solicitanteMailMatch || trabajadorMatch || idMatch;
    });
  }, [solicitudes, searchTerm]);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
        await deleteDoc(doc(firestore, 'solicitudes_publicas', itemToDelete.id));
        toast({
            title: 'Solicitud Eliminada',
            description: `La solicitud N° ${itemToDelete.id.slice(-6)} ha sido eliminada.`,
        });
    } catch (e) {
        console.error("Error deleting document: ", e);
        toast({
            variant: "destructive",
            title: "Error al eliminar",
            description: "No se pudo eliminar la solicitud.",
        });
    } finally {
        setItemToDelete(null);
    }
  };
  
  const formatDate = (timestamp: any) => {
      if (!timestamp) return 'N/A';
      return new Date(timestamp.seconds * 1000).toLocaleDateString('es-CL');
  }

  const prepareQuoteForProcessing = (request: WithId<SolicitudPublica>): string => {
    if (!request.solicitudes || request.solicitudes.length === 0) return '';
  
    // Pass the whole structure including the original request ID
    const requestDataForQuote = {
      originalRequestId: request.id,
      empresa: request.empresa,
      solicitante: request.solicitante,
      solicitudes: request.solicitudes,
    };
    return encodeURIComponent(JSON.stringify(requestDataForQuote));
  };


  if (authLoading || isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (user?.role !== 'admin') {
    return (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
            <Shield className="h-4 w-4" />
            <AlertTitle>Acceso Denegado</AlertTitle>
            <AlertDescription>
                No tienes permisos para acceder a esta sección.
            </AlertDescription>
        </Alert>
    );
  }

  if (error) {
      return (
          <Alert variant="destructive" className="max-w-2xl mx-auto">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error al Cargar Datos</AlertTitle>
              <AlertDescription>
                  No se pudieron cargar las solicitudes. {error.message}
              </AlertDescription>
          </Alert>
      )
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-3xl flex items-center gap-3">
            <Inbox className="h-8 w-8 text-primary"/>
            Solicitudes de Exámenes Recibidas
        </CardTitle>
        <CardDescription>
          Revise las solicitudes pendientes enviadas por clientes y procéselas para generar una cotización formal. Las solicitudes procesadas desaparecerán de esta lista.
        </CardDescription>
        <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Buscar por empresa, trabajador o N° de solicitud..."
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
                        <TableHead>Trabajadores</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSolicitudes.length > 0 ? filteredSolicitudes.map((req) => {
                      const quoteQuery = prepareQuoteForProcessing(req);
                      return(
                        <React.Fragment key={req.id}>
                          <TableRow className="hover:bg-accent/50">
                              <TableCell className="font-mono text-xs font-bold">
                                  <Badge variant="secondary">{req.id.slice(-6)}</Badge>
                              </TableCell>
                              <TableCell>{formatDate(req.fechaCreacion)}</TableCell>
                              <TableCell className="font-medium">{req.empresa?.razonSocial || 'N/A'}</TableCell>
                              <TableCell className='text-sm'>
                                {req.solicitante?.nombre ? (
                                  <div className='flex flex-col'>
                                    <span className='font-medium'>{req.solicitante.nombre}</span>
                                    <span className='text-muted-foreground'>{req.solicitante.mail}</span>
                                  </div>
                                ) : (
                                  <span className='text-muted-foreground italic'>N/A</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">{req.solicitudes?.length || 0}</TableCell>
                              <TableCell><Badge variant={req.estado === 'pendiente' ? 'default' : 'secondary'}>{req.estado}</Badge></TableCell>
                              <TableCell className="text-center space-x-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button asChild variant="outline" size="sm">
                                        <Link href={`/?solicitud=${quoteQuery}`}>
                                          Procesar Solicitud <ArrowRight className="ml-2 h-4 w-4"/>
                                        </Link>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Convertir la solicitud completa en una cotización</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                         <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                  <Button variant="ghost" size="icon" onClick={() => setItemToDelete(req)}>
                                                      <Trash2 className="h-4 w-4 text-destructive" />
                                                  </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                      <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                          Esta acción no se puede deshacer. Esto eliminará permanentemente la solicitud
                                                          <span className='font-bold'> N° {req.id.slice(-6)} </span>
                                                          de los servidores.
                                                      </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                      <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                                                      <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                                          Eliminar
                                                      </AlertDialogAction>
                                                  </AlertDialogFooter>
                                              </AlertDialogContent>
                                          </AlertDialog>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                          <p>Eliminar Solicitud Completa</p>
                                      </TooltipContent>
                                  </Tooltip>
                              </TableCell>
                          </TableRow>
                        </React.Fragment>
                      )
                    }) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                No se encontraron solicitudes pendientes.
                            </TableCell>
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

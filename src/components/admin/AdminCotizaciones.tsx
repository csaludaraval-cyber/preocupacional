
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { Eye, History, Loader2, Search, Shield, Trash2, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import type { CotizacionFirestore, Cotizacion } from '@/lib/types';
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

export function AdminCotizaciones() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [quoteToDelete, setQuoteToDelete] = useState<WithId<CotizacionFirestore> | null>(null);

  const cotizacionesQuery = useMemoFirebase(() => collection(firestore, 'cotizaciones'), []);

  const { data: cotizaciones, isLoading, error } = useCollection<CotizacionFirestore>(cotizacionesQuery);
  
  const filteredCotizaciones = useMemo(() => {
    if (!cotizaciones) return [];
    if (!searchTerm) return cotizaciones;

    const lowercasedFilter = searchTerm.toLowerCase();
    return cotizaciones.filter(quote =>
      quote.empresaData.razonSocial.toLowerCase().includes(lowercasedFilter) ||
      quote.solicitanteData.nombre.toLowerCase().includes(lowercasedFilter) ||
      quote.id.toLowerCase().includes(lowercasedFilter)
    );
  }, [cotizaciones, searchTerm]);

  const handleDelete = async () => {
    if (!quoteToDelete) return;

    try {
        await deleteDoc(doc(firestore, 'cotizaciones', quoteToDelete.id));
        toast({
            title: 'Cotización Eliminada',
            description: `La cotización N° ${quoteToDelete.id.slice(-6)} ha sido eliminada.`,
        });
    } catch (e) {
        console.error("Error deleting document: ", e);
        toast({
            variant: "destructive",
            title: "Error al eliminar",
            description: "No se pudo eliminar la cotización.",
        });
    } finally {
        setQuoteToDelete(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };
  
  const formatDate = (timestamp: any) => {
      if (!timestamp) return 'N/A';
      return new Date(timestamp.seconds * 1000).toLocaleDateString('es-CL');
  }

  const prepareQuoteForDisplay = (quote: WithId<CotizacionFirestore>): Cotizacion => {
    return {
      id: quote.id,
      empresa: quote.empresaData,
      solicitante: quote.solicitanteData,
      solicitudes: quote.solicitudesData,
      total: quote.total,
      fecha: formatDate(quote.fechaCreacion),
    };
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
                  No se pudieron cargar las cotizaciones.
              </AlertDescription>
          </Alert>
      )
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-3xl flex items-center gap-3">
            <History className="h-8 w-8 text-primary"/>
            Historial de Cotizaciones
        </CardTitle>
        <CardDescription>
          Busque y gestione las cotizaciones generadas en el sistema.
        </CardDescription>
        <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Buscar por empresa, solicitante o N° de documento..."
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
                        <TableHead>N° Doc</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Solicitante</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredCotizaciones.length > 0 ? filteredCotizaciones.map((quote) => {
                      const displayQuote = prepareQuoteForDisplay(quote);
                      const query = encodeURIComponent(JSON.stringify(displayQuote));

                      return (
                        <TableRow key={quote.id} className="hover:bg-accent/50">
                            <TableCell className="font-mono text-xs">
                                <Badge variant="secondary">{quote.id.slice(-6)}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(quote.fechaCreacion)}</TableCell>
                            <TableCell className="font-medium">{quote.empresaData.razonSocial}</TableCell>
                            <TableCell className="text-muted-foreground">{quote.solicitanteData.nombre}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(quote.total)}</TableCell>
                            <TableCell className="text-center">
                                <div className='flex items-center justify-center gap-1'>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Link href={`/cotizacion?data=${query}`} legacyBehavior>
                                                <a target="_blank" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10">
                                                    <Eye className="h-4 w-4" />
                                                </a>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Ver Cotización</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                           <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => setQuoteToDelete(quote)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción no se puede deshacer. Esto eliminará permanentemente la cotización
                                                            <span className='font-bold'> N° {quote.id.slice(-6)} </span>
                                                            de los servidores.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel onClick={() => setQuoteToDelete(null)}>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                                            Eliminar
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Eliminar Cotización</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </TableCell>
                        </TableRow>
                      )
                    }) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                No se encontraron cotizaciones.
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

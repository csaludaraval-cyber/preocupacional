
"use client";

import { useState, useMemo } from 'react';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { History, Loader2, Search, Shield, Trash2, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import type { CotizacionFirestore } from '@/lib/types';
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
} from "@/components/ui/alert-dialog"

export function AdminCotizaciones() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [quoteToDelete, setQuoteToDelete] = useState<WithId<CotizacionFirestore> | null>(null);

  // Memoize the query to prevent re-renders
  const cotizacionesQuery = useMemo(() => collection(firestore, 'cotizaciones'), []);

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
                  No se pudieron cargar las cotizaciones. Inténtelo de nuevo más tarde.
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
                    {filteredCotizaciones.length > 0 ? filteredCotizaciones.map((quote) => (
                        <TableRow key={quote.id} className="hover:bg-accent/50">
                            <TableCell className="font-mono text-xs">
                                <Badge variant="secondary">{quote.id.slice(-6)}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(quote.fechaCreacion)}</TableCell>
                            <TableCell className="font-medium">{quote.empresaData.razonSocial}</TableCell>
                            <TableCell className="text-muted-foreground">{quote.solicitanteData.nombre}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(quote.total)}</TableCell>
                            <TableCell className="text-center">
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
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                No se encontraron cotizaciones.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}

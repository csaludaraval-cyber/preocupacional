
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { Eye, History, Loader2, Search, Shield, Trash2, XCircle, Send } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { enviarCotizacion } from '@/ai/flows/enviar-cotizacion-flow';
import { GeneradorPDF } from '../cotizacion/GeneradorPDF';
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quoteToDelete, setQuoteToDelete] = useState<WithId<CotizacionFirestore> | null>(null);
  const [quoteToSend, setQuoteToSend] = useState<Cotizacion | null>(null);
  const [isSending, setIsSending] = useState(false);

  const cotizacionesQuery = useMemoFirebase(() => collection(firestore, 'cotizaciones'), []);

  const { data: cotizaciones, isLoading, error } = useCollection<CotizacionFirestore>(cotizacionesQuery);
  
  const filteredCotizaciones = useMemo(() => {
    if (!cotizaciones) return [];

    return cotizaciones.filter(quote => {
      // Date filtering
      const quoteDate = quote.fechaCreacion.toDate();
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Start of the day
        if (quoteDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of the day
        if (quoteDate > end) return false;
      }

      // Search term filtering
      if (searchTerm) {
          const lowercasedFilter = searchTerm.toLowerCase();
          const empresaMatch = quote.empresaData?.razonSocial?.toLowerCase().includes(lowercasedFilter);
          const solicitanteNombreMatch = quote.solicitanteData?.nombre?.toLowerCase().includes(lowercasedFilter);
          const solicitanteMailMatch = quote.solicitanteData?.mail?.toLowerCase().includes(lowercasedFilter);
          const idMatch = quote.id?.toLowerCase().includes(lowercasedFilter);
          
          if (! (empresaMatch || solicitanteNombreMatch || solicitanteMailMatch || idMatch)) {
            return false;
          }
      }

      return true;
    }).sort((a, b) => b.fechaCreacion.toMillis() - a.fechaCreacion.toMillis());
  }, [cotizaciones, searchTerm, startDate, endDate]);

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

  const handleSendEmail = async () => {
      if (!quoteToSend) return;
      setIsSending(true);

      try {
          const pdfBlob = await GeneradorPDF.generar(quoteToSend);
          const reader = new FileReader();
          
          reader.onloadend = async () => {
              const base64data = reader.result;
              if (typeof base64data !== 'string') {
                  throw new Error("Error convirtiendo PDF a Base64");
              }
              const pdfBase64 = base64data.split(',')[1];
              
              await enviarCotizacion({
                  clienteEmail: quoteToSend.solicitante.mail, // CORREGIDO: Usar email del solicitante
                  cotizacionId: quoteToSend.id?.slice(-6) || 'S/N',
                  pdfBase64: pdfBase64,
              });

              toast({
                title: "Correo Enviado",
                description: `La cotización se ha enviado a ${quoteToSend.solicitante.mail}.`
              });
              setQuoteToSend(null);
          };
          reader.onerror = () => {
             throw new Error("Fallo la lectura del Blob del PDF.");
          }
          reader.readAsDataURL(pdfBlob);

      } catch (error: any) {
          console.error("Error al enviar correo:", error);
          toast({
              title: "Error al Enviar Correo",
              description: error.message || "No se pudo enviar la cotización.",
              variant: "destructive",
          });
      } finally {
          setIsSending(false);
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
        <div className="pt-4 space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Buscar por empresa, solicitante, email o N° de documento..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className='space-y-2'>
                    <Label htmlFor='start-date'>Fecha Desde</Label>
                    <Input 
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className='space-y-2'>
                    <Label htmlFor='end-date'>Fecha Hasta</Label>
                    <Input 
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>
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
                        <TableHead>Email Solicitante</TableHead>
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
                            <TableCell className="font-medium">{quote.empresaData?.razonSocial || 'N/A'}</TableCell>
                            <TableCell className="text-muted-foreground">{quote.solicitanteData?.mail || 'N/A'}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(quote.total)}</TableCell>
                            <TableCell className="text-center">
                                <div className='flex items-center justify-center gap-1'>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button asChild variant="ghost" size="icon">
                                                <Link href={`/cotizacion?data=${query}`} target="_blank">
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Ver Cotización</p>
                                        </TooltipContent>
                                    </Tooltip>

                                    <AlertDialog>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => setQuoteToSend(displayQuote)} disabled={!displayQuote.solicitante?.mail}>
                                                        <Send className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{displayQuote.solicitante?.mail ? 'Enviar por Email' : 'Email de solicitante no disponible'}</p></TooltipContent>
                                        </Tooltip>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirmar Envío</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    ¿Confirma el envío de la cotización N° <span className="font-bold">{displayQuote.id?.slice(-6)}</span> al correo <span className="font-bold">{displayQuote.solicitante?.mail}</span>?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel onClick={() => setQuoteToSend(null)}>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleSendEmail} disabled={isSending}>
                                                    {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                                    Confirmar Envío
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                    <AlertDialog>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => setQuoteToDelete(quote)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Eliminar Cotización</p></TooltipContent>
                                        </Tooltip>
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
                                </div>
                            </TableCell>
                        </TableRow>
                      )
                    }) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                No se encontraron cotizaciones para los filtros seleccionados.
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

    
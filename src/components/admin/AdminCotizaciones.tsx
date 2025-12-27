"use client";

import React, { useMemo, useState, useRef } from 'react';
import { useCotizaciones } from '@/hooks/use-cotizaciones';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, MoreVertical, FileText, UploadCloud, FileCheck, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { DetalleCotizacion } from '@/components/cotizacion/DetalleCotizacion';
import { useRouter } from 'next/navigation';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Cotizacion, StatusCotizacion } from '@/lib/types';
import { mapLegacyStatus } from '@/lib/status-mapper';
import { emitirDTEInmediato } from '@/server/actions/facturacionActions';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { XCircle } from 'lucide-react';

const QuoteStatusMap: Record<string, 'default' | 'outline' | 'destructive' | 'secondary'> = {
  PENDIENTE: 'secondary',
  CONFIRMADA: 'outline',
  CORREO_ENVIADO: 'outline',
  PAGADO: 'default',
  FACTURADO: 'default',
  RECHAZADA: 'destructive',
  orden_examen_enviada: 'secondary', 
};


export default function AdminCotizaciones() {
  const { quotes, isLoading, error, refetchQuotes } = useCotizaciones();
  const [quoteToDelete, setQuoteToDelete] = useState<Cotizacion | null>(null);
  const [quoteToManage, setQuoteToManage] = useState<Cotizacion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInvoicing, setIsInvoicing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  // --- UTILIDADES DE TIEMPO SEGURAS (BLINDAJE) ---
  const getMs = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    return new Date(ts).getTime() || 0;
  };

  const formatDate = (ts: any) => {
    const ms = getMs(ts);
    if (ms === 0) return 'N/A';
    return new Date(ms).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const sortedQuotes = useMemo(() => {
    if (!quotes) return [];
    return [...quotes].sort((a, b) => getMs(b.fechaCreacion) - getMs(a.fechaCreacion));
  }, [quotes]);

  const handleInvoiceNow = async (quoteId: string) => {
    setIsInvoicing(quoteId);
    try {
      const result = await emitirDTEInmediato(quoteId);
      if (result.success) {
        toast({ title: 'Éxito', description: `Folio ${result.folio} emitido.` });
        refetchQuotes();
        setQuoteToManage(null);
      } else throw new Error(result.error);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally { setIsInvoicing(null); }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0] || !quoteToManage) return;
    const file = event.target.files[0];
    setIsUploading(true);
    try {
      const storage = getStorage();
      const fileRef = storageRef(storage, `vouchers/${quoteToManage.id}_${Date.now()}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      
      const docRef = doc(firestore, 'cotizaciones', quoteToManage.id);
      await updateDoc(docRef, { pagoVoucherUrl: url, status: 'PAGADO' });

      // Actualizar el estado local para reflejar el cambio en la UI inmediatamente
      setQuoteToManage(prev => prev ? { ...prev, pagoVoucherUrl: url, status: 'PAGADO' } : null);

      toast({ title: 'Voucher Subido', description: 'Estado actualizado a: PAGADO' });
      refetchQuotes();
    } catch (err: any) {
      console.error('Error uploading file:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Fallo al subir archivo' });
    } finally { setIsUploading(false); }
  };

   const handleDelete = async () => {
    if (!quoteToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'cotizaciones', quoteToDelete.id));
      toast({ title: 'Eliminada', description: `Cotización ${quoteToDelete.id.slice(-6)} eliminada.` });
      refetchQuotes();
      setQuoteToDelete(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8" /></div>;
  if (error) return <Alert variant="destructive"><XCircle /><AlertTitle>Error</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;

  return (
    <div className="container mx-auto p-4 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6 uppercase font-headline">Administración de Cotizaciones</h1>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedQuotes.map((quote) => {
              const displayStatus = mapLegacyStatus(quote.status);
              return (
                <TableRow key={quote.id}>
                  <TableCell className="font-mono text-xs">{quote.id?.slice(-6)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{quote.empresaData?.razonSocial || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{quote.solicitanteData?.nombre}</div>
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(quote.fechaCreacion)}</TableCell>
                  <TableCell className="font-bold text-primary">
                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(quote.total || 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={QuoteStatusMap[displayStatus] || 'default'}>{displayStatus}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setQuoteToManage(quote)}><FileText className="mr-2 h-4 w-4"/> Gestionar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setQuoteToDelete(quote)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!quoteToManage} onOpenChange={(isOpen) => !isOpen && setQuoteToManage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {quoteToManage && (
            <>
              <DialogHeader>
                <DialogTitle>Gestión ID: {quoteToManage.id?.slice(-6)} - <Badge>{mapLegacyStatus(quoteToManage.status)}</Badge></DialogTitle>
              </DialogHeader>
              <div className="flex gap-4 mb-4 p-4 bg-secondary/20 rounded-lg items-center">
                 {mapLegacyStatus(quoteToManage.status) === 'CONFIRMADA' && (
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        <UploadCloud className="mr-2 h-4 w-4"/> {isUploading ? 'Subiendo...' : 'Subir Voucher'}
                    </Button>
                )}
                {mapLegacyStatus(quoteToManage.status) === 'PAGADO' && (
                  <Button onClick={() => handleInvoiceNow(quoteToManage.id)} disabled={!!isInvoicing}>
                    <FileText className="mr-2 h-4 w-4"/> {isInvoicing ? 'Facturando...' : 'Facturar Ahora'}
                  </Button>
                )}
                 {quoteToManage.pagoVoucherUrl && mapLegacyStatus(quoteToManage.status) !== 'FACTURADO' && (
                  <Alert className="border-yellow-500 text-yellow-700 w-full">
                    <AlertTriangle className="h-4 w-4 !text-yellow-700"/>
                    <AlertTitle className="font-semibold">Pago pendiente de facturación</AlertTitle>
                     <a href={quoteToManage.pagoVoucherUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline">Ver voucher</a>
                  </Alert>
                )}
                {mapLegacyStatus(quoteToManage.status) === 'FACTURADO' && quoteToManage.liorenPdfUrl && (
                  <Button asChild className="bg-green-600 hover:bg-green-700">
                    <a href={quoteToManage.liorenPdfUrl} target="_blank" rel="noopener noreferrer"><FileCheck className="mr-2 h-4 w-4"/> Ver Factura</a>
                  </Button>
                )}
                <Input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf" />
              </div>
              <DetalleCotizacion quote={quoteToManage} />
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!quoteToDelete} onOpenChange={() => setQuoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. La cotización se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import React, { useMemo, useState, useRef } from 'react';
import { useCotizaciones } from '@/hooks/use-cotizaciones';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MoreVertical, FlaskConical, FileCheck } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DetalleCotizacion } from '@/components/cotizacion/DetalleCotizacion';
import { updateDoc, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Cotizacion } from '@/lib/types';
import { mapLegacyStatus } from '@/lib/status-mapper';
import { ejecutarFacturacionSiiV2, probarConexionLioren } from '@/server/actions/facturacionActions';
import { Input } from '@/components/ui/input';

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
  const [quoteToManage, setQuoteToManage] = useState<Cotizacion | null>(null);
  const [isInvoicing, setIsInvoicing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getMs = (ts: any) => ts?.seconds ? ts.seconds * 1000 : new Date(ts).getTime() || 0;
  
  const sortedQuotes = useMemo(() => {
    if (!quotes) return [];
    return [...quotes].sort((a, b) => getMs(b.fechaCreacion) - getMs(a.fechaCreacion));
  }, [quotes]);

  const handleTestLioren = async () => {
    toast({ title: 'Probando conexión con Lioren...' });
    const result = await probarConexionLioren();
    if (result.success && result.data) {
      // Lioren usa 'rs' para Razón Social
      const nombreEmpresa = result.data.rs || result.data.nombre || 'No disponible';
      alert(`✅ CONEXIÓN EXITOSA\n\nEmpresa: ${nombreEmpresa}\nRUT: ${result.data.rut}\nAmbiente: ${result.data.ambiente || 'Reconocido'}`);
    } else {
      alert(`❌ ERROR DE CONEXIÓN\nDetalle: ${result.error}`);
    }
  };

  const handleInvoiceNow = async (id: string) => {
    setIsInvoicing(id);
    const result = await ejecutarFacturacionSiiV2(id);
    if (result.success) {
      toast({ 
        title: 'Factura Emitida Correctamente', 
        description: `DTE Folio: ${result.folio}` 
      });
      refetchQuotes();
      setQuoteToManage(null);
    } else {
      toast({ 
        variant: 'destructive', 
        title: 'Error SII / Lioren', 
        description: result.error 
      });
    }
    setIsInvoicing(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0] || !quoteToManage) return;
    setIsUploading(true);
    try {
      const storage = getStorage();
      const fileRef = storageRef(storage, `vouchers/${quoteToManage.id}_${Date.now()}`);
      await uploadBytes(fileRef, event.target.files[0]);
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(firestore, 'cotizaciones', quoteToManage.id), { 
        pagoVoucherUrl: url, 
        status: 'PAGADO' 
      });
      toast({ title: 'Voucher Subido', description: 'Estado actualizado a PAGADO.' });
      refetchQuotes();
      setQuoteToManage(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error de Subida', description: err.message });
    } finally { 
      setIsUploading(false); 
    }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (error) return <div className="text-red-500 p-10">Error: {error.message}</div>;

  return (
    <div className="container mx-auto p-4 bg-white rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-tight text-foreground">
          Gestión de Cotizaciones
        </h1>
        <Button onClick={handleTestLioren} variant="outline" size="sm">
          <FlaskConical className="mr-2 h-4 w-4"/> Test Conexión SII
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedQuotes.map((quote) => (
            <TableRow key={quote.id}>
              <TableCell className="font-mono text-xs">{quote.id?.slice(-6)}</TableCell>
              <TableCell className="font-bold">{quote.empresaData?.razonSocial || 'Sin Nombre'}</TableCell>
              <TableCell>
                <Badge variant={QuoteStatusMap[mapLegacyStatus(quote.status)]}>
                  {mapLegacyStatus(quote.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => setQuoteToManage(quote)}>
                  <MoreVertical className="h-4 w-4"/>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!quoteToManage} onOpenChange={() => setQuoteToManage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {quoteToManage && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Acciones Disponibles - ID: {quoteToManage.id.slice(-6)}</DialogTitle>
              </DialogHeader>
              
              <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-lg border">
                {/* SUBIR VOUCHER */}
                {mapLegacyStatus(quoteToManage.status) === 'CONFIRMADA' && (
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} size="sm">
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Subir Voucher de Pago
                  </Button>
                )}

                {/* BOTÓN FACTURAR (SII) */}
                {mapLegacyStatus(quoteToManage.status) === 'PAGADO' && (
                  <Button 
                    onClick={() => handleInvoiceNow(quoteToManage.id)} 
                    disabled={!!isInvoicing} 
                    className="bg-green-600 hover:bg-green-700 text-white" 
                    size="sm"
                  >
                    {isInvoicing === quoteToManage.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    ) : (
                      <FileCheck className="mr-2 h-4 w-4"/>
                    )}
                    FACTURAR AHORA (SII)
                  </Button>
                )}

                {/* VER FACTURA SI YA EXISTE */}
                {quoteToManage.liorenPdfUrl && (
                  <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                    <a href={quoteToManage.liorenPdfUrl} target="_blank" rel="noopener noreferrer">
                      Descargar Factura SII
                    </a>
                  </Button>
                )}
                
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf"/>
              </div>

              <DetalleCotizacion quote={quoteToManage} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
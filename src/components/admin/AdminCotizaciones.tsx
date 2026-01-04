"use client";

import React, { useMemo, useState, useRef } from 'react';
import { useCotizaciones } from '@/hooks/use-cotizaciones';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Trash2, MoreVertical, FileText, UploadCloud, 
  FileCheck, AlertTriangle, FlaskConical, ExternalLink, 
  Download, XCircle, ClipboardCopy 
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { DetalleCotizacion } from '@/components/cotizacion/DetalleCotizacion';
import { useRouter } from 'next/navigation';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Cotizacion } from '@/lib/types';
import { mapLegacyStatus } from '@/lib/status-mapper';
import { ejecutarFacturacionSiiV2, probarConexionLioren } from '@/server/actions/facturacionActions';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const QuoteStatusMap: Record<string, 'default' | 'outline' | 'destructive' | 'secondary'> = {
  PENDIENTE: 'secondary', CONFIRMADA: 'outline', CORREO_ENVIADO: 'outline',
  PAGADO: 'default', FACTURADO: 'default', RECHAZADA: 'destructive',
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

  const getMs = (ts: any) => ts?.seconds ? ts.seconds * 1000 : new Date(ts).getTime() || 0;
  const formatDate = (ts: any) => {
    const ms = getMs(ts);
    return ms === 0 ? 'N/A' : new Date(ms).toLocaleDateString('es-CL');
  };

  const sortedQuotes = useMemo(() => {
    if (!quotes) return [];
    return [...quotes].sort((a, b) => getMs(b.fechaCreacion) - getMs(a.fechaCreacion));
  }, [quotes]);

  const handleTestLioren = async () => {
    toast({ title: 'Probando conexión...' });
    const result = await probarConexionLioren();
    if (result.success) alert(`✅ ÉXITO: Conectado a ${result.data.rs}`);
    else alert(`❌ ERROR: ${result.error}`);
  };

  const handleInvoiceNow = async (id: string) => {
    setIsInvoicing(id);
    const result = await ejecutarFacturacionSiiV2(id);
    if (result.success) {
      toast({ title: 'Factura Emitida', description: `Folio ${result.folio}` });
      refetchQuotes();
      setQuoteToManage(null);
    } else {
      toast({ variant: 'destructive', title: 'Fallo SII', description: result.error });
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
      await updateDoc(doc(firestore, 'cotizaciones', quoteToManage.id), { pagoVoucherUrl: url, status: 'PAGADO' });
      toast({ title: 'Voucher Subido' });
      refetchQuotes();
      setQuoteToManage(null);
    } catch (err) { toast({ variant: 'destructive', title: 'Error subida' }); }
    finally { setIsUploading(false); }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <div className="container mx-auto p-4 bg-white rounded-lg shadow border">
      <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold uppercase font-headline tracking-tight text-red-600">
  ADMINISTRACIÓN V3 - CERTIFICACIÓN
</h1>
        <Button onClick={handleTestLioren} variant="outline"><FlaskConical className="mr-2 h-4 w-4"/> Test Lioren</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Empresa</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead className="text-center">Acciones</TableHead></TableRow></TableHeader>
        <TableBody>
          {sortedQuotes.map((quote) => (
            <TableRow key={quote.id}>
              <TableCell className="font-mono text-xs">{quote.id?.slice(-6)}</TableCell>
              <TableCell className="font-bold">{quote.empresaData?.razonSocial || 'N/A'}</TableCell>
              <TableCell>{formatDate(quote.fechaCreacion)}</TableCell>
              <TableCell><Badge variant={QuoteStatusMap[mapLegacyStatus(quote.status)]}>{mapLegacyStatus(quote.status)}</Badge></TableCell>
              <TableCell className="text-center">
                <Button variant="ghost" size="icon" onClick={() => setQuoteToManage(quote)}><MoreVertical/></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!quoteToManage} onOpenChange={() => setQuoteToManage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {quoteToManage && (
            <div className="space-y-4">
              <DialogHeader><DialogTitle>Gestión Órden {quoteToManage.id.slice(-6)}</DialogTitle></DialogHeader>
              <div className="flex gap-4 p-4 bg-slate-50 rounded-lg">
                {mapLegacyStatus(quoteToManage.status) === 'CONFIRMADA' && (
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>Subir Voucher</Button>
                )}
                {mapLegacyStatus(quoteToManage.status) === 'PAGADO' && (
                  <Button onClick={() => handleInvoiceNow(quoteToManage.id)} disabled={!!isInvoicing}>
                    {isInvoicing ? 'Facturando...' : 'Facturar Ahora (SII)'}
                  </Button>
                )}
                {quoteToManage.liorenPdfUrl && (
                  <Button asChild className="bg-green-600"><a href={quoteToManage.liorenPdfUrl} target="_blank">Ver Factura</a></Button>
                )}
                <Input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              </div>
              <DetalleCotizacion quote={quoteToManage} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
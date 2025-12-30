
"use client";

import { useState, useMemo } from 'react';
import { collection, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import type { Examen } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Tag, Search, XCircle, Trash2, ShieldAlert, PlusCircle, Pencil } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Label } from '../ui/label';
import ExamenForm from './ExamenForm';

const DELETE_CATALOG_PIN = '2828';

export function AdminCatalogo() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [refetchTrigger] = useState(0);
  const memoizedQueryWithRefetch = useMemoFirebase(() => collection(firestore, 'examenes'), [refetchTrigger]);
  const { data: exams, isLoading, error, refetch: refetchExams } = useCollection<Examen>(memoizedQueryWithRefetch);

  const [searchTerm, setSearchTerm] = useState('');
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeletingCatalog, setIsDeletingCatalog] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Examen | null>(null);
  const [examToDelete, setExamToDelete] = useState<Examen | null>(null);
  
  const handleSuccess = () => {
    setIsFormOpen(false);
    setEditingExam(null);
    refetchExams();
  };
  
  const handlePinSubmit = () => {
      if (pinValue === DELETE_CATALOG_PIN) {
          setShowPinDialog(false);
          setPinValue('');
          setShowDeleteConfirmation(true);
      } else {
          toast({ variant: 'destructive', title: 'PIN Incorrecto', description: 'El PIN no es válido.' });
          setPinValue('');
      }
  };

  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    try {
        await deleteDoc(doc(firestore, 'examenes', examToDelete.id));
        toast({ title: 'Examen Eliminado', description: `Se eliminó "${examToDelete.nombre}" del catálogo.`});
        refetchExams();
    } catch(err: any) {
        toast({ variant: 'destructive', title: 'Error al Eliminar', description: err.message });
    } finally {
        setExamToDelete(null);
    }
  };


  const handleDeleteCatalog = async () => {
      setIsDeletingCatalog(true);
      try {
          const querySnapshot = await getDocs(collection(firestore, 'examenes'));
          if (querySnapshot.empty) return;
          const batch = writeBatch(firestore);
          querySnapshot.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          toast({ title: 'Catálogo Eliminado' });
          refetchExams();
      } catch (err: any) {
          toast({ variant: 'destructive', title: 'Error', description: err.message });
      } finally {
          setIsDeletingCatalog(false);
          setShowDeleteConfirmation(false);
      }
  };

  // --- FILTRADO BLINDADO (Previene Error 500) ---
  const filteredExams = useMemo(() => {
    if (!exams) return [];
    
    const sortedExams = [...exams].sort((a, b) => 
      (a?.codigo || '').localeCompare(b?.codigo || '')
    );

    if (!searchTerm) return sortedExams;
    
    const lowerSearch = searchTerm.toLowerCase();
    
    return sortedExams.filter(exam => {
      const nombre = (exam?.nombre || '').toLowerCase();
      const categoria = (exam?.categoria || '').toLowerCase();
      const codigo = (exam?.codigo || '').toLowerCase();
      return nombre.includes(lowerSearch) || categoria.includes(lowerSearch) || codigo.includes(lowerSearch);
    });
  }, [exams, searchTerm]);

  const formatPrice = (val: any) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(num);
  };

  if (isLoading || authLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (user?.role !== 'admin') {
    return (
        <Alert variant="destructive" className="max-w-2xl mx-auto mt-10">
            <Shield className="h-4 w-4" />
            <AlertTitle>Acceso Denegado</AlertTitle>
            <AlertDescription>No tiene permisos administrativos.</AlertDescription>
        </Alert>
    );
  }

  if (error) {
      return (
          <Alert variant="destructive" className="max-w-2xl mx-auto mt-10">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error de Datos</AlertTitle>
              <AlertDescription>No se pudo cargar el catálogo.</AlertDescription>
          </Alert>
      );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
            <div>
                <CardTitle className="font-headline text-2xl flex items-center gap-3 text-foreground uppercase font-bold">
                    <Tag className="h-7 w-7"/> Catálogo de Exámenes
                </CardTitle>
                <CardDescription>Gestione los exámenes y baterías del sistema.</CardDescription>
            </div>
             <div className="flex gap-2">
                 <Button onClick={() => { setEditingExam(null); setIsFormOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir
                 </Button>
                 <Button variant="destructive" onClick={() => setShowPinDialog(true)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Limpiar Todo
                </Button>
            </div>
        </div>
         <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Buscar por código, nombre..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[60vh] rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-secondary">
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Examen</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExams.length > 0 ? filteredExams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-mono text-xs">{exam?.codigo || 'S/C'}</TableCell>
                  <TableCell className="font-medium">{exam?.nombre || 'Sin nombre'}</TableCell>
                  <TableCell>{exam?.categoria || 'Sin categoría'}</TableCell>
                  <TableCell className="font-semibold text-right">{formatPrice(exam?.valor)}</TableCell>
                  <TableCell className="text-center">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingExam(exam); setIsFormOpen(true); }}>
                       <Pencil className="h-4 w-4" />
                    </Button>
                     <Button size="icon" variant="ghost" onClick={() => setExamToDelete(exam)}>
                       <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Catálogo vacío o sin coincidencias.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[625px]">
            <DialogHeader><DialogTitle>{editingExam ? 'Editar' : 'Nuevo'} Examen</DialogTitle></DialogHeader>
            <ExamenForm examen={editingExam} onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>PIN Requerido</AlertDialogTitle>
            <AlertDialogDescription>Acción irreversible. Ingrese el PIN de seguridad.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label>PIN</Label>
            <Input type="password" value={pinValue} onChange={(e) => setPinValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPinValue('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePinSubmit}>Verificar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>¿Confirmar eliminación total?</AlertDialogTitle>
                  <AlertDialogDescription>Se borrarán TODOS los exámenes del sistema.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteCatalog} disabled={isDeletingCatalog} className="bg-destructive hover:bg-destructive/90">
                      {isDeletingCatalog ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Eliminar Todo'}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!examToDelete} onOpenChange={() => setExamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este examen?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <span className='font-bold'>{examToDelete?.nombre}</span>. Esta acción es permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExam} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

    
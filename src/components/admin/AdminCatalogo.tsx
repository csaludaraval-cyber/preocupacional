
"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, doc, updateDoc, writeBatch, getDocs, addDoc } from 'firebase/firestore';
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
import { Loader2, Shield, Save, Tag, Search, XCircle, Trash2, ShieldAlert, PlusCircle, Pencil } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const memoizedQueryWithRefetch = useMemoFirebase(() => collection(firestore, 'examenes'), [refetchTrigger]);
  const { data: exams, isLoading, error, refetch: refetchExams } = useCollection<Examen>(memoizedQueryWithRefetch);


  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeletingCatalog, setIsDeletingCatalog] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Examen | null>(null);
  
  const handleSuccess = () => {
    setIsFormOpen(false);
    setEditingExam(null);
    refetchExams(); // This function should be provided by your useCollection hook
  }
  
    const handlePinSubmit = () => {
        if (pinValue === DELETE_CATALOG_PIN) {
            setShowPinDialog(false);
            setPinValue('');
            setShowDeleteConfirmation(true); // Open the final confirmation
        } else {
            toast({
                variant: 'destructive',
                title: 'PIN Incorrecto',
                description: 'El PIN de seguridad no es válido.',
            });
            setPinValue('');
        }
    };

    const handleDeleteCatalog = async () => {
        setIsDeletingCatalog(true);
        try {
            const querySnapshot = await getDocs(collection(firestore, 'examenes'));
            if (querySnapshot.empty) {
                toast({ title: 'Catálogo ya vacío', description: 'No hay exámenes para eliminar.' });
                return;
            }
            const batch = writeBatch(firestore);
            querySnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            toast({
                title: 'Catálogo Eliminado',
                description: 'Todos los exámenes han sido eliminados del sistema.',
            });
            refetchExams();

        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Error al Eliminar',
                description: err.message || 'No se pudo completar la eliminación del catálogo.',
            });
        } finally {
            setIsDeletingCatalog(false);
            setShowDeleteConfirmation(false);
        }
    };


  const filteredExams = useMemo(() => {
    if (!exams) return [];
    
    const sortedExams = [...exams].sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));

    if (!searchTerm) return sortedExams;
    
    return sortedExams.filter(exam => 
      exam.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.codigo && exam.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [exams, searchTerm]);
  

  if (isLoading || authLoading) {
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
                  No se pudo cargar el catálogo de exámenes. Por favor, recargue la página.
              </AlertDescription>
          </Alert>
      )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
            <div>
                <CardTitle className="font-headline text-3xl flex items-center gap-3">
                    <Tag className="h-8 w-8 text-primary"/>
                    Catálogo de Exámenes
                </CardTitle>
                <CardDescription>
                  Administre los exámenes y baterías disponibles en el sistema.
                </CardDescription>
            </div>
             <div className="flex gap-2 flex-shrink-0">
                 <Button onClick={() => { setEditingExam(null); setIsFormOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Examen
                 </Button>
                 <Button variant="destructive" onClick={() => setShowPinDialog(true)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Catálogo
                </Button>
            </div>
        </div>
         <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Buscar por código, nombre, categoría..."
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
                <TableHead className="w-[100px]">Código</TableHead>
                <TableHead>Examen</TableHead>
                <TableHead>Categoría / Subcategoría</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[100px] text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExams.length > 0 ? filteredExams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-mono text-xs">{exam.codigo}</TableCell>
                  <TableCell className="font-medium">{exam.nombre}</TableCell>
                   <TableCell>
                      <div className="flex flex-col">
                        <span className='font-medium'>{exam.categoria}</span>
                      </div>
                  </TableCell>
                  <TableCell className="font-semibold text-right">
                     {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(exam.valor)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => { setEditingExam(exam); setIsFormOpen(true); }}
                      >
                       <Pencil className="h-4 w-4" />
                      </Button>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        No se encontraron exámenes. El catálogo puede estar vacío o no hay coincidencias con la búsqueda.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
                <DialogTitle>{editingExam ? 'Editar Examen' : 'Añadir Nuevo Examen'}</DialogTitle>
            </DialogHeader>
            <ExamenForm 
                examen={editingExam} 
                onSuccess={handleSuccess}
            />
        </DialogContent>
      </Dialog>


       {/* PIN Dialog */}
      <AlertDialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" /> PIN de Seguridad Requerido
            </AlertDialogTitle>
            <AlertDialogDescription>
              Para continuar con esta acción irreversible, por favor ingrese el PIN de seguridad del administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="pin-input">PIN de Seguridad</Label>
            <Input 
              id="pin-input"
              type="password"
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value)}
              placeholder="Ingrese el PIN"
              onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPinValue('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePinSubmit}>
              Verificar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       {/* Final Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>¿Está absolutely seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Esta acción no se puede deshacer. Se eliminarán permanentemente 
                      <span className='font-bold'> TODOS</span> los exámenes del catálogo. Esta es su última oportunidad para cancelar.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>No, cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteCatalog} 
                    disabled={isDeletingCatalog} 
                    className="bg-destructive hover:bg-destructive/90"
                  >
                      {isDeletingCatalog ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                      Sí, eliminar todo
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

    </Card>
  );
}

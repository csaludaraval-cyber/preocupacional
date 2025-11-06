
"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
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
import { Loader2, Shield, Save, Tag, Search, XCircle, Trash2, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Label } from '../ui/label';

const DELETE_CATALOG_PIN = '2828';


export function AdminCatalogo() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const examenesQuery = useMemoFirebase(() => collection(firestore, 'examenes'), []);
  // We need a way to refetch, so we'll use a state to trigger re-renders of the hook
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const memoizedQueryWithRefetch = useMemoFirebase(() => collection(firestore, 'examenes'), [refetchTrigger]);
  const { data: exams, isLoading, error } = useCollection<Examen>(memoizedQueryWithRefetch);


  const [prices, setPrices] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeletingCatalog, setIsDeletingCatalog] = useState(false);


  useEffect(() => {
    if (exams) {
      const initialPrices = exams.reduce((acc, exam) => {
        acc[exam.id] = exam.valor;
        return acc;
      }, {} as Record<string, number>);
      setPrices(initialPrices);
    }
  }, [exams]);

  const handlePriceChange = (id: string, value: string) => {
    const newPrice = parseInt(value, 10);
    if (!isNaN(newPrice)) {
      setPrices(prev => ({ ...prev, [id]: newPrice }));
    }
  };

  const handleSavePrice = async (id: string) => {
    setSaving(id);
    try {
      const examRef = doc(firestore, 'examenes', id);
      await updateDoc(examRef, { valor: prices[id] });
      toast({
        title: 'Precio Actualizado',
        description: 'El precio del examen ha sido guardado con éxito.',
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "No se pudo actualizar el precio.",
      });
    } finally {
      setSaving(null);
    }
  };
  
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
            // Trigger a refetch of the exams list
            setRefetchTrigger(prev => prev + 1);

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
    if (!searchTerm) return exams;
    
    return exams.filter(exam => 
      exam.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.subcategoria && exam.subcategoria.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [exams, searchTerm]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

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
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline text-3xl flex items-center gap-3">
                    <Tag className="h-8 w-8 text-primary"/>
                    Catálogo de Exámenes
                </CardTitle>
                <CardDescription>
                  Administre los precios de los exámenes y baterías disponibles en el sistema.
                </CardDescription>
            </div>
             <Button variant="destructive" onClick={() => setShowPinDialog(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Catálogo Completo
            </Button>
        </div>
         <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Buscar por nombre, categoría o subcategoría..."
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
                <TableHead>Examen</TableHead>
                <TableHead>Categoría / Subcategoría</TableHead>
                <TableHead className="w-[250px]">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExams.length > 0 ? filteredExams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium">{exam.nombre}</TableCell>
                   <TableCell>
                      <div className="flex flex-col">
                        <span className='font-medium'>{exam.categoria}</span>
                        {exam.subcategoria && <Badge variant="outline" className="mt-1 w-fit">{exam.subcategoria}</Badge>}
                      </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={prices[exam.id] || 0}
                        onChange={(e) => handlePriceChange(exam.id, e.target.value)}
                        className="w-32"
                      />
                      <Button 
                        size="icon" 
                        onClick={() => handleSavePrice(exam.id)} 
                        disabled={saving === exam.id}
                        variant="ghost"
                      >
                        {saving === exam.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                        No se encontraron exámenes. El catálogo puede estar vacío.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>

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
                  <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
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

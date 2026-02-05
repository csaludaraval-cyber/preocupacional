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
import { Loader2, Shield, Tag, Search, XCircle, Trash2, PlusCircle, Pencil } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const memoizedQuery = useMemoFirebase(() => collection(firestore, 'examenes'), [refetchTrigger]);
  const { data: exams, isLoading, error, refetch: refetchExams } = useCollection<Examen>(memoizedQuery);

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
      toast({ variant: 'destructive', title: 'PIN Incorrecto' });
      setPinValue('');
    }
  };

  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    try {
        await deleteDoc(doc(firestore, 'examenes', examToDelete.id));
        toast({ title: 'Eliminado', description: `"${examToDelete.nombre}" fue borrado.`});
        refetchExams();
    } catch(err: any) {
        toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
        setExamToDelete(null);
    }
  };

  const formatPrice = (val: any) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(num);
  };

  const getFilteredData = (subtipo: string) => {
    if (!exams) return [];
    return exams.filter(exam => {
      // @ts-ignore
      const matchSubtipo = (exam.subtipo || 'examen') === subtipo;
      const lowerSearch = searchTerm.toLowerCase();
      const matchSearch = 
        (exam?.nombre || '').toLowerCase().includes(lowerSearch) || 
        (exam?.codigo || '').toLowerCase().includes(lowerSearch);
      return matchSubtipo && matchSearch;
    }).sort((a, b) => (a?.nombre || '').localeCompare(b?.nombre || ''));
  };

  if (isLoading || authLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (user?.role !== 'admin') return <Alert variant="destructive"><Shield className="h-4 w-4" /><AlertTitle>Acceso Denegado</AlertTitle></Alert>;

  const RenderTable = ({ data }: { data: Examen[] }) => (
    <ScrollArea className="h-[55vh] rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-slate-50 z-10">
          <TableRow>
            <TableHead className="w-[250px] font-bold uppercase text-[10px]">Nombre</TableHead>
            <TableHead className="font-bold uppercase text-[10px]">Descripción / Componentes</TableHead>
            <TableHead className="text-right font-bold uppercase text-[10px]">Valor</TableHead>
            <TableHead className="text-center font-bold uppercase text-[10px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? data.map((exam) => (
            <TableRow key={exam.id} className="hover:bg-slate-50/50">
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-700 text-xs uppercase">{exam.nombre}</span>
                  <span className="text-[10px] font-mono text-slate-400">{exam.codigo}</span>
                </div>
              </TableCell>
              <TableCell className="text-xs text-slate-500 italic">
                {/* @ts-ignore */}
                {exam.descripcion || 'Sin descripción detallada.'}
              </TableCell>
              <TableCell className="font-bold text-right text-slate-700">
                {formatPrice(exam.valor)}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingExam(exam); setIsFormOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5 text-blue-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setExamToDelete(exam)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )) : (
            <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400 text-xs">No hay registros en esta categoría.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Tag className="h-6 w-6 text-blue-600"/> Catálogo de Exámenes
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Administración de Precios y Baterías</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setEditingExam(null); setIsFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700 h-9 text-xs font-bold">
                <PlusCircle className="mr-2 h-4 w-4" /> AÑADIR
              </Button>
              <Button variant="outline" onClick={() => setShowPinDialog(true)} className="h-9 text-xs font-bold border-red-200 text-red-500 hover:bg-red-50">
                <Trash2 className="mr-2 h-4 w-4" /> LIMPIAR TODO
              </Button>
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
                placeholder="Buscar por código o nombre..."
                className="pl-10 bg-slate-50 border-none h-10 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="empresa" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-[#0a0a4d] p-0 h-12 rounded-lg border-none shadow-md overflow-hidden">
              <TabsTrigger 
                value="empresa" 
                className="h-full rounded-none text-[11px] font-bold uppercase transition-all text-white/65 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Batería Empresa
              </TabsTrigger>
              <TabsTrigger 
                value="bateria" 
                className="h-full rounded-none text-[11px] font-bold uppercase transition-all text-white/65 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Batería Preocupacional
              </TabsTrigger>
              <TabsTrigger 
                value="examen" 
                className="h-full rounded-none text-[11px] font-bold uppercase transition-all text-white/65 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Examen Complementario
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="empresa" className="mt-0 focus-visible:outline-none"><RenderTable data={getFilteredData('empresa')} /></TabsContent>
            <TabsContent value="bateria" className="mt-0 focus-visible:outline-none"><RenderTable data={getFilteredData('bateria')} /></TabsContent>
            <TabsContent value="examen" className="mt-0 focus-visible:outline-none"><RenderTable data={getFilteredData('examen')} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[625px]">
            <DialogHeader><DialogTitle className="uppercase font-bold text-slate-800">{editingExam ? 'Editar' : 'Nuevo'} Registro</DialogTitle></DialogHeader>
            <ExamenForm examen={editingExam} onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Seguridad</AlertDialogTitle><AlertDialogDescription>Ingrese el PIN para vaciar el catálogo.</AlertDialogDescription></AlertDialogHeader>
          <div className="py-2"><Input type="password" value={pinValue} onChange={(e) => setPinValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()} /></div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPinValue('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePinSubmit}>Verificar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación total?</AlertDialogTitle></AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => {
                      setIsDeletingCatalog(true);
                      const querySnapshot = await getDocs(collection(firestore, 'examenes'));
                      const batch = writeBatch(firestore);
                      querySnapshot.forEach(doc => batch.delete(doc.ref));
                      await batch.commit();
                      toast({ title: 'Catálogo Vaciado' });
                      setIsDeletingCatalog(false);
                      setShowDeleteConfirmation(false);
                      refetchExams();
                  }} className="bg-red-600 hover:bg-red-700">Eliminar Todo</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!examToDelete} onOpenChange={() => setExamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExam} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
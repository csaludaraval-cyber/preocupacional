"use client";

import React, { useState, useMemo } from 'react';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import type { Empresa } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Search, XCircle, Trash2, PlusCircle, Pencil, Users } from 'lucide-react';
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
import ClienteForm from './ClienteForm';
import { formatRut, cleanRut } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// FIX QUIRÚRGICO PARA ERROR ts(2305): Definición local de WithId
type WithId<T> = T & { id: string };

export function AdminClientes() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const clientesQuery = useMemoFirebase(() => collection(firestore, 'empresas'), []);
  const { data: clientes, isLoading, error, refetch: refetchClientes } = useCollection<Empresa>(clientesQuery);

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<WithId<Empresa> | null>(null);
  const [clienteToDelete, setClienteToDelete] = useState<WithId<Empresa> | null>(null);
  
  const handleSuccess = () => {
    setIsFormOpen(false);
    setEditingCliente(null);
    refetchClientes();
  };

  const handleDelete = async () => {
    if (!clienteToDelete || !clienteToDelete.rut) return;

    try {
        const docId = cleanRut(clienteToDelete.rut);
        await deleteDoc(doc(firestore, 'empresas', docId));
        toast({ title: 'Cliente Eliminado', description: `${clienteToDelete.razonSocial} ha sido borrado.` });
        refetchClientes();
    } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el cliente." });
    } finally {
        setClienteToDelete(null);
    }
  };

  // Lógica de deduplicación y filtrado profesional
  const filteredClientes = useMemo(() => {
    if (!clientes) return [];
    
    const uniqueClientes = new Map<string, WithId<Empresa>>();
    clientes.forEach(c => {
        const cWithId = c as WithId<Empresa>;
        const key = cleanRut(cWithId.rut);
        const existing = uniqueClientes.get(key);
        if (!existing || cWithId.modalidadFacturacion === 'frecuente') {
            uniqueClientes.set(key, cWithId);
        }
    });

    const list = Array.from(uniqueClientes.values())
        .sort((a, b) => (a.razonSocial || '').localeCompare(b.razonSocial || ''));

    if (!searchTerm) return list;
    
    const term = searchTerm.toLowerCase();
    return list.filter(c => 
      c.razonSocial.toLowerCase().includes(term) ||
      cleanRut(c.rut).includes(cleanRut(term)) ||
      c.email?.toLowerCase().includes(term)
    );
  }, [clientes, searchTerm]);
  
  if (isLoading || authLoading) return <div className="flex justify-center p-40"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
  
  if (user?.role !== 'admin') {
    return (
        <Alert variant="destructive" className="max-w-2xl mx-auto mt-10">
            <Shield className="h-4 w-4" />
            <AlertTitle>Acceso Denegado</AlertTitle>
            <AlertDescription>Se requieren permisos de administrador para gestionar clientes.</AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
      <Card className="border-none shadow-none">
        <CardHeader className="px-0 pt-0">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
              <div>
                  <CardTitle className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">
                      Gestión de <span className="text-primary">Clientes</span>
                  </CardTitle>
                  <CardDescription className="font-medium text-slate-500">
                    Administra la base de datos de empresas y su modalidad de pago.
                  </CardDescription>
              </div>
               <Button onClick={() => { setEditingCliente(null); setIsFormOpen(true); }} className="h-12 px-6 font-bold shadow-lg">
                  <PlusCircle className="mr-2 h-5 w-5" /> NUEVO CLIENTE
               </Button>
          </div>
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input 
                  placeholder="Buscar por Razón Social, RUT o Email..."
                  className="pl-10 h-12 bg-slate-50 border-none shadow-inner text-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <ScrollArea className="h-[60vh] rounded-xl border border-slate-100 bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-600 uppercase text-xs">Razón Social</TableHead>
                  <TableHead className="font-bold text-slate-600 uppercase text-xs">RUT</TableHead>
                  <TableHead className="font-bold text-slate-600 uppercase text-xs">Modalidad</TableHead>
                  <TableHead className="font-bold text-slate-600 uppercase text-xs">Email</TableHead>
                  <TableHead className="text-right font-bold text-slate-600 uppercase text-xs">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.length > 0 ? filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-bold text-slate-800">{cliente.razonSocial}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{formatRut(cliente.rut)}</TableCell>
                    <TableCell>
                      <Badge 
                        className={`font-black text-[10px] uppercase ${cliente.modalidadFacturacion === 'frecuente' ? 'bg-indigo-600' : 'bg-slate-100 text-slate-600'}`}
                        variant={cliente.modalidadFacturacion === 'frecuente' ? 'default' : 'outline'}
                      >
                          {cliente.modalidadFacturacion === 'frecuente' ? 'Frecuente' : 'Normal'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 font-medium">{cliente.email}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" className="hover:bg-blue-50 hover:text-blue-600 rounded-full" onClick={() => { setEditingCliente(cliente); setIsFormOpen(true); }}>
                         <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="hover:bg-red-50 hover:text-red-600 rounded-full" onClick={() => { setClienteToDelete(cliente); }}>
                         <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                   <TableRow>
                      <TableCell colSpan={5} className="text-center h-40 text-slate-400 font-medium italic">
                          No se encontraron clientes registrados.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[725px] rounded-3xl shadow-2xl">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                  {editingCliente ? 'Editar Registro' : 'Registrar Nuevo Cliente'}
                </DialogTitle>
            </DialogHeader>
            <ClienteForm cliente={editingCliente} onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!clienteToDelete} onOpenChange={() => setClienteToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter">¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
              El cliente <span className="font-bold text-slate-900">{clienteToDelete?.razonSocial}</span> será borrado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl font-bold">
              ELIMINAR AHORA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
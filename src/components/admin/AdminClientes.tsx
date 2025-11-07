
"use client";

import { useState, useMemo } from 'react';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import type { Empresa, WithId } from '@/lib/types';
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
import { Badge } from '../ui/badge';


export function AdminClientes() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const clientesQuery = useMemoFirebase(() => collection(firestore, 'empresas'), []);
  const { data: clientes, isLoading, error, refetch: refetchClientes } = useCollection<Empresa>(clientesQuery);

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Empresa | null>(null);
  const [clienteToDelete, setClienteToDelete] = useState<Empresa | null>(null);
  
  const handleSuccess = () => {
    setIsFormOpen(false);
    setEditingCliente(null);
    refetchClientes();
  };

  const handleDelete = async () => {
    if (!clienteToDelete || !clienteToDelete.rut) return;

    try {
        // We use the clean rut as the document ID
        const docId = cleanRut(clienteToDelete.rut);
        await deleteDoc(doc(firestore, 'empresas', docId));
        toast({
            title: 'Cliente Eliminado',
            description: `El cliente ${clienteToDelete.razonSocial} ha sido eliminado.`,
        });
        refetchClientes();
    } catch (e) {
        console.error("Error deleting document: ", e);
        toast({
            variant: "destructive",
            title: "Error al eliminar",
            description: "No se pudo eliminar el cliente.",
        });
    } finally {
        setClienteToDelete(null);
    }
  };

  const filteredClientes = useMemo(() => {
    if (!clientes) return [];

    // Deduplicate clients based on clean RUT, keeping the one with the 'frecuente' status if duplicates exist
    const uniqueClientes = new Map<string, WithId<Empresa>>();
    clientes.forEach(cliente => {
        const cleanedRut = cleanRut(cliente.rut);
        const existing = uniqueClientes.get(cleanedRut);
        
        // Prioritize 'frecuente' or keep the current one if no existing or the existing is not 'frecuente'
        if (!existing || cliente.modalidadFacturacion === 'frecuente') {
            uniqueClientes.set(cleanedRut, cliente);
        }
    });

    const deduplicated = Array.from(uniqueClientes.values());
    
    const sortedClientes = [...deduplicated].sort((a, b) => (a.razonSocial || '').localeCompare(b.razonSocial || ''));

    if (!searchTerm) return sortedClientes;
    
    return sortedClientes.filter(cliente => 
      cliente.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cleanRut(cliente.rut).toLowerCase().includes(cleanRut(searchTerm.toLowerCase())) ||
      (cliente.email && cliente.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [clientes, searchTerm]);
  
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
                  No se pudo cargar el listado de clientes. Por favor, recargue la página.
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
                    <Users className="h-8 w-8 text-primary"/>
                    Gestión de Clientes
                </CardTitle>
                <CardDescription>
                  Administre las empresas clientes del sistema.
                </CardDescription>
            </div>
             <Button onClick={() => { setEditingCliente(null); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cliente
             </Button>
        </div>
         <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Buscar por razón social, RUT o email..."
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
                <TableHead>Razón Social</TableHead>
                <TableHead>RUT</TableHead>
                <TableHead>Modalidad</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead className="w-[100px] text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.length > 0 ? filteredClientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium">{cliente.razonSocial}</TableCell>
                  <TableCell>{formatRut(cliente.rut)}</TableCell>
                  <TableCell>
                    <Badge variant={cliente.modalidadFacturacion === 'frecuente' ? 'default' : 'outline'}>
                        {cliente.modalidadFacturacion === 'frecuente' ? 'Frecuente' : 'Normal'}
                    </Badge>
                  </TableCell>
                  <TableCell>{cliente.email}</TableCell>
                  <TableCell>{cliente.ciudad}</TableCell>
                  <TableCell className="text-center">
                    <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => { setEditingCliente(cliente); setIsFormOpen(true); }}
                      >
                       <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => { setClienteToDelete(cliente); }}
                      >
                       <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        No se encontraron clientes.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[725px]">
            <DialogHeader>
                <DialogTitle>{editingCliente ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}</DialogTitle>
            </DialogHeader>
            <ClienteForm 
                cliente={editingCliente} 
                onSuccess={handleSuccess}
            />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!clienteToDelete} onOpenChange={() => setClienteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente al cliente <span className="font-bold">{clienteToDelete?.razonSocial}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Card>
  );
}

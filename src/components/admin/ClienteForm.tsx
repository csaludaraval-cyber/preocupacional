
"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Empresa } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

interface ClienteFormProps {
  cliente: Empresa | null;
  onSuccess: () => void;
}

const clienteSchema = z.object({
  rut: z.string().min(1, 'El RUT es obligatorio.'),
  razonSocial: z.string().min(3, 'La Razón Social es obligatoria.'),
  giro: z.string().min(1, 'El giro es obligatorio.'),
  email: z.string().email('Email no válido.'),
  direccion: z.string().min(1, 'La dirección es obligatoria.'),
  ciudad: z.string().min(1, 'La ciudad es obligatoria.'),
  comuna: z.string().min(1, 'La comuna es obligatoria.'),
  region: z.string().min(1, 'La región es obligatoria.'),
});


export default function ClienteForm({ cliente, onSuccess }: ClienteFormProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof clienteSchema>>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      rut: '',
      razonSocial: '',
      giro: '',
      email: '',
      direccion: '',
      ciudad: '',
      comuna: '',
      region: '',
    },
  });

  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (cliente) {
      form.reset(cliente);
    } else {
      form.reset({
        rut: '',
        razonSocial: '',
        giro: '',
        email: '',
        direccion: '',
        ciudad: '',
        comuna: '',
        region: '',
      });
    }
  }, [cliente, form]);

  const onSubmit = async (values: z.infer<typeof clienteSchema>) => {
    try {
      const docRef = doc(firestore, 'empresas', values.rut);
      await setDoc(docRef, values, { merge: true });
      toast({
        title: cliente ? 'Cliente Actualizado' : 'Cliente Creado',
        description: `Se guardaron los datos para "${values.razonSocial}".`,
      });
      onSuccess();
    } catch (error: any) {
      console.error('Error saving cliente:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Guardar',
        description: error.message || 'No se pudo guardar el cliente. Intente de nuevo.',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="razonSocial" render={({ field }) => (
                <FormItem><FormLabel>Razón Social</FormLabel><FormControl><Input placeholder="Nombre de la empresa" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="rut" render={({ field }) => (
                <FormItem><FormLabel>RUT</FormLabel><FormControl><Input placeholder="76.123.456-7" {...field} disabled={!!cliente} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
             <FormField control={form.control} name="giro" render={({ field }) => (
                <FormItem><FormLabel>Giro</FormLabel><FormControl><Input placeholder="Giro comercial" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="contacto@empresa.com" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>
         <FormField control={form.control} name="direccion" render={({ field }) => (
            <FormItem><FormLabel>Dirección</FormLabel><FormControl><Input placeholder="Dirección de facturación" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
             <FormField control={form.control} name="ciudad" render={({ field }) => (
                <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="comuna" render={({ field }) => (
                <FormItem><FormLabel>Comuna</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="region" render={({ field }) => (
                <FormItem><FormLabel>Región</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>

        <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
            </Button>
        </div>
      </form>
    </Form>
  );
}

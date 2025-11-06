
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Examen } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

interface ExamenFormProps {
  examen: Examen | null;
  onSuccess: () => void;
}

const examenSchema = z.object({
  codigo: z.string().min(1, 'El código es obligatorio.'),
  nombre: z.string().min(3, 'El nombre es obligatorio.'),
  categoria: z.string().min(1, 'La categoría es obligatoria.'),
  valor: z.preprocess(
    (val) => {
        if (typeof val === 'string') {
            // Eliminar puntos de miles y cualquier otro caracter no numérico
            const cleanedVal = val.replace(/\D/g, '');
            return parseInt(cleanedVal, 10) || 0;
        }
        return val;
    },
    z.number().positive('El valor debe ser un número positivo.')
  ),
});


export default function ExamenForm({ examen, onSuccess }: ExamenFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof examenSchema>>({
    resolver: zodResolver(examenSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      categoria: '',
      valor: 0,
    },
  });

  useEffect(() => {
    if (examen) {
      form.reset({
        codigo: examen.codigo,
        nombre: examen.nombre,
        categoria: examen.categoria,
        valor: examen.valor,
      });
    } else {
      form.reset({
        codigo: '',
        nombre: '',
        categoria: '',
        valor: 0,
      });
    }
  }, [examen, form]);

  const onSubmit = async (values: z.infer<typeof examenSchema>) => {
    setIsLoading(true);
    try {
      if (examen) {
        // Update existing exam
        const examRef = doc(firestore, 'examenes', examen.id);
        await updateDoc(examRef, values);
        toast({
          title: 'Examen Actualizado',
          description: `Se guardaron los cambios para "${values.nombre}".`,
        });
      } else {
        // Create new exam
        await addDoc(collection(firestore, 'examenes'), values);
        toast({
          title: 'Examen Creado',
          description: `El examen "${values.nombre}" ha sido añadido al catálogo.`,
        });
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error saving exam:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Guardar',
        description: error.message || 'No se pudo guardar el examen. Intente de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                    <Input placeholder="Ej: 303001" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nombre del Examen</FormLabel>
                <FormControl>
                    <Input placeholder="Nombre completo del examen" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
            control={form.control}
            name="categoria"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Categoría / Subcategoría</FormLabel>
                <FormControl>
                    <Input placeholder="Ej: Batería Básica Preocupacional" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        
        <div className="grid grid-cols-1 gap-4">
            <FormField
            control={form.control}
            name="valor"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Valor (CLP)</FormLabel>
                <FormControl>
                    <Input 
                        type="text" 
                        placeholder="0"
                        value={field.value === 0 ? '' : new Intl.NumberFormat('es-CL').format(field.value)}
                        onChange={(e) => {
                            const numericValue = e.target.value.replace(/\D/g, '');
                            field.onChange(parseInt(numericValue, 10) || 0);
                        }}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? 'Guardando...' : 'Guardar Examen'}
            </Button>
        </div>
      </form>
    </Form>
  );
}

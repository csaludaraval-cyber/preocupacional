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
import { Textarea } from '@/components/ui/textarea'; // Importación necesaria para descripción
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

interface ExamenFormProps {
  examen: Examen | null;
  onSuccess: () => void;
}

const examenSchema = z.object({
  codigo: z.string().min(1, 'El código es obligatorio.'),
  nombre: z.string().min(3, 'El nombre es obligatorio.'),
  categoria: z.string().min(1, 'La categoría es obligatoria.'),
  // NUEVO CAMPO: Segmentación para pestañas
  subtipo: z.enum(['empresa', 'bateria', 'examen'], {
    required_error: "Seleccione un tipo de segmentación.",
  }),
  // NUEVO CAMPO: Descripción para el PDF
  descripcion: z.string().optional(),
  valor: z.preprocess(
    (val) => {
        if (typeof val === 'string') {
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
      subtipo: 'examen',
      descripcion: '',
      valor: 0,
    },
  });

  useEffect(() => {
    if (examen) {
      form.reset({
        codigo: examen.codigo,
        nombre: examen.nombre,
        categoria: examen.categoria,
        // @ts-ignore - manejamos la transición de datos viejos a nuevos
        subtipo: examen.subtipo || 'examen',
        // @ts-ignore
        descripcion: examen.descripcion || '',
        valor: examen.valor,
      });
    } else {
      form.reset({
        codigo: '',
        nombre: '',
        categoria: '',
        subtipo: 'examen',
        descripcion: '',
        valor: 0,
      });
    }
  }, [examen, form]);

  const onSubmit = async (values: z.infer<typeof examenSchema>) => {
    setIsLoading(true);
    try {
      if (examen) {
        const examRef = doc(firestore, 'examenes', examen.id);
        await updateDoc(examRef, values);
        toast({ title: 'Catálogo Actualizado', description: `"${values.nombre}" se guardó correctamente.` });
      } else {
        await addDoc(collection(firestore, 'examenes'), values);
        toast({ title: 'Éxito', description: 'Nueva prestación añadida.' });
      }
      onSuccess();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
                control={form.control}
                name="subtipo"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className='font-bold text-blue-600'>Segmentación (Pestaña)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                                <SelectTrigger className='bg-blue-50 border-blue-200'>
                                    <SelectValue placeholder="Seleccione pestaña" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="empresa">Pestaña 1: Batería Empresa</SelectItem>
                                <SelectItem value="bateria">Pestaña 2: Batería Preocupacional</SelectItem>
                                <SelectItem value="examen">Pestaña 3: Examen Preocupacional</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Código Interno</FormLabel>
                        <FormControl><Input placeholder="Ej: 303001" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Nombre Comercial (Factura y Sistema)</FormLabel>
                    <FormControl><Input placeholder="Nombre breve para la factura" {...field} /></FormControl>
                    <FormDescription>Este nombre es el que se enviará a Lioren.</FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />

        <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Descripción Detallada (Solo para PDF)</FormLabel>
                    <FormControl>
                        <Textarea 
                            placeholder="Ej: Incluye Hemograma, Glicemia, Orina Completa..." 
                            className="resize-none h-24"
                            {...field} 
                        />
                    </FormControl>
                    <FormDescription>Este texto aparecerá en el PDF de la cotización.</FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Glosa de Categoría</FormLabel>
                        <FormControl><Input placeholder="Ej: Exámenes Minería" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Valor CLP (Neto)</FormLabel>
                        <FormControl>
                            <Input 
                                type="text" 
                                value={field.value === 0 ? '' : new Intl.NumberFormat('es-CL').format(field.value)}
                                onChange={(e) => field.onChange(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading} className="bg-[#0a0a4d] hover:bg-blue-900 px-8">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {examen ? 'Actualizar Prestación' : 'Añadir al Catálogo'}
            </Button>
        </div>
      </form>
    </Form>
  );
}

"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import { getExams, examCategories, updateExamPrice } from '@/lib/data';
import type { Examen } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Save, Tag, Search, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export function AdminCatalogo() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const examenesQuery = useMemoFirebase(() => collection(firestore, 'examenes'), []);
  const { data: exams, isLoading, error } = useCollection<Examen>(examenesQuery);

  const [prices, setPrices] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

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
      await updateExamPrice(id, prices[id]);
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
  
  const filteredExams = useMemo(() => {
    if (!exams) return [];
    if (!searchTerm) return exams;
    
    return exams.filter(exam => 
      exam.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.subcategoria.toLowerCase().includes(searchTerm.toLowerCase())
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
        <CardTitle className="font-headline text-3xl flex items-center gap-3">
            <Tag className="h-8 w-8 text-primary"/>
            Catálogo de Exámenes
        </CardTitle>
        <CardDescription>
          Administre los precios de los exámenes y baterías disponibles en el sistema. Los cambios se reflejarán inmediatamente en las nuevas cotizaciones.
        </CardDescription>
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
                        <Badge variant="outline" className="mt-1 w-fit">{exam.subcategoria}</Badge>
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
                        No se encontraron exámenes para el término de búsqueda.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

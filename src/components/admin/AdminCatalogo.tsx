"use client";

import { useEffect, useState } from 'react';
import { Shield, Loader2, Save } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getExams, updateExamPrice } from '@/lib/data';
import type { Examen } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export function AdminCatalogo() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Examen[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [localPrices, setLocalPrices] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    async function fetchExams() {
      if (user?.role === 'admin') {
        setLoading(true);
        const data = await getExams();
        setExams(data);
        const initialPrices = data.reduce((acc, exam) => {
            acc[exam.id] = String(exam.valor);
            return acc;
        }, {} as Record<string, string>);
        setLocalPrices(initialPrices);
        setLoading(false);
      }
    }
    fetchExams();
  }, [user]);

  const handlePriceChange = (id: string, value: string) => {
    setLocalPrices(prev => ({...prev, [id]: value}));
  };
  
  const handleSavePrice = async (id: string) => {
    const originalExam = exams.find(e => e.id === id);
    const newPriceStr = localPrices[id];

    if (!originalExam || newPriceStr === undefined) return;
    
    const newPrice = Number(newPriceStr);

    if (isNaN(newPrice) || newPrice < 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor, ingrese un valor numérico válido.",
      });
      setLocalPrices(prev => ({...prev, [id]: String(originalExam.valor)}));
      return;
    }

    if (newPrice === originalExam.valor) return; // No changes

    setUpdatingId(id);
    try {
      await updateExamPrice(id, newPrice);
      setExams(prevExams => prevExams.map(ex => ex.id === id ? {...ex, valor: newPrice} : ex));
      toast({
        title: "Éxito",
        description: `Precio de "${originalExam.nombre}" actualizado.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: "No se pudo guardar el cambio. Intente de nuevo.",
      });
      setLocalPrices(prev => ({...prev, [id]: String(originalExam.valor)})); // Revert on error
    } finally {
      setUpdatingId(null);
    }
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  if (user?.role !== 'admin') {
    return (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
            <Shield className="h-4 w-4" />
            <AlertTitle>Acceso Denegado</AlertTitle>
            <AlertDescription>
                No tienes permisos para acceder a esta sección. Por favor, inicie sesión como administrador.
            </AlertDescription>
        </Alert>
    );
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-3xl flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary"/>
            Administración de Catálogo
        </CardTitle>
        <CardDescription>
          Edite los precios de los exámenes. Los cambios se guardarán automáticamente al salir del campo de edición.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Examen</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio (CLP)</TableHead>
                <TableHead className="w-[100px] text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((exam) => (
                <TableRow key={exam.id} className="hover:bg-accent/50">
                  <TableCell className="font-medium">{exam.nombre}</TableCell>
                  <TableCell><Badge variant="secondary">{exam.categoria}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="relative flex items-center justify-end">
                      <span className="absolute left-3 text-muted-foreground">$</span>
                      <Input
                        type="text"
                        className="w-32 text-right pr-4 pl-6"
                        value={localPrices[exam.id] || ''}
                        onChange={(e) => handlePriceChange(exam.id, e.target.value.replace(/[^0-9]/g, ''))}
                        onBlur={() => handleSavePrice(exam.id)}
                        disabled={updatingId === exam.id}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {updatingId === exam.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                    ) : (
                        <Save className="h-5 w-5 text-muted-foreground mx-auto"/>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

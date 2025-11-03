
"use client";

import { useEffect, useState, useMemo } from 'react';
import { Shield, Loader2, Save, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getExams, examCategories, updateExamPrice } from '@/lib/data';
import type { Examen } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


export function AdminCatalogo() {
  const { user, loading: authLoading } = useAuth();
  const [exams, setExams] = useState<Examen[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [localPrices, setLocalPrices] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchExams() {
      if (user?.role === 'admin') {
        setLoading(true);
        try {
          const data = await getExams();
          setExams(data);
          const initialPrices = data.reduce((acc, exam) => {
              acc[exam.id] = String(exam.valor);
              return acc;
          }, {} as Record<string, string>);
          setLocalPrices(initialPrices);
        } catch (error) {
           toast({
            variant: "destructive",
            title: "Error al cargar catálogo",
            description: "No se pudieron obtener los exámenes. Verifique la consola.",
          });
          console.error(error);
        } finally {
          setLoading(false);
        }
      }
    }
    if (!authLoading) {
      fetchExams();
    }
  }, [user, authLoading]);
  
  const filteredExams = useMemo(() => {
    if (!searchTerm) return exams;
    return exams.filter(exam =>
      exam.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [exams, searchTerm]);

  const examsByCategory = useMemo(() => {
    return filteredExams.reduce((acc, exam) => {
      const category = exam.categoria;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(exam);
      return acc;
    }, {} as Record<string, Examen[]>);
  }, [filteredExams]);

  const handlePriceChange = (id: string, value: string) => {
    setLocalPrices(prev => ({...prev, [id]: value}));
  };
  
  const handleSavePrice = async (id: string) => {
    const newPriceStr = localPrices[id];
    if (newPriceStr === undefined) return;

    const newPrice = Number(newPriceStr);
    if (isNaN(newPrice)) {
        toast({
            variant: "destructive",
            title: "Valor inválido",
            description: "Por favor, ingrese un número válido.",
        });
        return;
    }
    
    setUpdatingId(id);
    try {
        await updateExamPrice(id, newPrice);
        toast({
            title: "Precio Actualizado",
            description: "El valor del examen ha sido guardado correctamente.",
        });
    } catch(error) {
        console.error("Failed to update price:", error);
        toast({
            variant: "destructive",
            title: "Error al guardar",
            description: "No se pudo actualizar el precio del examen.",
        });
    } finally {
        setUpdatingId(null);
    }
  };
  
  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
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


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-3xl flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary"/>
            Administración de Catálogo
        </CardTitle>
        <CardDescription>
          Edite los precios de los exámenes. Los cambios se guardarán en la base de datos al salir del campo de edición.
        </CardDescription>
        <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Buscar examen por nombre..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </CardHeader>
      <CardContent>
        <Accordion 
          type="multiple" 
          className="w-full"
          defaultValue={searchTerm ? examCategories : [examCategories[0]]}
        >
            {examCategories.map(category => {
                const categoryExams = examsByCategory[category] || [];
                const count = categoryExams.length;
                
                if (count === 0 && searchTerm) return null;

                return (
                <AccordionItem value={category} key={category}>
                    <AccordionTrigger className="text-xl font-headline hover:no-underline text-foreground">
                        <div className="flex items-center gap-2">
                            <span>{category}</span>
                            {count > 0 && <span className="text-sm font-normal text-muted-foreground">({count})</span>}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre del Examen</TableHead>
                                        <TableHead>Subcategoría</TableHead>
                                        <TableHead className="text-right">Precio (CLP)</TableHead>
                                        <TableHead className="w-[100px] text-center">Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categoryExams.map((exam) => (
                                        <TableRow key={exam.id} className="hover:bg-accent/50">
                                            <TableCell className="font-medium">{exam.nombre}</TableCell>
                                            <TableCell><Badge variant="secondary">{exam.subcategoria}</Badge></TableCell>
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
                    </AccordionContent>
                </AccordionItem>
            )})}
        </Accordion>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState, useMemo } from 'react';
import type { Examen } from '@/lib/types';
import { getExams, examCategories } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface Props {
  selectedExams: Examen[];
  onExamToggle: (exam: Examen, checked: boolean) => void;
}

export default function Paso2SeleccionExamenes({ selectedExams, onExamToggle }: Props) {
  const [allExams, setAllExams] = useState<Examen[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function loadExams() {
      setLoading(true);
      try {
        const examsData = await getExams();
        setAllExams(examsData);
      } catch (error) {
        console.error("Failed to load exams:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar el catálogo de exámenes.",
        });
      } finally {
        setLoading(false);
      }
    }
    loadExams();
  }, [toast]);

  const examsByCategory = useMemo(() => {
    return allExams.reduce((acc, exam) => {
      const category = exam.categoria;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(exam);
      return acc;
    }, {} as Record<string, Examen[]>);
  }, [allExams]);
  
  const selectedExamIds = new Set(selectedExams.map(e => e.id));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };
  
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Tabs defaultValue={examCategories[0]} className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {examCategories.map(category => (
          <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
        ))}
      </TabsList>
      
      {examCategories.map(category => (
        <TabsContent key={category} value={category}>
          <Card>
            <CardContent className="p-4 pt-6">
              <div className="space-y-4">
                {(examsByCategory[category] || []).map(exam => (
                  <div key={exam.id} className="flex items-center space-x-3 rounded-md p-2 transition-colors hover:bg-accent/50">
                    <Checkbox
                      id={exam.id}
                      checked={selectedExamIds.has(exam.id)}
                      onCheckedChange={(checked) => onExamToggle(exam, !!checked)}
                    />
                    <Label htmlFor={exam.id} className="flex-grow font-normal cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-foreground">{exam.nombre}</p>
                          <p className="text-xs text-muted-foreground">{exam.descripcion}</p>
                        </div>
                        <p className="font-semibold text-primary whitespace-nowrap">{formatCurrency(exam.valor)}</p>
                      </div>
                    </Label>
                  </div>
                ))}
                {(examsByCategory[category] || []).length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No hay exámenes en esta categoría.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}

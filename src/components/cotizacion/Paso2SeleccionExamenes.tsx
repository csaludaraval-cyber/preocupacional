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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '../ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface Props {
  selectedExams: Examen[];
  onExamToggle: (exam: Examen, checked: boolean) => void;
  showPrice?: boolean;
}

export default function Paso2SeleccionExamenes({ selectedExams, onExamToggle, showPrice = true }: Props) {
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

  const examsByMainCategory = useMemo(() => {
    return allExams.reduce((acc, exam) => {
      const mainCategory = exam.categoria;
      if (!acc[mainCategory]) {
        acc[mainCategory] = {};
      }
      const subCategory = exam.subcategoria;
      if(!acc[mainCategory][subCategory]) {
        acc[mainCategory][subCategory] = [];
      }
      acc[mainCategory][subCategory].push(exam);
      return acc;
    }, {} as Record<string, Record<string, Examen[]>>);
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
      <ScrollArea className="w-full whitespace-nowrap rounded-md">
        <TabsList className="inline-flex h-auto">
          {examCategories.map(category => (
            <TabsTrigger key={category} value={category} className="text-xs sm:text-sm">{category}</TabsTrigger>
          ))}
        </TabsList>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      
      {examCategories.map(category => (
        <TabsContent key={category} value={category}>
          <Card>
            <CardContent className="p-0">
               <Accordion type="multiple" className="w-full">
                {Object.entries(examsByMainCategory[category] || {}).map(([subCategory, exams]) => (
                  <AccordionItem value={subCategory} key={subCategory}>
                    <AccordionTrigger className="px-4 hover:no-underline">
                        <div className='flex items-center gap-2'>
                           <Badge variant="secondary">{subCategory}</Badge>
                           <span className='text-sm text-muted-foreground'>({exams.length} exámenes)</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 p-4 border-t">
                        {exams.map(exam => (
                          <div key={exam.id} className="flex items-start space-x-3 rounded-md p-2 transition-colors hover:bg-accent/50">
                            <Checkbox
                              id={exam.id}
                              checked={selectedExamIds.has(exam.id)}
                              onCheckedChange={(checked) => onExamToggle(exam, !!checked)}
                              className="mt-1"
                            />
                            <Label htmlFor={exam.id} className="flex-grow font-normal cursor-pointer">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-foreground leading-tight">{exam.nombre}</p>
                                  {exam.descripcion && <p className="text-xs text-muted-foreground mt-1">{exam.descripcion}</p>}
                                </div>
                                {showPrice && (
                                  <p className="font-semibold text-primary whitespace-nowrap ml-4">{formatCurrency(exam.valor)}</p>
                                )}
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}

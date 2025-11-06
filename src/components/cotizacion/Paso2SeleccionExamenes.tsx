
"use client";

import { useEffect, useState, useMemo } from 'react';
import type { Examen } from '@/lib/types';
import { getExams } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

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

 const { examsByCategory, mainCategories } = useMemo(() => {
    const categoriesMap: Record<string, Record<string, Examen[]>> = {};

    allExams.forEach(exam => {
        const mainCategory = exam.categoria.split('/')[0].trim();
        const fullCategory = exam.categoria;

        if (!categoriesMap[mainCategory]) {
            categoriesMap[mainCategory] = {};
        }
        if (!categoriesMap[mainCategory][fullCategory]) {
            categoriesMap[mainCategory][fullCategory] = [];
        }
        categoriesMap[mainCategory][fullCategory].push(exam);
    });
    
    const sortedMainCategories = Object.keys(categoriesMap).sort((a, b) => a.localeCompare(b));
    
    return { examsByCategory: categoriesMap, mainCategories: sortedMainCategories };
  }, [allExams]);
  
  const selectedExamIds = new Set(selectedExams.map(e => e.id));

  const handleCategoryToggle = (categoryExams: Examen[], checked: boolean) => {
    categoryExams.forEach(exam => {
        // To prevent duplicate handling if an exam is already in the desired state
        if (checked !== selectedExamIds.has(exam.id)) {
            onExamToggle(exam, checked);
        }
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };
  
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4 mb-4" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
        <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
                {mainCategories.map(mainCategory => (
                    <div key={mainCategory}>
                        <h3 className="text-lg font-semibold text-foreground mb-3">{mainCategory}</h3>
                        <Card>
                            <CardContent className="p-2 space-y-1">
                                {Object.entries(examsByCategory[mainCategory]).map(([fullCategory, categoryExams]) => {
                                    const totalCategoryValue = categoryExams.reduce((acc, exam) => acc + exam.valor, 0);
                                    const isCategorySelected = categoryExams.every(exam => selectedExamIds.has(exam.id));
                                    
                                    return (
                                        <div key={fullCategory} className="flex items-start space-x-3 rounded-md p-3 transition-colors hover:bg-accent/50">
                                            <Checkbox
                                                id={fullCategory}
                                                checked={isCategorySelected}
                                                onCheckedChange={(checked) => handleCategoryToggle(categoryExams, !!checked)}
                                                className="mt-1"
                                            />
                                            <Label htmlFor={fullCategory} className="flex-grow font-normal cursor-pointer">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium text-foreground leading-tight">{fullCategory}</p>
                                                        <p className="text-xs text-muted-foreground">{categoryExams.length} examen(es) incluido(s)</p>
                                                    </div>
                                                    {showPrice && (
                                                        <p className="font-semibold text-primary whitespace-nowrap ml-4">{formatCurrency(totalCategoryValue)}</p>
                                                    )}
                                                </div>
                                            </Label>
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>
        </ScrollArea>
    </div>
  );
}

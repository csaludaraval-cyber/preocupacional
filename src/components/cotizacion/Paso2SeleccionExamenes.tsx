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
import { AlertCircle, SearchX } from 'lucide-react';

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
        console.log("Exámenes cargados desde DB:", examsData.length); // Debug
        setAllExams(examsData);
      } catch (error) {
        console.error("Failed to load exams:", error);
        toast({
          variant: "destructive",
          title: "Error de Carga",
          description: "No se pudo conectar con el catálogo de exámenes.",
        });
      } finally {
        setLoading(false);
      }
    }
    loadExams();
  }, [toast]);

 const { examsByCategory, mainCategories } = useMemo(() => {
    const categoriesMap: Record<string, Record<string, Examen[]>> = {};

    if (!allExams || allExams.length === 0) {
        return { examsByCategory: {}, mainCategories: [] };
    }

    allExams.forEach(exam => {
        // PROTECCIÓN: Si la categoría no existe, asignamos "Sin Categoría"
        const catRaw = exam.categoria || "Otros / General";
        const mainCategory = catRaw.split('/')[0].trim() || "General";
        const fullCategory = catRaw;

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
        <Card><CardContent className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </CardContent></Card>
      </div>
    );
  }

  // MENSAJE DE ERROR SI NO HAY DATOS
  if (mainCategories.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-slate-50 text-slate-500">
            <SearchX className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No se encontraron exámenes</p>
            <p className="text-sm">Verifica que la colección 'examenes' en Firestore tenga datos.</p>
        </div>
    );
  }

  return (
    <div className="w-full">
        <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
                {mainCategories.map(mainCategory => (
                    <div key={mainCategory}>
                        <h3 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider">{mainCategory}</h3>
                        <Card className="border-slate-200 shadow-sm">
                            <CardContent className="p-2 space-y-1">
                                {Object.entries(examsByCategory[mainCategory]).map(([fullCategory, categoryExams]) => {
                                    const totalCategoryValue = categoryExams.reduce((acc, exam) => acc + (Number(exam.valor) || 0), 0);
                                    const isCategorySelected = categoryExams.every(exam => selectedExamIds.has(exam.id));
                                    
                                    return (
                                        <div key={fullCategory} className="flex items-start space-x-3 rounded-md p-3 transition-colors hover:bg-slate-100">
                                            <Checkbox
                                                id={fullCategory}
                                                checked={isCategorySelected}
                                                onCheckedChange={(checked) => handleCategoryToggle(categoryExams, !!checked)}
                                                className="mt-1"
                                            />
                                            <Label htmlFor={fullCategory} className="flex-grow font-normal cursor-pointer">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1">
                                                        <p className="font-semibold text-slate-900 leading-tight">{fullCategory}</p>
                                                        <p className="text-xs text-slate-500">{categoryExams.length} examen(es) en esta batería</p>
                                                    </div>
                                                    {showPrice && (
                                                        <p className="font-bold text-primary whitespace-nowrap ml-4">{formatCurrency(totalCategoryValue)}</p>
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
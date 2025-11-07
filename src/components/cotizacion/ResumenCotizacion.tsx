
"use client";

import { List, Trash2, Sparkles } from 'lucide-react';
import type { Examen } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface Props {
  selectedExams: Examen[];
  onClear: () => void;
  onGenerate: () => void;
  isStep1: boolean;
  isFrecuente?: boolean;
}

export default function ResumenCotizacion({ selectedExams, onClear, onGenerate, isStep1, isFrecuente = false }: Props) {
  const total = selectedExams.reduce((acc, exam) => acc + exam.valor, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  return (
    <Card className="sticky top-24 shadow-md">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <List className="h-5 w-5 text-primary" />
          Resumen
        </CardTitle>
        {selectedExams.length > 0 && (
          <Button variant="ghost" size="icon" onClick={onClear} className="h-8 w-8">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="min-h-[150px]">
        {selectedExams.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {selectedExams.map((exam, index) => (
              <li key={`${exam.id}-${index}`} className="flex justify-between items-center">
                <span className="text-muted-foreground truncate pr-2">{exam.nombre}</span>
                <span className="font-medium text-foreground whitespace-nowrap">{formatCurrency(exam.valor)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center justify-center h-full text-center text-muted-foreground">
            <p>{isStep1 ? "Complete los datos generales para continuar." : "Seleccione exámenes del catálogo para añadirlos aquí."}</p>
          </div>
        )}
      </CardContent>
      <Separator />
      <CardFooter className="flex-col items-stretch p-4">
        <div className="flex justify-between items-center text-lg font-bold mb-4">
          <span className="text-foreground">Total (Exento)</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
        <Button
          onClick={onGenerate}
          disabled={selectedExams.length === 0}
          className="bg-accent text-accent-foreground hover:bg-accent/90 w-full"
        >
          <Sparkles className="mr-2 h-4 w-4" />
           {isFrecuente ? 'Guardar Orden Acumulable' : 'Generar Cotización Formal'}
        </Button>
      </CardFooter>
    </Card>
  );
}

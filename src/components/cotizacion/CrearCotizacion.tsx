"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Send, Sparkles } from 'lucide-react';
import type { Empresa, Examen, Trabajador } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import Paso1DatosGenerales from './Paso1DatosGenerales';
import Paso2SeleccionExamenes from './Paso2SeleccionExamenes';
import ResumenCotizacion from './ResumenCotizacion';

const initialEmpresa: Empresa = { razonSocial: '', rut: '', direccion: '' };
const initialTrabajador: Trabajador = { nombre: '', rut: '', cargo: '', centroDeCostos: '', mail: '' };

export function CrearCotizacion() {
  const [step, setStep] = useState(1);
  const [empresa, setEmpresa] = useState<Empresa>(initialEmpresa);
  const [trabajador, setTrabajador] = useState<Trabajador>(initialTrabajador);
  const [selectedExams, setSelectedExams] = useState<Examen[]>([]);
  const router = useRouter();

  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;

  const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleExamToggle = (exam: Examen, checked: boolean) => {
    setSelectedExams(prev =>
      checked ? [...prev, exam] : prev.filter(e => e.id !== exam.id)
    );
  };

  const handleClearSelection = () => {
    setSelectedExams([]);
  };

  const handleGenerateQuote = () => {
    const total = selectedExams.reduce((acc, exam) => acc + exam.valor, 0);
    const quoteData = {
      empresa,
      trabajador,
      examenes: selectedExams,
      total,
      fecha: new Date().toLocaleDateString('es-CL'),
    };
    const query = encodeURIComponent(JSON.stringify(quoteData));
    router.push(`/cotizacion?data=${query}`);
  };

  const steps = [
    {
      id: 1,
      name: "Datos Generales",
      component: <Paso1DatosGenerales empresa={empresa} setEmpresa={setEmpresa} trabajador={trabajador} setTrabajador={setTrabajador} />,
    },
    {
      id: 2,
      name: "Selección de Exámenes",
      component: <Paso2SeleccionExamenes selectedExams={selectedExams} onExamToggle={handleExamToggle} />,
    },
  ];

  const currentStepData = steps.find(s => s.id === step);

  return (
    <div className="space-y-8">
        <div className="text-center">
            <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Crear Nueva Cotización
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Siga los pasos para generar una cotización de forma rápida y sencilla.
            </p>
        </div>

      <Card className="border-2 border-primary/20 shadow-lg">
        <CardContent className="p-6">
          <div className="mb-6 space-y-4">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between font-medium text-sm text-muted-foreground">
                <span>Paso {step} de {totalSteps}</span>
                <span className="font-bold text-foreground">{currentStepData?.name}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentStepData?.component}
                </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="lg:col-span-1">
              <ResumenCotizacion 
                selectedExams={selectedExams} 
                onClear={handleClearSelection}
                onGenerate={handleGenerateQuote}
                isStep1={step === 1}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={prevStep} disabled={step === 1}>
              <ArrowLeft className="mr-2" /> Anterior
            </Button>
            {step < totalSteps && (
              <Button onClick={nextStep} className="bg-primary hover:bg-primary/90">
                Siguiente <ArrowRight className="ml-2" />
              </Button>
            )}
             {step === totalSteps && (
              <Button onClick={handleGenerateQuote} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Sparkles className="mr-2" /> Generar Cotización
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

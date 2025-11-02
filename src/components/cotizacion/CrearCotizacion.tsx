
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import type { Empresa, Examen, Trabajador, Cotizacion, SolicitudTrabajador } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

import Paso1DatosGenerales from './Paso1DatosGenerales';
import Paso2SeleccionExamenes from './Paso2SeleccionExamenes';
import ResumenCotizacion from './ResumenCotizacion';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const initialEmpresa: Empresa = { razonSocial: '', rut: '', direccion: '' };
const initialTrabajador: Trabajador = { nombre: '', rut: '', cargo: '', centroDeCostos: '', mail: '' };

export function CrearCotizacion() {
  const [step, setStep] = useState(1);
  const [empresa, setEmpresa] = useState<Empresa>(initialEmpresa);
  const [solicitante, setSolicitante] = useState<Trabajador>(initialTrabajador);
  // We now manage a list of solicitudes (worker + their exams)
  const [solicitudes, setSolicitudes] = useState<SolicitudTrabajador[]>([{id: 'default', trabajador: solicitante, examenes: []}]);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const allExams = solicitudes.flatMap(s => s.examenes);

  useEffect(() => {
    const solicitudData = searchParams.get('solicitud');
    if (solicitudData) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(solicitudData));
        setEmpresa(parsedData.empresa || initialEmpresa);
        setSolicitante(parsedData.solicitante || initialTrabajador);
        
        // If the incoming data has the new structure, use it.
        if (parsedData.solicitudes && parsedData.solicitudes.length > 0) {
            setSolicitudes(parsedData.solicitudes);
        } else {
           // Fallback for old structure for safety, though it should be deprecated.
           const allExams = parsedData.examenes || [];
           const allWorkers = parsedData.trabajadores || [parsedData.solicitante];
           const newSolicitudes = allWorkers.map((trabajador: Trabajador, index: number) => ({
               id: String(index),
               trabajador,
               examenes: allExams, // This is not ideal, but it's a fallback.
           }));
           setSolicitudes(newSolicitudes);
        }

        toast({
            title: "Solicitud Cargada",
            description: "Los datos de la solicitud se han cargado en el formulario."
        })
      } catch (error) {
        console.error("Error parsing solicitud data:", error);
        toast({
            title: "Error al cargar solicitud",
            description: "No se pudieron cargar los datos. Por favor, inténtelo manualmente.",
            variant: "destructive"
        })
      }
    }
  }, [searchParams, toast]);

  useEffect(() => {
    // Sync solicitante with the first worker in the list
    if (solicitudes.length > 0 && solicitudes[0].trabajador) {
        setSolicitante(solicitudes[0].trabajador);
    }
  }, [solicitudes]);

  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;

  const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleExamToggle = (exam: Examen, checked: boolean) => {
    // For a single-worker quote, we just update the first solicitud
    const newSolicitudes = [...solicitudes];
    const currentExams = newSolicitudes[0].examenes;
    newSolicitudes[0].examenes = checked
        ? [...currentExams, exam]
        : currentExams.filter(e => e.id !== exam.id);
    setSolicitudes(newSolicitudes);
  };

  const handleClearSelection = () => {
    // Clear exams from all solicitudes
    setSolicitudes(solicitudes.map(s => ({...s, examenes: []})));
  };

  const handleGenerateQuote = () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error de Autenticación',
        description: 'Debes estar autenticado para crear una cotización.'
      });
      return;
    }

    const total = allExams.reduce((acc, exam) => acc + exam.valor, 0);

    const newQuoteFirestore = {
      empresaId: empresa.rut,
      solicitanteId: user.uid,
      fechaCreacion: serverTimestamp(),
      total: total,
      empresaData: empresa,
      solicitanteData: solicitante, // The main contact
      solicitudesData: solicitudes, // The detailed list of workers and their exams
    };

    const cotizacionesRef = collection(firestore, 'cotizaciones');
    addDoc(cotizacionesRef, newQuoteFirestore)
      .then(docRef => {
        const quoteForDisplay: Cotizacion = {
          id: docRef.id,
          empresa,
          solicitante: solicitante,
          solicitudes: solicitudes,
          total,
          fecha: new Date().toLocaleDateString('es-CL'),
        };

        const query = encodeURIComponent(JSON.stringify(quoteForDisplay));
        router.push(`/cotizacion?data=${query}`);
      })
      .catch(error => {
        const permissionError = new FirestorePermissionError({
            path: cotizacionesRef.path,
            operation: 'create',
            requestResourceData: newQuoteFirestore,
        });
        errorEmitter.emit('permission-error', permissionError);

        toast({
            variant: 'destructive',
            title: 'Error de Permiso',
            description: 'No se pudo guardar la cotización. Revisa los permisos.'
        });
      });
  };

  const steps = [
    {
      id: 1,
      name: "Datos Generales",
      component: <Paso1DatosGenerales empresa={empresa} setEmpresa={setEmpresa} trabajador={solicitante} setTrabajador={setSolicitante} />,
    },
    {
      id: 2,
      name: "Selección de Exámenes",
      // When creating a quote from scratch, we assume one "solicitud" to add exams to.
      component: <Paso2SeleccionExamenes selectedExams={solicitudes[0]?.examenes || []} onExamToggle={handleExamToggle} showPrice={true} />,
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
                selectedExams={allExams} 
                onClear={handleClearSelection}
                onGenerate={handleGenerateQuote}
                isStep1={step === 1}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={prevStep} disabled={step === 1}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            {step < totalSteps && (
              <Button onClick={nextStep} className="bg-primary hover:bg-primary/90">
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
             {step === totalSteps && (
              <Button onClick={handleGenerateQuote} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Sparkles className="mr-2 h-4 w-4" /> Generar Cotización
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

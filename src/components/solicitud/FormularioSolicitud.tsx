"use client";

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Send, Sparkles, PlusCircle, Trash2, Users, FileText } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Empresa, Examen, Trabajador, SolicitudTrabajador } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import Paso1DatosGenerales from '@/components/cotizacion/Paso1DatosGenerales';
import Paso2SeleccionExamenes from '@/components/cotizacion/Paso2SeleccionExamenes';


const initialEmpresa: Empresa = { razonSocial: '', rut: '', direccion: '' };
const initialTrabajador: Trabajador = { nombre: '', rut: '', cargo: '', centroDeCostos: '', mail: '' };


export function FormularioSolicitud() {
  const [step, setStep] = useState(1);
  const [empresa, setEmpresa] = useState<Empresa>(initialEmpresa);
  
  const [solicitudes, setSolicitudes] = useState<SolicitudTrabajador[]>([
    { id: crypto.randomUUID(), trabajador: initialTrabajador, examenes: [] }
  ]);
  const [currentSolicitudIndex, setCurrentSolicitudIndex] = useState(0);

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;

  const currentSolicitud = solicitudes[currentSolicitudIndex];
  const isEditingCompany = currentSolicitudIndex === 0;

  const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const updateCurrentTrabajador = (trabajador: Trabajador) => {
    const newSolicitudes = [...solicitudes];
    newSolicitudes[currentSolicitudIndex].trabajador = trabajador;
    setSolicitudes(newSolicitudes);
  };
  
  const handleExamToggle = (exam: Examen, checked: boolean) => {
    const newSolicitudes = [...solicitudes];
    const currentExams = newSolicitudes[currentSolicitudIndex].examenes;
    newSolicitudes[currentSolicitudIndex].examenes = checked
      ? [...currentExams, exam]
      : currentExams.filter(e => e.id !== exam.id);
    setSolicitudes(newSolicitudes);
  };

  const addTrabajador = () => {
    // Go back to step 1 to enter new worker data
    setStep(1); 
    const newId = crypto.randomUUID();
    const newSolicitud: SolicitudTrabajador = { id: newId, trabajador: initialTrabajador, examenes: [] };
    setSolicitudes(prev => [...prev, newSolicitud]);
    setCurrentSolicitudIndex(solicitudes.length);
  };

  const removeTrabajador = (indexToRemove: number) => {
    if (solicitudes.length <= 1) {
        toast({ title: "Acción no permitida", description: "Debe haber al menos un trabajador.", variant: "destructive" });
        return;
    }
    setSolicitudes(prev => prev.filter((_, index) => index !== indexToRemove));
    // If we are removing the currently selected worker, move to the previous one
    if (currentSolicitudIndex >= indexToRemove) {
      setCurrentSolicitudIndex(prev => Math.max(0, prev - 1));
    }
  };

  const selectTrabajador = (index: number) => {
    setCurrentSolicitudIndex(index);
    setStep(1); // Go back to step 1 to edit this worker
  }


  const handleSendRequest = async () => {
     setIsSubmitting(true);
     
     if (!empresa.razonSocial || !empresa.rut) {
        toast({ title: "Datos incompletos", description: "La Razón Social y el RUT de la empresa son obligatorios.", variant: "destructive"});
        setIsSubmitting(false);
        setStep(1); // Go to step 1 to fix
        return;
     }

     if (solicitudes.some(s => !s.trabajador.nombre || !s.trabajador.rut)) {
        toast({ title: "Datos incompletos", description: "El nombre y RUT de cada trabajador son obligatorios.", variant: "destructive"});
        setIsSubmitting(false);
        setStep(1); // Go to step 1 to fix
        return;
     }

     if (solicitudes.every(s => s.examenes.length === 0)) {
        toast({ title: "Sin exámenes", description: "Debe seleccionar al menos un examen para un trabajador.", variant: "destructive"});
        setIsSubmitting(false);
        setStep(2); // Go to step 2 to fix
        return;
     }

    const submissionData = {
      empresa: empresa,
      solicitudes: solicitudes.map(s => ({
        trabajador: s.trabajador,
        examenes: s.examenes.map(({ id, nombre, categoria, subcategoria, valor }) => ({ id, nombre, categoria, subcategoria, valor })) // Send relevant exam data
      })),
      fechaCreacion: serverTimestamp(),
      estado: 'pendiente',
    };

    try {
      const collectionRef = collection(firestore, 'solicitudes_publicas');
      await addDoc(collectionRef, submissionData);
      setFormSubmitted(true);
    } catch (error) {
      console.error("Error submitting request:", error);
      toast({
        title: "Error en el envío",
        description: "No se pudo enviar su solicitud. Por favor, inténtelo de nuevo más tarde.",
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (formSubmitted) {
    return (
        <Alert className="max-w-2xl mx-auto border-green-500">
            <Sparkles className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-xl font-headline text-green-700">¡Solicitud Enviada!</AlertTitle>
            <AlertDescription className="text-green-600">
                Gracias por su solicitud. Nuestro equipo la revisará y se pondrá en contacto con usted a la brevedad para enviar la cotización formal.
            </AlertDescription>
        </Alert>
    )
  }
  
  const totalExams = useMemo(() => solicitudes.reduce((acc, s) => acc + s.examenes.length, 0), [solicitudes]);

  const steps = [
    {
      id: 1,
      name: "Datos Empresa y Trabajador",
      component: <Paso1DatosGenerales empresa={empresa} setEmpresa={setEmpresa} trabajador={currentSolicitud.trabajador} setTrabajador={updateCurrentTrabajador} />,
    },
    {
      id: 2,
      name: "Selección de Exámenes",
      component: <Paso2SeleccionExamenes selectedExams={currentSolicitud.examenes} onExamToggle={handleExamToggle} showPrice={false}/>,
    },
  ];

  const currentStepData = steps.find(s => s.id === step);

  return (
    <div className="space-y-8">
        <div className="text-center">
            <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Solicitud de Exámenes
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Complete los datos para generar una solicitud. Nuestro equipo la convertirá en una cotización formal.
            </p>
        </div>

      <Card className="border-2 border-primary/20 shadow-lg">
        <CardContent className="p-6">
          <div className="mb-6 space-y-4">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between font-medium text-sm text-muted-foreground">
                <span>Paso {step} de {totalSteps}</span>
                <span className="font-bold text-foreground">{currentStepData?.name} para el trabajador {currentSolicitudIndex + 1}</span>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            <div className="md:col-span-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${step}-${currentSolicitudIndex}`}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentStepData?.component}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="md:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-headline flex items-center gap-2"><Users className="h-5 w-5 text-primary"/> Trabajadores ({solicitudes.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {solicitudes.map((s, index) => (
                    <div key={s.id} className="flex items-center justify-between gap-2">
                      <Button variant={index === currentSolicitudIndex ? 'secondary' : 'ghost'} size="sm" className="flex-grow justify-start" onClick={() => selectTrabajador(index)}>
                          {s.trabajador.nombre || `Trabajador ${index + 1}`}
                      </Button>
                      {solicitudes.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeTrabajador(index)}>
                          <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={addTrabajador}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Trabajador
                  </Button>
                </CardContent>
              </Card>

               <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-headline flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/> Resumen Solicitud</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Ha añadido <span className="font-bold text-foreground">{solicitudes.length}</span> trabajador(es) con un total de <span className="font-bold text-foreground">{totalExams}</span> exámenes.
                      </p>
                  </CardContent>
                </Card>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={prevStep} disabled={step === 1}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            
            <div className="flex gap-2">
              {step < totalSteps && (
                <Button onClick={nextStep} className="bg-primary hover:bg-primary/90">
                  Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              
              <Button onClick={handleSendRequest} disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {isSubmitting ? 'Enviando...' : <><Send className="mr-2 h-4 w-4" /> Enviar Solicitud Completa</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

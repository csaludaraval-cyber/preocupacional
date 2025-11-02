"use client";

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Send, Sparkles, PlusCircle, Trash2, ServerCrash } from 'lucide-react';
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
  
  // Manage multiple workers
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
    setSolicitudes([...solicitudes, { id: crypto.randomUUID(), trabajador: initialTrabajador, examenes: [] }]);
    setCurrentSolicitudIndex(solicitudes.length);
  };

  const removeTrabajador = (index: number) => {
    if (solicitudes.length <= 1) {
        toast({ title: "Acción no permitida", description: "Debe haber al menos un trabajador.", variant: "destructive" });
        return;
    }
    const newSolicitudes = solicitudes.filter((_, i) => i !== index);
    setSolicitudes(newSolicitudes);
    setCurrentSolicitudIndex(Math.max(0, index - 1));
  };


  const handleSendRequest = async () => {
     setIsSubmitting(true);
     
     if (!empresa.razonSocial || !empresa.rut) {
        toast({ title: "Datos incompletos", description: "La Razón Social y el RUT de la empresa son obligatorios.", variant: "destructive"});
        setIsSubmitting(false);
        return;
     }

     if (solicitudes.some(s => !s.trabajador.nombre || !s.trabajador.rut)) {
        toast({ title: "Datos incompletos", description: "El nombre y RUT de cada trabajador son obligatorios.", variant: "destructive"});
        setIsSubmitting(false);
        return;
     }

     if (solicitudes.every(s => s.examenes.length === 0)) {
        toast({ title: "Sin exámenes", description: "Debe seleccionar al menos un examen para un trabajador.", variant: "destructive"});
        setIsSubmitting(false);
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

  const steps = [
    {
      id: 1,
      name: "Datos Generales",
      component: <Paso1DatosGenerales empresa={empresa} setEmpresa={setEmpresa} trabajador={currentSolicitud.trabajador} setTrabajador={updateCurrentTrabajador} />,
    },
    {
      id: 2,
      name: "Selección de Exámenes",
      component: <Paso2SeleccionExamenes selectedExams={currentSolicitud.examenes} onExamToggle={handleExamToggle} />,
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
                <span className="font-bold text-foreground">{currentStepData?.name}</span>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                {currentStepData?.id === 1 && (
                     <Alert className="mb-6">
                        <ServerCrash className="h-4 w-4" />
                        <AlertTitle>Información del Trabajador</AlertTitle>
                        <AlertDescription>
                           Está editando los datos para el <strong>Trabajador {currentSolicitudIndex + 1} de {solicitudes.length}</strong>. Use los botones de abajo para añadir más trabajadores a esta solicitud.
                        </AlertDescription>
                    </Alert>
                )}
                {currentStepData?.component}
              </motion.div>
            </AnimatePresence>
          </div>

          {solicitudes.length > 1 && (
            <div className="my-4 flex items-center gap-2 flex-wrap">
              {solicitudes.map((s, index) => (
                <Button key={s.id} variant={index === currentSolicitudIndex ? 'default' : 'outline'} size="sm" onClick={() => setCurrentSolicitudIndex(index)}>
                  Trabajador {index + 1}
                   <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={(e) => { e.stopPropagation(); removeTrabajador(index); }}>
                      <Trash2 className="h-3 w-3 text-destructive"/>
                   </Button>
                </Button>
              ))}
            </div>
          )}

           <div className="mt-8 flex justify-between">
            {step === 1 ? (
                 <Button variant="outline" onClick={addTrabajador}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Trabajador
                </Button>
            ): (
                <Button variant="outline" onClick={prevStep} disabled={step === 1}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
                </Button>
            )}

            {step < totalSteps ? (
              <Button onClick={nextStep} className="bg-primary hover:bg-primary/90">
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ): (
              <Button onClick={handleSendRequest} disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {isSubmitting ? 'Enviando...' : <><Send className="mr-2 h-4 w-4" /> Enviar Solicitud</>}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

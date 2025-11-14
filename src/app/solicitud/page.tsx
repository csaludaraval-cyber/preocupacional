
"use client";

import { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Send, PlusCircle, Trash2, Users, FileText, Loader2, ShieldCheck, Building } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Empresa, Examen, SolicitudTrabajador, Solicitante } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cleanRut, formatRut } from '@/lib/utils';
import Paso1DatosGenerales from '@/components/cotizacion/Paso1DatosGenerales';
import Paso2SeleccionExamenes from '@/components/cotizacion/Paso2SeleccionExamenes';

const BATERIA_HEFAISTOS_MOCK: Examen = {
  id: 'MOCK-001',
  codigo: 'BAT-HEF',
  nombre: 'Batería de Exámenes Hefaistos',
  categoria: 'Exámenes Ocupacionales / Minería',
  valor: 75000, 
};

const initialEmpresa: Empresa = { rut: '', razonSocial: '', direccion: '', giro: '', ciudad: '', comuna: '', region: '', email: '' };
const initialSolicitante: Solicitante = { nombre: '', rut: '', cargo: '', centroDeCostos: '', mail: '' };

// Define el tipo sin el ID para la inicialización
const initialSolicitudTemplate: Omit<SolicitudTrabajador, 'id'> = { 
    trabajador: { nombre: '', rut: '', cargo: '', fechaNacimiento: '', fechaAtencion: '' },
    examenes: [] 
};


export default function SolicitudPage() {
  const [step, setStep] = useState(1);
  const [empresa, setEmpresa] = useState<Empresa>(initialEmpresa);
  const [solicitante, setSolicitante] = useState<Solicitante>(initialSolicitante);
  
  const [solicitudes, setSolicitudes] = useState<SolicitudTrabajador[]>([]);
  const [currentSolicitudIndex, setCurrentSolicitudIndex] = useState(0);

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();

  const [rutEmpresa, setRutEmpresa] = useState('');
  const [isClienteFrecuente, setIsClienteFrecuente] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  // Garantiza que la inicialización con IDs aleatorios solo ocurra en el cliente
  useEffect(() => {
    setSolicitudes([{ ...initialSolicitudTemplate, id: crypto.randomUUID() }]);
  }, []);

  const totalExams = useMemo(() => solicitudes.reduce((acc, s) => acc + s.examenes.length, 0), [solicitudes]);
  const currentSolicitud = solicitudes[currentSolicitudIndex];


  // Auto-fill company data when validation finds a frequent client
  const handleValidateRut = async () => {
    if (!rutEmpresa) return;
    setIsValidating(true);
    const cleanedRut = cleanRut(rutEmpresa);
    try {
        const empresaRef = doc(firestore, 'empresas', cleanedRut);
        const docSnap = await getDoc(empresaRef);
        if (docSnap.exists()) {
            const data = docSnap.data() as Empresa;
            if (data.modalidadFacturacion === 'frecuente') {
                setEmpresa(data);
                setIsClienteFrecuente(true);
                // Auto-select mock exam for all workers
                setSolicitudes(prev => prev.map(s => ({ ...s, examenes: [BATERIA_HEFAISTOS_MOCK] })));
                toast({
                    title: 'Cliente Frecuente Detectado',
                    description: `Se han cargado los datos de ${data.razonSocial} y la batería de exámenes predeterminada.`,
                });
            } else {
                 toast({ title: 'Cliente Estándar', description: 'Este cliente no opera bajo la modalidad frecuente. Continúe con la solicitud normal.' });
                 setIsClienteFrecuente(false);
                 setEmpresa(data);
            }
        } else {
             toast({ variant: 'destructive', title: 'Empresa no encontrada', description: 'El RUT no corresponde a un cliente frecuente registrado. Continúe como cliente normal.' });
             setIsClienteFrecuente(false);
        }
    } catch (error) {
        console.error("Error validating RUT:", error);
        toast({ variant: 'destructive', title: 'Error de Validación', description: 'No se pudo verificar el RUT.' });
    } finally {
        setIsValidating(false);
    }
  };


  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;

  const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const updateCurrentSolicitud = (newSolicitud: Partial<SolicitudTrabajador>) => {
    const newSolicitudes = [...solicitudes];
    newSolicitudes[currentSolicitudIndex] = { ...newSolicitudes[currentSolicitudIndex], ...newSolicitud };
    setSolicitudes(newSolicitudes);
  };
  
  const handleExamToggle = (exam: Examen, checked: boolean) => {
    if (isClienteFrecuente) {
        toast({ title: "Acción no permitida", description: "Los exámenes para clientes frecuentes son fijos."});
        return;
    }
    const currentExams = currentSolicitud.examenes;
    const newExams = checked
      ? [...currentExams, exam]
      : currentExams.filter(e => e.id !== exam.id);
    updateCurrentSolicitud({ examenes: newExams });
  };

  const addTrabajador = () => {
    setStep(1); 
    const newId = crypto.randomUUID();
    const newExams = isClienteFrecuente ? [BATERIA_HEFAISTOS_MOCK] : [];
    const newSolicitud: SolicitudTrabajador = { 
        id: newId, 
        trabajador: { nombre: '', rut: '', cargo: '', fechaNacimiento: '', fechaAtencion: '' }, 
        examenes: newExams 
    };
    setSolicitudes(prev => [...prev, newSolicitud]);
    setCurrentSolicitudIndex(solicitudes.length);
  };

  const removeTrabajador = (indexToRemove: number) => {
    if (solicitudes.length <= 1) {
        toast({ title: "Acción no permitida", description: "Debe haber al menos un trabajador.", variant: "destructive" });
        return;
    }
    setSolicitudes(prev => prev.filter((_, index) => index !== indexToRemove));
    if (currentSolicitudIndex >= indexToRemove && currentSolicitudIndex > 0) {
      setCurrentSolicitudIndex(prev => prev - 1);
    }
  };

  const selectTrabajador = (index: number) => {
    setCurrentSolicitudIndex(index);
    setStep(1);
  }

  const handleSendRequest = async () => {
     setIsSubmitting(true);
     
     if (!empresa.razonSocial || !empresa.rut) {
        toast({ title: "Datos incompletos", description: "La Razón Social y el RUT de la empresa son obligatorios.", variant: "destructive"});
        setIsSubmitting(false);
        setStep(1);
        return;
     }
     
     if (!solicitante.nombre || !solicitante.mail) {
        toast({ title: "Datos incompletos", description: "El nombre y el email del solicitante son obligatorios.", variant: "destructive"});
        setIsSubmitting(false);
        setStep(1);
        return;
     }

     if (solicitudes.some(s => !s.trabajador.nombre || !s.trabajador.rut)) {
        toast({ title: "Datos incompletos", description: "El nombre y RUT de cada trabajador son obligatorios.", variant: "destructive"});
        setIsSubmitting(false);
        setStep(1);
        return;
     }

     if (solicitudes.every(s => s.examenes.length === 0)) {
        toast({ title: "Sin exámenes", description: "Debe seleccionar al menos un examen para un trabajador.", variant: "destructive"});
        setIsSubmitting(false);
        setStep(2);
        return;
     }

    const submissionData = {
      empresa: { ...empresa, rut: cleanRut(empresa.rut) },
      solicitante: solicitante,
      solicitudes: solicitudes.map(s => ({
          ...s,
          trabajador: {
              ...s.trabajador,
              // Sanitize date fields before submission
              fechaAtencion: s.trabajador.fechaAtencion || null,
          }
      })),
      fechaCreacion: serverTimestamp(),
      estado: isClienteFrecuente ? 'orden_examen_enviada' : 'pendiente',
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
  
  const steps = [
    {
      id: 1,
      name: "Datos Empresa y Trabajador",
      component: currentSolicitud ? <Paso1DatosGenerales 
        empresa={empresa} 
        setEmpresa={setEmpresa} 
        solicitante={solicitante} 
        setSolicitante={setSolicitante} 
        trabajador={currentSolicitud.trabajador} 
        setTrabajador={(trabajador) => updateCurrentSolicitud({ trabajador })} /> : null,
    },
    {
      id: 2,
      name: "Selección de Exámenes",
      component: <Paso2SeleccionExamenes selectedExams={currentSolicitud?.examenes || []} onExamToggle={handleExamToggle} showPrice={false}/>,
    },
  ];

  const currentStepData = steps.find(s => s.id === step);

  if (solicitudes.length === 0) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (formSubmitted) {
    return (
        <Alert className="max-w-2xl mx-auto border-accent">
            <Send className="h-5 w-5 text-accent-foreground" />
            <AlertTitle className="text-xl font-headline text-accent-foreground">¡Solicitud Enviada!</AlertTitle>
            <AlertDescription className="text-muted-foreground">
                {isClienteFrecuente 
                    ? "Su orden de examen ha sido registrada para la facturación consolidada."
                    : "Gracias por su solicitud. Nuestro equipo la revisará y se pondrá en contacto con usted a la brevedad para enviar la cotización formal."
                }
            </AlertDescription>
        </Alert>
    )
  }

  return (
    <div className="space-y-8">
        <div className="text-center">
            <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Solicitud de Exámenes
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {isClienteFrecuente ? "Modo Cliente Frecuente: Ingrese los datos para generar una orden de examen acumulable." : "Complete los datos para generar una solicitud. Nuestro equipo la convertirá en una cotización formal."}
            </p>
        </div>

      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
             <CardTitle>Validación de Cliente Frecuente</CardTitle>
             <CardDescription>Si su empresa está registrada como cliente frecuente, ingrese su RUT para autocompletar los datos y acceder a la carga rápida.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex w-full max-w-sm items-center space-x-2">
                <Input 
                    type="text" 
                    placeholder="RUT de la empresa" 
                    value={rutEmpresa}
                    onChange={(e) => setRutEmpresa(formatRut(e.target.value))}
                    disabled={isValidating || isClienteFrecuente}
                />
                <Button onClick={handleValidateRut} disabled={isValidating || isClienteFrecuente}>
                    {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Validar
                </Button>
            </div>
            {isClienteFrecuente && (
                <Alert className="mt-4 border-green-500 text-green-700">
                    <Building className="h-4 w-4 !text-green-700" />
                    <AlertTitle className="font-semibold">Modo Cliente Frecuente Activado</AlertTitle>
                    <AlertDescription>Los exámenes se han pre-seleccionado automáticamente. Complete los datos de los trabajadores.</AlertDescription>
                </Alert>
            )}
        </CardContent>
      </Card>


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
                {step === 1 && (
                    <Button onClick={nextStep} className="bg-primary hover:bg-primary/90">
                        Seleccionar Exámenes <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
                 {step > 1 && (
                     <Button onClick={addTrabajador} variant="outline">
                        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Otro Trabajador
                    </Button>
                )}
              
              <Button onClick={handleSendRequest} disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {isSubmitting ? 'Enviando...' : <><Send className="mr-2 h-4 w-4" /> {isClienteFrecuente ? 'Enviar Solicitud Acumulable' : 'Enviar Solicitud Completa'}</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

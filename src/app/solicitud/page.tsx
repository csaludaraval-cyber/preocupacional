"use client";

import { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Send, PlusCircle, Trash2, Users, FileText, Loader2, ShieldCheck, Building } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Empresa, Examen, Solicitante, Trabajador } from '@/lib/types';
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
import type { SolicitudTrabajador } from '@/types/models';

const BATERIA_HEFAISTOS_MOCK: Examen = {
  id: 'MOCK-001',
  codigo: 'BAT-HEF',
  nombre: 'Batería de Exámenes Hefaistos',
  categoria: 'Exámenes Ocupacionales / Minería',
  valor: 75000, 
};

const initialEmpresa: Empresa = { rut: '', razonSocial: '', direccion: '', giro: '', ciudad: '', comuna: '', region: '', email: '' };
const initialSolicitante: Solicitante = { nombre: '', rut: '', cargo: '', centroDeCostos: '', mail: '' };

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
  
  useEffect(() => {
    setSolicitudes([{ ...initialSolicitudTemplate, id: crypto.randomUUID() } as SolicitudTrabajador]);
  }, []);

  const totalExams = useMemo(() => solicitudes.reduce((acc, s) => acc + s.examenes.length, 0), [solicitudes]);
  const currentSolicitud = solicitudes[currentSolicitudIndex];

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
                setSolicitudes(prev => prev.map(s => ({ ...s, examenes: [BATERIA_HEFAISTOS_MOCK] })));
                toast({ title: 'Cliente Frecuente Detectado', description: `Se han cargado los datos de ${data.razonSocial}.` });
            } else {
                 toast({ title: 'Cliente Estándar', description: 'Continúe con la solicitud normal.' });
                 setIsClienteFrecuente(false);
                 setEmpresa(data);
            }
        } else {
             toast({ variant: 'destructive', title: 'Empresa no encontrada', description: 'El RUT no corresponde a un cliente frecuente registrado.' });
             setIsClienteFrecuente(false);
        }
    } catch (error) {
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
    setSolicitudes(prev => {
        const newSolicitudes = [...prev];
        newSolicitudes[currentSolicitudIndex] = { ...newSolicitudes[currentSolicitudIndex], ...newSolicitud };
        return newSolicitudes;
    });
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
    const newSolicitud: SolicitudTrabajador = { 
        id: crypto.randomUUID(), 
        trabajador: { nombre: '', rut: '', cargo: '', fechaNacimiento: '', fechaAtencion: '' }, 
        examenes: isClienteFrecuente ? [BATERIA_HEFAISTOS_MOCK] : [] 
    };
    setSolicitudes(prev => [...prev, newSolicitud]);
    setCurrentSolicitudIndex(solicitudes.length);
  };

  const removeTrabajador = (indexToRemove: number) => {
    if (solicitudes.length <= 1) return;
    setSolicitudes(prev => prev.filter((_, index) => index !== indexToRemove));
    if (currentSolicitudIndex >= indexToRemove && currentSolicitudIndex > 0) {
      setCurrentSolicitudIndex(prev => prev - 1);
    }
  };

  const handleSendRequest = async () => {
     setIsSubmitting(true);
     if (!empresa.razonSocial || !empresa.rut || !solicitante.nombre || !solicitante.mail) {
        toast({ title: "Datos incompletos", variant: "destructive"});
        setIsSubmitting(false);
        setStep(1);
        return;
     }

    const submissionData = {
      empresa: { ...empresa, rut: cleanRut(empresa.rut) },
      solicitante,
      solicitudes: solicitudes.map(s => ({ ...s, trabajador: { ...s.trabajador, fechaAtencion: s.trabajador.fechaAtencion || null } })),
      fechaCreacion: serverTimestamp(),
      estado: isClienteFrecuente ? 'orden_examen_enviada' : 'pendiente',
    };

    try {
      await addDoc(collection(firestore, 'solicitudes_publicas'), submissionData);
      setFormSubmitted(true);
    } catch (error) {
      toast({ title: "Error en el envío", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  // FIX QUIRÚRGICO PARA EL ERROR DE TYPESCRIPT:
  // Se crea un manejador que acepta tanto el objeto Trabajador como una función de actualización
  const handleSetTrabajador = (value: React.SetStateAction<Trabajador>) => {
    const nextTrabajador = typeof value === 'function' 
      ? (value as (prev: Trabajador) => Trabajador)(currentSolicitud.trabajador) 
      : value;
    updateCurrentSolicitud({ trabajador: nextTrabajador });
  };

  const steps = [
    {
      id: 1,
      name: "Datos Empresa y Trabajador",
      component: currentSolicitud ? (
        <Paso1DatosGenerales 
          empresa={empresa} 
          setEmpresa={setEmpresa} 
          solicitante={solicitante} 
          setSolicitante={setSolicitante} 
          trabajador={currentSolicitud.trabajador} 
          setTrabajador={handleSetTrabajador} 
        />
      ) : null,
    },
    {
      id: 2,
      name: "Selección de Exámenes",
      component: <Paso2SeleccionExamenes selectedExams={currentSolicitud?.examenes || []} onExamToggle={handleExamToggle} showPrice={false}/>,
    },
  ];

  const currentStepData = steps.find(s => s.id === step);

  if (solicitudes.length === 0) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  if (formSubmitted) {
    return (
        <Alert className="max-w-2xl mx-auto border-accent">
            <Send className="h-5 w-5" />
            <AlertTitle className="text-xl font-headline">¡Solicitud Enviada!</AlertTitle>
            <AlertDescription>Gracias por su solicitud. Nuestro equipo la revisará a la brevedad.</AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-8">
        <div className="text-center">
            <h1 className="font-headline text-3xl font-bold text-primary uppercase">Solicitud de Exámenes</h1>
        </div>

      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
             <CardTitle className='font-headline uppercase text-primary font-bold'>Validación de Cliente Frecuente</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex w-full max-w-sm items-center space-x-2">
                <Input placeholder="RUT de la empresa" value={rutEmpresa} onChange={(e) => setRutEmpresa(formatRut(e.target.value))} disabled={isValidating || isClienteFrecuente} />
                <Button onClick={handleValidateRut} disabled={isValidating || isClienteFrecuente}>
                    {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="mr-2 h-4 w-4" />} Validar
                </Button>
            </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary/20 shadow-lg">
        <CardContent className="p-6">
          <Progress value={progress} className="h-2 mb-6" />
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            <div className="md:col-span-2">
              <AnimatePresence mode="wait">
                <motion.div key={`${step}-${currentSolicitudIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  {currentStepData?.component}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="md:col-span-1 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-lg font-headline flex items-center gap-2"><Users className="h-5 w-5"/> Trabajadores ({solicitudes.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {solicitudes.map((s, index) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Button variant={index === currentSolicitudIndex ? 'secondary' : 'ghost'} size="sm" className="flex-grow justify-start" onClick={() => { setCurrentSolicitudIndex(index); setStep(1); }}>
                          {s.trabajador.nombre || `Trabajador ${index + 1}`}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeTrabajador(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={addTrabajador}><PlusCircle className="mr-2 h-4 w-4" /> Añadir Trabajador</Button>
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={prevStep} disabled={step === 1}><ArrowLeft className="mr-2 h-4 w-4" /> Anterior</Button>
            <div className="flex gap-2">
                {step === 1 && <Button onClick={nextStep}>Seleccionar Exámenes <ArrowRight className="ml-2 h-4 w-4" /></Button>}
                <Button onClick={handleSendRequest} disabled={isSubmitting} className="bg-accent text-accent-foreground">
                    {isSubmitting ? 'Enviando...' : <><Send className="mr-2 h-4 w-4" /> Enviar Solicitud</>}
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
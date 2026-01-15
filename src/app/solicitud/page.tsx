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

// BATERÍA IMAX REAL (Datos obtenidos del catálogo)
const BATERIA_IMAX_REAL: Examen = {
  id: '303001', // ID Real de la batería básica
  codigo: '303001',
  nombre: 'Batería Básica Preocupacional (IMAX)',
  categoria: 'Baterías y Exámenes Ocupacionales',
  valor: 28000, 
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
            setEmpresa(data); // Rellena datos automáticamente
            
            if (data.modalidadFacturacion === 'frecuente') {
                setIsClienteFrecuente(true);
                // Pre-carga Batería IMAX a todas las solicitudes actuales
                setSolicitudes(prev => prev.map(s => ({ ...s, examenes: [BATERIA_IMAX_REAL] })));
                toast({ title: 'Cliente Frecuente Detectado', description: `Datos de ${data.razonSocial} cargados con Batería IMAX.` });
            } else {
                 toast({ title: 'Cliente Estándar', description: 'Datos cargados. Seleccione los exámenes manualmente.' });
                 setIsClienteFrecuente(false);
            }
        } else {
             toast({ variant: 'destructive', title: 'Empresa no encontrada', description: 'Por favor ingrese los datos manualmente.' });
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
    // DESBLOQUEO: Eliminada la restricción 'isClienteFrecuente'
    // Ahora cualquier cliente puede agregar o quitar exámenes libremente
    const currentExams = currentSolicitud.examenes;
    const newExams = checked
      ? [...currentExams, exam]
      : currentExams.filter(e => e.id !== exam.id);
    updateCurrentSolicitud({ examenes: newExams });
  };

  const addTrabajador = () => {
    // Al añadir trabajador, hereda la configuración del cliente (IMAX si es frecuente)
    const newSolicitud: SolicitudTrabajador = { 
        id: crypto.randomUUID(), 
        trabajador: { nombre: '', rut: '', cargo: '', fechaNacimiento: '', fechaAtencion: '' }, 
        examenes: isClienteFrecuente ? [BATERIA_IMAX_REAL] : [] 
    };
    setSolicitudes(prev => [...prev, newSolicitud]);
    setCurrentSolicitudIndex(solicitudes.length); // Ir al nuevo trabajador
    setStep(1); // Volver al paso 1 para llenar sus datos
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
     // Validación básica
     if (!empresa.razonSocial || !empresa.rut || !solicitante.nombre || !solicitante.mail) {
        toast({ title: "Datos incompletos", description: "Complete los datos de Empresa y Solicitante.", variant: "destructive"});
        setIsSubmitting(false);
        setStep(1);
        return;
     }

    const submissionData = {
      empresa: { ...empresa, rut: cleanRut(empresa.rut) },
      solicitante,
      solicitudes: solicitudes.map(s => ({ ...s, trabajador: { ...s.trabajador, fechaAtencion: s.trabajador.fechaAtencion || null } })),
      fechaCreacion: serverTimestamp(),
      estado: isClienteFrecuente ? 'orden_examen_enviada' : 'pendiente', // Los frecuentes saltan directo a orden enviada
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

  if (solicitudes.length === 0) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

  if (formSubmitted) {
    return (
        <Alert className="max-w-2xl mx-auto border-blue-500 bg-blue-50">
            <Send className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-xl font-headline text-blue-800">¡Solicitud Enviada con Éxito!</AlertTitle>
            <AlertDescription className="text-blue-700">
                Hemos recibido su solicitud correctamente. Se ha notificado al equipo de administración.
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-8">
        <div className="text-center">
            <h1 className="font-headline text-3xl font-bold text-slate-800 uppercase">Solicitud de Exámenes</h1>
            <p className="text-slate-500">Complete los datos para generar la orden de atención</p>
        </div>

      {/* Tarjeta de Validación - Ahora más limpia */}
      <Card className="border shadow-md">
        <CardHeader className="pb-3">
             <CardTitle className='font-bold text-sm uppercase text-slate-500'>Validación Cliente Frecuente (Opcional)</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex w-full max-w-md items-center space-x-2">
                <Input 
                    placeholder="Ingrese RUT Empresa (Ej: 76.123.456-7)" 
                    value={rutEmpresa} 
                    onChange={(e) => setRutEmpresa(formatRut(e.target.value))} 
                    disabled={isValidating || isClienteFrecuente}
                    className="border-slate-300"
                />
                <Button 
                    onClick={handleValidateRut} 
                    disabled={isValidating || isClienteFrecuente}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                    {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="mr-2 h-4 w-4" />} 
                    Validar
                </Button>
            </div>
        </CardContent>
      </Card>

      <Card className="border shadow-lg">
        <CardContent className="p-6">
          <Progress value={progress} className="h-2 mb-6 bg-slate-100" indicatorClassName="bg-blue-600"/>
          
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            {/* Columna Izquierda: Formulario Dinámico */}
            <div className="md:col-span-2">
              <AnimatePresence mode="wait">
                <motion.div key={`${step}-${currentSolicitudIndex}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  {currentStepData?.component}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Columna Derecha: Resumen de Trabajadores */}
            <div className="md:col-span-1 space-y-4">
              <Card className="bg-slate-50 border-slate-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
                        <Users className="h-4 w-4"/> Trabajadores ({solicitudes.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {solicitudes.map((s, index) => (
                    <div key={s.id} className={`flex items-center gap-2 p-2 rounded-md ${index === currentSolicitudIndex ? 'bg-white shadow-sm border border-blue-200' : 'hover:bg-white/50'}`}>
                      <Button variant="ghost" size="sm" className="flex-grow justify-start h-auto py-1 font-normal text-slate-700" onClick={() => { setCurrentSolicitudIndex(index); setStep(1); }}>
                          <span className="truncate">{s.trabajador.nombre || `Trabajador ${index + 1}`}</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => removeTrabajador(index)}>
                          <Trash2 className="h-3 w-3"/>
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full mt-2 border-dashed border-slate-300 text-slate-600 hover:bg-white" onClick={addTrabajador}>
                      <PlusCircle className="mr-2 h-3 w-3" /> Añadir Otro Trabajador
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Botonera de Navegación AZUL */}
          <div className="mt-8 flex justify-between pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={prevStep} disabled={step === 1} className="text-slate-600">
                <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            
            <div className="flex gap-2">
                {step === 1 && (
                    <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6">
                        Siguiente: Exámenes <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
                
                {step === 2 && (
                    <Button onClick={handleSendRequest} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8">
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Enviando...</> : <><Send className="mr-2 h-4 w-4" /> Finalizar Solicitud</>}
                    </Button>
                )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
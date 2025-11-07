
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, PlusCircle, Trash2, Users, Building, ShieldCheck } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc, type Timestamp, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import type { Empresa, Examen, Trabajador, Cotizacion, SolicitudTrabajador, Solicitante } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import Paso1DatosGenerales from './Paso1DatosGenerales';
import Paso2SeleccionExamenes from './Paso2SeleccionExamenes';
import ResumenCotizacion from './ResumenCotizacion';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cleanRut } from '@/lib/utils';

const BATERIA_HEFAISTOS_MOCK: Examen = {
  id: 'MOCK-001',
  codigo: 'BAT-HEF',
  nombre: 'Batería de Exámenes Hefaistos',
  categoria: 'Exámenes Ocupacionales / Minería',
  valor: 75000, 
};

const initialEmpresa: Empresa = { razonSocial: '', rut: '', direccion: '', giro: '', ciudad: '', comuna: '', region: '', email: '' };
const initialTrabajador: Trabajador = { nombre: '', rut: '', cargo: '', fechaNacimiento: '', fechaAtencion: '' };
const initialSolicitante: Solicitante = { nombre: '', rut: '', cargo: '', centroDeCostos: '', mail: '' };


export function CrearCotizacion() {
  const [step, setStep] = useState(1);
  const [empresa, setEmpresa] = useState<Empresa>(initialEmpresa);
  const [solicitante, setSolicitante] = useState(initialSolicitante);
  const [solicitudes, setSolicitudes] = useState<SolicitudTrabajador[]>([
    { id: crypto.randomUUID(), trabajador: initialTrabajador, examenes: [] }
  ]);
  const [currentSolicitudIndex, setCurrentSolicitudIndex] = useState(0);

  const [isClienteFrecuente, setIsClienteFrecuente] = useState(false);
  const [originalRequestId, setOriginalRequestId] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const allExams = useMemo(() => solicitudes.flatMap(s => s.examenes), [solicitudes]);
  const currentSolicitud = solicitudes[currentSolicitudIndex];

  useEffect(() => {
    if (empresa.rut) {
        const checkFrecuente = async () => {
            const cleanedRut = cleanRut(empresa.rut);
            if (!cleanedRut) {
              setIsClienteFrecuente(false);
              return;
            };

            const docRef = doc(firestore, 'empresas', cleanedRut);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists() && docSnap.data().modalidadFacturacion === 'frecuente') {
                setIsClienteFrecuente(true);
                // Pre-seleccionar Batería Hefaistos para todos los trabajadores
                setSolicitudes(prev => prev.map(s => ({ ...s, examenes: [BATERIA_HEFAISTOS_MOCK] })));
                 toast({
                    title: 'Cliente Frecuente Detectado',
                    description: `Se han cargado los datos de ${empresa.razonSocial} y la batería de exámenes predeterminada.`,
                });
            } else {
                setIsClienteFrecuente(false);
            }
        };
        checkFrecuente();
    } else {
        setIsClienteFrecuente(false);
    }
}, [empresa.rut, empresa.razonSocial, toast]);


  useEffect(() => {
    const solicitudData = searchParams.get('solicitud');
    if (solicitudData) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(solicitudData));
        setEmpresa(parsedData.empresa || initialEmpresa);
        setSolicitante(parsedData.solicitante || initialSolicitante);
        setOriginalRequestId(parsedData.originalRequestId || null);
        
        if (parsedData.solicitudes && parsedData.solicitudes.length > 0) {
            setSolicitudes(parsedData.solicitudes.map((s: any) => ({
              ...s, 
              id: s.id || crypto.randomUUID(),
              trabajador: { ...initialTrabajador, ...s.trabajador }
            })));
            setCurrentSolicitudIndex(0);
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

  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;

  const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const updateCurrentTrabajador = (trabajador: Trabajador) => {
    const newSolicitudes = [...solicitudes];
    newSolicitudes[currentSolicitudIndex].trabajador = trabajador;
    setSolicitudes(newSolicitudes);
  };
  
  const handleExamToggle = (exam: Examen, checked: boolean) => {
    if (isClienteFrecuente && exam.id === BATERIA_HEFAISTOS_MOCK.id && !checked) {
        toast({
            title: 'Acción no permitida',
            description: 'La batería de exámenes base no se puede deseleccionar para clientes frecuentes.',
            variant: 'destructive',
        });
        return;
    }
    const newSolicitudes = [...solicitudes];
    const currentExams = newSolicitudes[currentSolicitudIndex].examenes;
    newSolicitudes[currentSolicitudIndex].examenes = checked
      ? [...currentExams, exam]
      : currentExams.filter(e => e.id !== exam.id);
    setSolicitudes(newSolicitudes);
  };

  const handleClearSelection = () => {
    const examsToKeep = isClienteFrecuente ? [BATERIA_HEFAISTOS_MOCK] : [];
    setSolicitudes(solicitudes.map(s => ({...s, examenes: examsToKeep})));
  };

  const addTrabajador = () => {
    setStep(1); 
    const newId = crypto.randomUUID();
    const newExams = isClienteFrecuente ? [BATERIA_HEFAISTOS_MOCK] : [];
    const newSolicitud: SolicitudTrabajador = { id: newId, trabajador: initialTrabajador, examenes: newExams };
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

  const saveEmpresaData = async () => {
    if (!empresa.rut) return;
    const cleanedRut = cleanRut(empresa.rut);
    if (!cleanedRut) return;

    try {
      const empresaRef = doc(firestore, 'empresas', cleanedRut);
      await setDoc(empresaRef, { ...empresa, rut: cleanedRut }, { merge: true });
    } catch (error) {
      console.error("Error saving company data:", error);
      toast({
        variant: "destructive",
        title: "Error no crítico",
        description: "No se pudieron guardar los datos de la empresa para futuras cotizaciones.",
      });
    }
  };

  const handleGenerateQuote = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error de Autenticación', description: 'Debes estar autenticado para crear una cotización.' });
      return;
    }
    if (!empresa.rut || !empresa.razonSocial) {
      toast({ variant: 'destructive', title: 'Datos incompletos', description: 'El RUT y Razón Social de la empresa son obligatorios.'});
      setStep(1);
      return;
    }
    if (solicitudes.some(s => !s.trabajador.nombre || !s.trabajador.rut)) {
        toast({ title: "Datos incompletos", description: "El nombre y RUT de cada trabajador son obligatorios.", variant: "destructive"});
        setStep(1);
        return;
    }
     if (solicitudes.every(s => s.examenes.length === 0)) {
        toast({ title: "Sin exámenes", description: "Debe seleccionar al menos un examen para un trabajador.", variant: "destructive"});
        setStep(2);
        return;
     }

    await saveEmpresaData();

    const total = allExams.reduce((acc, exam) => acc + exam.valor, 0);

    const newQuoteFirestore: any = {
      empresaId: cleanRut(empresa.rut),
      solicitanteId: user.uid,
      fechaCreacion: serverTimestamp(),
      total: total,
      empresaData: { ...empresa, rut: cleanRut(empresa.rut), modalidadFacturacion: isClienteFrecuente ? 'frecuente' : 'normal' },
      solicitanteData: solicitante,
      solicitudesData: solicitudes,
      status: isClienteFrecuente ? 'orden_examen_enviada' : 'PENDIENTE',
      originalRequestId: originalRequestId || null,
    };

    const cotizacionesRef = collection(firestore, 'cotizaciones');
    addDoc(cotizacionesRef, newQuoteFirestore)
      .then(async (docRef) => {
        
        if (originalRequestId) {
          const originalRequestRef = doc(firestore, 'solicitudes_publicas', originalRequestId);
          await updateDoc(originalRequestRef, { estado: 'procesada' });
        }

        if(isClienteFrecuente){
             toast({
                title: 'Orden de Examen Acumulable Creada',
                description: 'La orden se ha guardado para la facturación consolidada.',
            });
            // Reset form for next entry
            setEmpresa(initialEmpresa);
            setSolicitante(initialSolicitante);
            setSolicitudes([{ id: crypto.randomUUID(), trabajador: initialTrabajador, examenes: [] }]);
            setCurrentSolicitudIndex(0);
            setStep(1);
            router.replace('/'); // Clean URL params
        } else {
             const quoteForDisplay: Cotizacion = {
                id: docRef.id,
                empresa,
                solicitante: solicitante,
                solicitudes: solicitudes,
                total,
                fecha: new Date().toLocaleDateString('es-CL'),
                fechaCreacion: newQuoteFirestore.fechaCreacion as Timestamp,
                status: newQuoteFirestore.status
            };
            const query = encodeURIComponent(JSON.stringify(quoteForDisplay));
            router.push(`/cotizacion?data=${query}`);
        }
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
      component: <Paso1DatosGenerales empresa={empresa} setEmpresa={setEmpresa} solicitante={solicitante} setSolicitante={setSolicitante} trabajador={currentSolicitud.trabajador} setTrabajador={updateCurrentTrabajador} />,
    },
    {
      id: 2,
      name: `Exámenes para ${currentSolicitud?.trabajador?.nombre || `Trabajador ${currentSolicitudIndex + 1}`}`,
      component: <Paso2SeleccionExamenes selectedExams={currentSolicitud?.examenes || []} onExamToggle={handleExamToggle} showPrice={true} />,
    },
  ];

  const currentStepData = steps.find(s => s.id === step);

  return (
    <div className="space-y-8">
        <div className="text-center">
            <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {isClienteFrecuente ? "Ingresar Orden de Examen (Frecuente)" : "Crear Nueva Cotización (Normal)"}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {originalRequestId ? "Procesando solicitud pública. Verifique los datos y genere la cotización." : "Siga los pasos para generar una cotización de forma rápida y sencilla."}
            </p>
        </div>

        {isClienteFrecuente && (
            <Alert className="border-green-500 text-green-700">
                <ShieldCheck className="h-4 w-4 !text-green-700" />
                <AlertTitle className="font-semibold">Modo Cliente Frecuente Activado</AlertTitle>
                <AlertDescription>Los exámenes base se han pre-seleccionado. Puedes añadir más si es necesario.</AlertDescription>
            </Alert>
        )}

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
            
            <div className="lg:col-span-1 space-y-4">
               <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-headline flex items-center gap-2"><Users className="h-5 w-5 text-primary"/> Trabajadores ({solicitudes.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-48 overflow-y-auto">
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
                </CardContent>
                 <CardContent className='pt-2'>
                    <Button variant="outline" size="sm" className="w-full" onClick={addTrabajador}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Trabajador
                    </Button>
                 </CardContent>
              </Card>

              <ResumenCotizacion 
                selectedExams={allExams} 
                onClear={handleClearSelection}
                onGenerate={handleGenerateQuote}
                isStep1={step === 1}
                isFrecuente={isClienteFrecuente}
                isProcessingPublicRequest={!!originalRequestId}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

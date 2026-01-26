"use client";

import { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Send, PlusCircle, Trash2, Users, Loader2, ShieldCheck } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Empresa, Examen, Solicitante, Trabajador } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cleanRut, formatRut } from '@/lib/utils';
import Paso1DatosGenerales from '@/components/cotizacion/Paso1DatosGenerales';
import Paso2SeleccionExamenes from '@/components/cotizacion/Paso2SeleccionExamenes';
import type { SolicitudTrabajador } from '@/types/models';

const initialEmpresa: Empresa = { rut: '', razonSocial: '', direccion: '', giro: '', ciudad: '', comuna: '', region: '', email: '' };
const initialSolicitante: Solicitante = { nombre: '', rut: '', cargo: '', centroDeCostos: '', mail: '' };

export default function SolicitudPage() {
  const [step, setStep] = useState(1);
  const [empresa, setEmpresa] = useState<Empresa>(initialEmpresa);
  const [solicitante, setSolicitante] = useState<Solicitante>(initialSolicitante);
  
  // Estado principal de solicitudes
  const [solicitudes, setSolicitudes] = useState<SolicitudTrabajador[]>([]);
  const [currentSolicitudIndex, setCurrentSolicitudIndex] = useState(0);

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [rutEmpresa, setRutEmpresa] = useState('');
  const [isClienteFrecuente, setIsClienteFrecuente] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  // Inicialización de la primera solicitud al montar el componente
  useEffect(() => {
    if (solicitudes.length === 0) {
      setSolicitudes([{
        id: crypto.randomUUID(),
        trabajador: { nombre: '', rut: '', cargo: '', fechaNacimiento: '', fechaAtencion: '' },
        examenes: []
      }]);
    }
  }, []);

  const currentSolicitud = solicitudes[currentSolicitudIndex];

  /**
   * Busca batería sugerida pero NO la impone si el usuario quiere otra cosa
   */
  const buscarBateriaAsociada = async (nombreEmpresa: string) => {
    try {
      const q = query(collection(firestore, 'examenes'), where('categoria', '==', 'Baterías y Exámenes Ocupacionales'));
      const snap = await getDocs(q);
      const matches = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Examen))
        .filter(ex => ex.nombre.toUpperCase().includes(nombreEmpresa.split(' ')[0].toUpperCase()));
      return matches.length > 0 ? [matches[0]] : [];
    } catch (e) { return []; }
  };

  const handleValidateRut = async () => {
    if (!rutEmpresa) return;
    setIsValidating(true);
    const cleanedRut = cleanRut(rutEmpresa);
    try {
        const empresaRef = doc(firestore, 'empresas', cleanedRut);
        const docSnap = await getDoc(empresaRef);
        if (docSnap.exists()) {
            const data = docSnap.data() as Empresa;
            setEmpresa(data);
            if (data.modalidadFacturacion === 'frecuente') {
                setIsClienteFrecuente(true);
                const bateriaSugerida = await buscarBateriaAsociada(data.razonSocial);
                // Cargamos la batería sugerida SOLO al primer trabajador
                setSolicitudes(prev => prev.map((s, i) => i === 0 ? { ...s, examenes: bateriaSugerida } : s));
                toast({ title: 'Cliente Frecuente', description: 'Datos cargados con batería sugerida.' });
            } else {
                 setIsClienteFrecuente(false);
                 toast({ title: 'Empresa Encontrada', description: 'Datos precargados.' });
            }
        } else {
             toast({ variant: 'destructive', title: 'No encontrado', description: 'Ingrese los datos manualmente.' });
             setIsClienteFrecuente(false);
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Error al conectar con la base de datos.' });
    } finally { setIsValidating(false); }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 2));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleExamToggle = (exam: Examen, checked: boolean) => {
    setSolicitudes(prev => {
        const newSols = [...prev];
        const currentExams = newSols[currentSolicitudIndex].examenes;
        newSols[currentSolicitudIndex].examenes = checked
          ? [...currentExams, exam]
          : currentExams.filter(e => e.id !== exam.id);
        return newSols;
    });
  };

  /**
   * SOLUCIÓN A INCONSISTENCIA: Nuevo trabajador siempre viene con exámenes vacíos
   */
  const addTrabajador = () => {
    const newSolicitud: SolicitudTrabajador = { 
        id: crypto.randomUUID(), 
        trabajador: { nombre: '', rut: '', cargo: '', fechaNacimiento: '', fechaAtencion: '' }, 
        examenes: [] // CORRECCIÓN: Siempre vacío para evitar deseleccionar lo anterior
    };
    setSolicitudes(prev => [...prev, newSolicitud]);
    setCurrentSolicitudIndex(solicitudes.length);
    setStep(1);
  };

  const removeTrabajador = (indexToRemove: number) => {
    if (solicitudes.length <= 1) return;
    setSolicitudes(prev => prev.filter((_, index) => index !== indexToRemove));
    setCurrentSolicitudIndex(0);
  };

  /**
   * SOLUCIÓN A EXÁMENES EN BLANCO: Asegurar el mapeo completo del array de exámenes
   */
  const handleSendRequest = async () => {
     setIsSubmitting(true);
     if (!empresa.razonSocial || !empresa.rut || !solicitante.nombre || !solicitante.mail) {
        toast({ title: "Datos incompletos", variant: "destructive"});
        setIsSubmitting(false);
        return;
     }

    const submissionData = {
      empresa: { ...empresa, rut: cleanRut(empresa.rut) },
      solicitante,
      // MAPEAMOS EXPLÍCITAMENTE LOS EXÁMENES PARA QUE LLEGUEN AL ADMIN
      solicitudes: solicitudes.map(s => ({
          id: s.id,
          trabajador: s.trabajador,
          examenes: s.examenes // <--- CRÍTICO: Envío de selección
      })),
      fechaCreacion: serverTimestamp(),
      estado: 'pendiente',
      isFrecuente: isClienteFrecuente
    };

    try {
      await addDoc(collection(firestore, 'solicitudes_publicas'), submissionData);
      setFormSubmitted(true);
    } catch (error) {
      toast({ title: "Error al enviar", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  if (solicitudes.length === 0) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

  if (formSubmitted) {
    return (
        <div className="max-w-2xl mx-auto py-20">
            <Alert className="border-emerald-500 bg-emerald-50 text-emerald-800">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <AlertTitle className="text-xl font-bold">¡Solicitud Recibida!</AlertTitle>
                <AlertDescription>Su requerimiento ha sido ingresado al sistema Araval.</AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 px-4">
        <div className="text-center">
            <h1 className="text-3xl font-black text-slate-800 uppercase italic">Solicitud de Exámenes</h1>
            <p className="text-slate-500">Ingrese los datos para la atención de sus trabajadores</p>
        </div>

      <Card className="border shadow-sm">
        <CardContent className="pt-6">
            <div className="flex w-full max-w-md items-center space-x-2">
                <Input 
                    placeholder="RUT Empresa (Ej: 76.123.456-7)" 
                    value={rutEmpresa} 
                    onChange={(e) => setRutEmpresa(formatRut(e.target.value))} 
                    disabled={isValidating || isClienteFrecuente}
                />
                <Button onClick={handleValidateRut} disabled={isValidating || isClienteFrecuente} className="bg-slate-900 text-white font-bold">
                    {isValidating ? <Loader2 className="h-4 w-4 animate-spin"/> : "VALIDAR CLIENTE"} 
                </Button>
            </div>
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
            <div className="md:col-span-3">
              <Card className="border shadow-lg overflow-hidden">
                  <Progress value={(step/2)*100} className="h-1 rounded-none bg-slate-100" />
                  <div className="p-6">
                    <AnimatePresence mode="wait">
                        <motion.div key={`${step}-${currentSolicitudIndex}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                            {step === 1 ? (
                                <Paso1DatosGenerales 
                                    empresa={empresa} setEmpresa={setEmpresa} 
                                    solicitante={solicitante} setSolicitante={setSolicitante} 
                                    trabajador={currentSolicitud.trabajador} 
                                    setTrabajador={(val) => {
                                        const news = [...solicitudes];
                                        news[currentSolicitudIndex].trabajador = typeof val === 'function' ? val(news[currentSolicitudIndex].trabajador) : val;
                                        setSolicitudes(news);
                                    }} 
                                />
                            ) : (
                                <Paso2SeleccionExamenes 
                                    selectedExams={currentSolicitud?.examenes || []} 
                                    onExamToggle={handleExamToggle} 
                                    showPrice={false}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>

                    <div className="mt-10 flex justify-between items-center border-t pt-6">
                        <Button variant="ghost" onClick={prevStep} disabled={step === 1}>Anterior</Button>
                        <Button onClick={step === 1 ? nextStep : handleSendRequest} disabled={isSubmitting} className={step === 1 ? "bg-blue-600 px-10 text-white" : "bg-emerald-600 px-10 text-white font-bold"}>
                            {isSubmitting ? "Enviando..." : (step === 1 ? "Siguiente" : "Finalizar Solicitud")}
                        </Button>
                    </div>
                  </div>
              </Card>
            </div>

            <div className="md:col-span-1 space-y-4">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-4 bg-slate-50 border-b">
                    <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2"><Users className="h-3 w-3"/> Nómina</CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-1">
                  {solicitudes.map((s, index) => (
                    <div key={s.id} className={`flex items-center justify-between p-2 rounded ${index === currentSolicitudIndex ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'}`}>
                      <button className="flex-grow text-left text-xs font-bold truncate" onClick={() => { setCurrentSolicitudIndex(index); setStep(1); }}>
                         {index + 1}. {s.trabajador.nombre || "S/N"}
                      </button>
                      <button className="text-slate-300 hover:text-red-500" onClick={() => removeTrabajador(index)}>
                          <Trash2 className="h-3.5 w-3.5"/>
                      </button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-[10px] text-blue-600 font-bold" onClick={addTrabajador}>
                      <PlusCircle className="mr-2 h-3 w-3" /> AÑADIR TRABAJADOR
                  </Button>
                </CardContent>
              </Card>
            </div>
      </div>
    </div>
  );
}
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

const createEmptySolicitud = (): SolicitudTrabajador => ({
    id: crypto.randomUUID(),
    trabajador: { nombre: '', rut: '', cargo: '', fechaNacimiento: '', fechaAtencion: '' },
    examenes: []
});

export default function SolicitudPage() {
  const [step, setStep] = useState(1);
  const [empresa, setEmpresa] = useState<Empresa>(initialEmpresa);
  const [solicitante, setSolicitante] = useState<Solicitante>(initialSolicitante);
  
  // Inicialización controlada para evitar "Trabajadores Fantasma"
  const [solicitudes, setSolicitudes] = useState<SolicitudTrabajador[]>([]);
  const [currentSolicitudIndex, setCurrentSolicitudIndex] = useState(0);

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [rutEmpresa, setRutEmpresa] = useState('');
  const [isClienteFrecuente, setIsClienteFrecuente] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  // Efecto de montaje único
  useEffect(() => {
    if (solicitudes.length === 0) {
      setSolicitudes([createEmptySolicitud()]);
    }
  }, []);

  const currentSolicitud = solicitudes[currentSolicitudIndex];

  /**
   * BUSCADOR DINÁMICO DE BATERÍAS POR EMPRESA
   * En lugar de una constante hardcodeada, busca en el catálogo
   */
  const buscarBateriaAsociada = async (nombreEmpresa: string) => {
    try {
      const q = query(
        collection(firestore, 'examenes'), 
        where('categoria', '==', 'Baterías y Exámenes Ocupacionales')
      );
      const snap = await getDocs(q);
      // Filtramos localmente por nombre de la empresa (ej: busca "IMAX" en el nombre del examen)
      const matches = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Examen))
        .filter(ex => ex.nombre.toUpperCase().includes(nombreEmpresa.split(' ')[0].toUpperCase()));
      
      return matches.length > 0 ? [matches[0]] : [];
    } catch (e) {
      return [];
    }
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
                // Buscamos su batería específica en el catálogo
                const bateriaEncontrada = await buscarBateriaAsociada(data.razonSocial);
                
                // Actualizamos las solicitudes existentes SIN duplicar trabajadores
                setSolicitudes(prev => prev.map(s => ({ 
                    ...s, 
                    examenes: bateriaEncontrada.length > 0 ? bateriaEncontrada : s.examenes 
                })));

                toast({ 
                    title: 'Cliente Frecuente Detectado', 
                    description: `Datos cargados. Batería sugerida: ${bateriaEncontrada[0]?.nombre || 'No encontrada'}` 
                });
            } else {
                 setIsClienteFrecuente(false);
                 toast({ title: 'Cliente Estándar', description: 'Datos cargados correctamente.' });
            }
        } else {
             toast({ variant: 'destructive', title: 'Empresa no encontrada', description: 'Por favor ingrese los datos manualmente.' });
             setIsClienteFrecuente(false);
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error de Validación', description: 'Error al conectar con la base de datos.' });
    } finally {
        setIsValidating(false);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 2));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const updateCurrentSolicitud = (newSolicitud: Partial<SolicitudTrabajador>) => {
    setSolicitudes(prev => {
        const newSolicitudes = [...prev];
        if (newSolicitudes[currentSolicitudIndex]) {
            newSolicitudes[currentSolicitudIndex] = { ...newSolicitudes[currentSolicitudIndex], ...newSolicitud };
        }
        return newSolicitudes;
    });
  };
  
  const handleExamToggle = (exam: Examen, checked: boolean) => {
    const currentExams = currentSolicitud?.examenes || [];
    const newExams = checked
      ? [...currentExams, exam]
      : currentExams.filter(e => e.id !== exam.id);
    updateCurrentSolicitud({ examenes: newExams });
  };

  const addTrabajador = () => {
    // Hereda exámenes si ya hay una batería seleccionada (útil para clientes frecuentes)
    const bateriaActual = solicitudes[0]?.examenes || [];
    const newSolicitud: SolicitudTrabajador = { 
        ...createEmptySolicitud(),
        examenes: isClienteFrecuente ? bateriaActual : [] 
    };
    setSolicitudes(prev => [...prev, newSolicitud]);
    setCurrentSolicitudIndex(solicitudes.length); 
    setStep(1); 
  };

  const removeTrabajador = (indexToRemove: number) => {
    if (solicitudes.length <= 1) return;
    const newSolicitudes = solicitudes.filter((_, index) => index !== indexToRemove);
    setSolicitudes(newSolicitudes);
    if (currentSolicitudIndex >= indexToRemove) {
      setCurrentSolicitudIndex(Math.max(0, indexToRemove - 1));
    }
  };

  const handleSendRequest = async () => {
     setIsSubmitting(true);
     if (!empresa.razonSocial || !empresa.rut || !solicitante.nombre || !solicitante.mail) {
        toast({ title: "Datos incompletos", description: "Complete Empresa y Solicitante.", variant: "destructive"});
        setIsSubmitting(false);
        return;
     }

    const submissionData = {
      empresa: { ...empresa, rut: cleanRut(empresa.rut) },
      solicitante,
      solicitudes: solicitudes.map(s => ({ 
          ...s, 
          trabajador: { 
              ...s.trabajador, 
              // Aseguramos que los campos de fecha viajen correctamente
              fechaAtencion: s.trabajador.fechaAtencion || new Date().toISOString().split('T')[0] 
          } 
      })),
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

  if (solicitudes.length === 0) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

  if (formSubmitted) {
    return (
        <div className="max-w-2xl mx-auto py-20">
            <Alert className="border-emerald-500 bg-emerald-50">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <AlertTitle className="text-xl font-bold text-emerald-800">¡Solicitud Procesada!</AlertTitle>
                <AlertDescription className="text-emerald-700">
                    Se ha generado la orden correctamente. El equipo administrativo ha sido notificado.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-800 uppercase tracking-tight">Solicitud de Exámenes</h1>
            <p className="text-slate-500 mt-2">Gestión de ingresos para salud ocupacional</p>
        </div>

      <Card className="border shadow-sm bg-white">
        <CardHeader className="bg-slate-50/50 border-b">
             <CardTitle className='text-xs font-bold uppercase text-slate-400 tracking-widest'>Módulo de Validación</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
            <div className="flex w-full max-w-md items-center space-x-2">
                <Input 
                    placeholder="RUT Empresa (Ej: 76.123.456-7)" 
                    value={rutEmpresa} 
                    onChange={(e) => setRutEmpresa(formatRut(e.target.value))} 
                    disabled={isValidating || isClienteFrecuente}
                />
                <Button 
                    onClick={handleValidateRut} 
                    disabled={isValidating || isClienteFrecuente}
                    className="bg-slate-800 hover:bg-black text-white"
                >
                    {isValidating ? <Loader2 className="h-4 w-4 animate-spin"/> : "Validar Cliente"} 
                </Button>
            </div>
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
            <div className="md:col-span-3">
              <Card className="border shadow-lg">
                <CardContent className="p-0">
                  <Progress value={(step/2)*100} className="h-1 rounded-none bg-slate-100" />
                  <div className="p-6">
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={`${step}-${currentSolicitudIndex}`} 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {step === 1 ? (
                                <Paso1DatosGenerales 
                                    empresa={empresa} setEmpresa={setEmpresa} 
                                    solicitante={solicitante} setSolicitante={setSolicitante} 
                                    trabajador={currentSolicitud.trabajador} 
                                    setTrabajador={(val) => {
                                        const next = typeof val === 'function' ? val(currentSolicitud.trabajador) : val;
                                        updateCurrentSolicitud({ trabajador: next });
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
                        <Button variant="ghost" onClick={prevStep} disabled={step === 1}>
                            Anterior
                        </Button>
                        <div className="flex gap-3">
                            {step === 1 ? (
                                <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700 px-10">
                                    Siguiente
                                </Button>
                            ) : (
                                <Button onClick={handleSendRequest} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 px-10">
                                    {isSubmitting ? "Enviando..." : "Finalizar Solicitud"}
                                </Button>
                            )}
                        </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-1 space-y-4">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-4 bg-slate-50 border-b">
                    <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                        <Users className="h-3 w-3"/> Nómina ({solicitudes.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-1">
                  {solicitudes.map((s, index) => (
                    <div key={s.id} className={`flex items-center gap-1 p-2 rounded ${index === currentSolicitudIndex ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50'}`}>
                      <button 
                        className="flex-grow text-left text-sm font-medium text-slate-700 truncate"
                        onClick={() => { setCurrentSolicitudIndex(index); setStep(1); }}
                      >
                         {index + 1}. {s.trabajador.nombre || "Sin nombre"}
                      </button>
                      <button className="p-1 text-slate-300 hover:text-red-500" onClick={() => removeTrabajador(index)}>
                          <Trash2 className="h-3.5 w-3.5"/>
                      </button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-blue-600 hover:bg-blue-50" onClick={addTrabajador}>
                      <PlusCircle className="mr-2 h-3 w-3" /> Añadir Trabajador
                  </Button>
                </CardContent>
              </Card>
            </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, PlusCircle, Trash2, Users, ShieldCheck, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import type { Empresa, Examen, Trabajador, Cotizacion, Solicitante } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import Paso1DatosGenerales from './Paso1DatosGenerales';
import Paso2SeleccionExamenes from './Paso2SeleccionExamenes';
import ResumenCotizacion from './ResumenCotizacion';
import { cleanRut } from '@/lib/utils';
import type { SolicitudTrabajador } from '@/types/models';

const initialEmpresa: Empresa = { razonSocial: '', rut: '', direccion: '', giro: '', ciudad: '', comuna: '', region: '', email: '' };
const initialTrabajador: Trabajador = { nombre: '', rut: '', cargo: '', fechaNacimiento: '', fechaAtencion: '' };
const initialSolicitante: Solicitante = { nombre: '', rut: '', cargo: '', centroDeCostos: '', mail: '' };

export function CrearCotizacion() {
  const [step, setStep] = useState(1);
  const [empresa, setEmpresa] = useState<Empresa>(initialEmpresa);
  const [solicitante, setSolicitante] = useState(initialSolicitante);
  const [solicitudes, setSolicitudes] = useState<SolicitudTrabajador[]>([]);
  const [currentSolicitudIndex, setCurrentSolicitudIndex] = useState(0);
  const [isClienteFrecuente, setIsClienteFrecuente] = useState(false);
  const [originalRequestId, setOriginalRequestId] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const allExams = useMemo(() => solicitudes.flatMap(s => s.examenes || []), [solicitudes]);
  const currentSolicitud = solicitudes[currentSolicitudIndex];

  // 1. Inicialización de seguridad
  useEffect(() => {
    if (solicitudes.length === 0) {
        setSolicitudes([{ id: crypto.randomUUID(), trabajador: initialTrabajador, examenes: [] }]);
    }
  }, []);

  // 2. Carga de Solicitud Pública desde URL (Solución a exámenes en blanco)
  useEffect(() => {
    const solicitudData = searchParams.get('solicitud');
    if (solicitudData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(solicitudData));
        setEmpresa(parsed.empresa || initialEmpresa);
        setSolicitante(parsed.solicitante || initialSolicitante);
        setOriginalRequestId(parsed.originalRequestId || null);
        
        if (parsed.solicitudes && parsed.solicitudes.length > 0) {
            // CRÍTICO: Mapeamos los exámenes que el cliente ya seleccionó
            setSolicitudes(parsed.solicitudes.map((s: any) => ({
                ...s,
                id: s.id || crypto.randomUUID(),
                trabajador: { ...initialTrabajador, ...s.trabajador },
                examenes: s.examenes || [] 
            })));
            setCurrentSolicitudIndex(0);
        }
      } catch (e) {
        console.error("Error al decodificar solicitud:", e);
      }
    }
  }, [searchParams]);

  // 3. Detección de Cliente Frecuente
  useEffect(() => {
    if (empresa.rut) {
        const checkFrecuente = async () => {
            const cleanedRut = cleanRut(empresa.rut);
            const docRef = doc(firestore, 'empresas', cleanedRut);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().modalidadFacturacion === 'frecuente') {
                setIsClienteFrecuente(true);
            } else {
                setIsClienteFrecuente(false);
            }
        };
        checkFrecuente();
    }
  }, [empresa.rut]);

  const handleGenerateQuote = async () => {
    if (!user) return;
    if (!empresa.rut || !empresa.razonSocial) {
        toast({ title: "Faltan datos", variant: "destructive" });
        return;
    }

    const total = allExams.reduce((acc, exam) => acc + (exam.valor || 0), 0);
    const newQuoteFirestore = {
      empresaId: cleanRut(empresa.rut),
      solicitanteId: user.uid,
      fechaCreacion: serverTimestamp(),
      total: total,
      empresaData: { 
          ...empresa, 
          rut: cleanRut(empresa.rut), 
          modalidadFacturacion: isClienteFrecuente ? 'frecuente' : 'normal' 
      },
      solicitanteData: solicitante,
      solicitudesData: solicitudes,
      status: isClienteFrecuente ? 'PAGADO' : 'CONFIRMADA',
      originalRequestId: originalRequestId || null,
      liorenConsolidado: false 
    };

    try {
        await addDoc(collection(firestore, 'cotizaciones'), newQuoteFirestore);
        if (originalRequestId) {
            await updateDoc(doc(firestore, 'solicitudes_publicas', originalRequestId), { estado: 'procesada' });
        }
        toast({ title: isClienteFrecuente ? "Orden en Consolidación" : "Cotización Generada" });
        router.push(isClienteFrecuente ? '/admin/facturacion-consolidada' : '/cotizaciones-guardadas');
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 2));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSetTrabajador = (val: Trabajador | ((prev: Trabajador) => Trabajador)) => {
    setSolicitudes(prev => {
        const news = [...prev];
        const current = news[currentSolicitudIndex].trabajador;
        news[currentSolicitudIndex].trabajador = typeof val === 'function' ? val(current) : val;
        return news;
    });
  };

  const addTrabajador = () => {
    setSolicitudes(prev => [...prev, { 
        id: crypto.randomUUID(), 
        trabajador: initialTrabajador, 
        examenes: [] 
    }]);
    setCurrentSolicitudIndex(solicitudes.length);
    setStep(1);
  };

  if (!currentSolicitud) return null;

  return (
    <div className="space-y-8 p-6 bg-white rounded-xl shadow-sm border">
        <div className="flex items-center justify-between border-b pb-4">
            <div>
                {/* TÍTULO CORREGIDO: SIN ITALIC Y TAMAÑO ESTÁNDAR */}
                <h1 className="text-2xl font-bold uppercase text-slate-800 tracking-tight">
                    {isClienteFrecuente ? "Ingreso de Orden" : "Generar Cotización"}
                </h1>
                <Badge variant={isClienteFrecuente ? "default" : "outline"} className={isClienteFrecuente ? "bg-amber-500 mt-1" : "mt-1"}>
                    {isClienteFrecuente ? "MODO CLIENTE FRECUENTE" : "MODO ESTÁNDAR"}
                </Badge>
            </div>
            {originalRequestId && (
                <Badge variant="secondary" className="font-mono">SOLICITUD #{originalRequestId.slice(-6).toUpperCase()}</Badge>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
                <Progress value={(step/2)*100} className="h-1 bg-slate-100" />
                <AnimatePresence mode="wait">
                    <motion.div key={`${step}-${currentSolicitudIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        {step === 1 ? (
                            <Paso1DatosGenerales 
                                empresa={empresa} setEmpresa={setEmpresa} 
                                solicitante={solicitante} setSolicitante={setSolicitante} 
                                trabajador={currentSolicitud.trabajador} 
                                setTrabajador={handleSetTrabajador} 
                            />
                        ) : (
                            <Paso2SeleccionExamenes 
                                selectedExams={currentSolicitud.examenes || []} 
                                onExamToggle={(exam, checked) => {
                                    const news = [...solicitudes];
                                    const curr = news[currentSolicitudIndex].examenes || [];
                                    news[currentSolicitudIndex].examenes = checked ? [...curr, exam] : curr.filter(e => e.id !== exam.id);
                                    setSolicitudes(news);
                                }} 
                                showPrice={true} 
                            />
                        )}
                    </motion.div>
                </AnimatePresence>

                <div className="flex justify-between pt-6 border-t">
                    <Button variant="ghost" onClick={prevStep} disabled={step === 1}>Anterior</Button>
                    <Button 
                        onClick={step === 1 ? nextStep : handleGenerateQuote} 
                        className={step === 1 ? "bg-blue-600 px-10 text-white" : "bg-emerald-600 px-10 text-white font-bold"}
                    >
                        {step === 1 ? "Siguiente" : (isClienteFrecuente ? "CONFIRMAR PARA FACTURAR" : "GENERAR COTIZACIÓN")}
                    </Button>
                </div>
            </div>

            <div className="lg:col-span-1 space-y-4">
                <Card className="bg-slate-50 border-none">
                    <CardHeader className="p-4 border-b">
                        <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                            <Users className="w-4 h-4"/> Nómina ({solicitudes.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-1">
                        {solicitudes.map((s, i) => (
                            <div key={s.id} className={`flex items-center justify-between p-2 rounded text-sm ${i === currentSolicitudIndex ? 'bg-white shadow-sm border-blue-200 border' : ''}`}>
                                <button className="flex-grow text-left font-medium truncate" onClick={() => {setCurrentSolicitudIndex(i); setStep(1);}}>
                                    {s.trabajador.nombre || `Trabajador ${i+1}`}
                                </button>
                                <button 
                                    onClick={() => {
                                        if(solicitudes.length > 1) {
                                            setSolicitudes(prev => prev.filter((_, idx) => idx !== i));
                                            setCurrentSolicitudIndex(0);
                                        }
                                    }} 
                                    className="text-slate-300 hover:text-red-500"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            </div>
                        ))}
                        <Button variant="ghost" size="sm" className="w-full mt-2 text-blue-600" onClick={addTrabajador}>
                            <PlusCircle className="w-4 h-4 mr-2"/> Añadir Trabajador
                        </Button>
                    </CardContent>
                </Card>
                <ResumenCotizacion 
                    selectedExams={allExams} 
                    onClear={() => setSolicitudes(prev => prev.map(s => ({...s, examenes: []})))} 
                    onGenerate={handleGenerateQuote} 
                    isStep1={step === 1} 
                    isFrecuente={isClienteFrecuente} 
                />
            </div>
        </div>
    </div>
  );
}
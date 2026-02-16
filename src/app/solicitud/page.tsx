"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { PlusCircle, Trash2, Users, Loader2, CheckCircle2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Empresa, Examen, Solicitante } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
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
  const [solicitudes, setSolicitudes] = useState<SolicitudTrabajador[]>([]);
  const [currentSolicitudIndex, setCurrentSolicitudIndex] = useState(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [rutEmpresa, setRutEmpresa] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  
  useEffect(() => {
    if (solicitudes.length === 0) {
      setSolicitudes([{ id: crypto.randomUUID(), trabajador: { nombre: '', rut: '', cargo: '', fechaNacimiento: '', fechaAtencion: '' }, examenes: [] }]);
    }
  }, []);

  const currentSolicitud = solicitudes[currentSolicitudIndex];

  // REGLA 1: BLOQUEO DE PASO 2 SI FALTAN DATOS CRÍTICOS
  const isStep1Incomplete = !empresa.razonSocial || !solicitante.nombre || !solicitante.mail || !solicitante.mail.includes('@');

  const validateWorker = (sol: SolicitudTrabajador) => {
    return sol.trabajador.nombre && sol.trabajador.rut && sol.examenes.length > 0;
  };

  const handleValidateRut = async () => {
    if (!rutEmpresa) return;
    setIsValidating(true);
    const cleaned = cleanRut(rutEmpresa);
    try {
        const docSnap = await getDoc(doc(firestore, 'empresas', cleaned));
        if (docSnap.exists()) { setEmpresa(docSnap.data() as Empresa); toast({ title: 'Empresa Encontrada' }); }
        else { toast({ variant: 'destructive', title: 'No encontrado' }); }
    } catch (e) { toast({ variant: 'destructive', title: 'Error' }); }
    finally { setIsValidating(false); }
  };

  const handleExamToggle = (exam: Examen, checked: boolean) => {
    setSolicitudes(prev => {
      const newSols = [...prev];
      const currentExams = newSols[currentSolicitudIndex]?.examenes || [];
      if (checked) {
        if (!currentExams.some(e => e.id === exam.id)) newSols[currentSolicitudIndex].examenes = [...currentExams, exam];
      } else {
        newSols[currentSolicitudIndex].examenes = currentExams.filter(e => e.id !== exam.id);
      }
      return newSols;
    });
  };

  const addTrabajador = () => {
    if (!validateWorker(currentSolicitud)) {
        toast({ variant: "destructive", title: "Acción bloqueada", description: "Complete los datos y exámenes del trabajador actual." });
        return;
    }
    setSolicitudes(prev => [...prev, { id: crypto.randomUUID(), trabajador: { nombre: '', rut: '', cargo: '', fechaNacimiento: '', fechaAtencion: '' }, examenes: [] }]);
    setCurrentSolicitudIndex(solicitudes.length);
    setStep(1);
  };

  const handleSendRequest = async () => {
    if (solicitudes.some(s => !validateWorker(s))) {
        toast({ variant: "destructive", title: "Nómina Incompleta", description: "Revise que todos los trabajadores tengan datos y exámenes seleccionados." });
        return;
    }
    setIsSubmitting(true);
    try {
      const submissionData = {
        empresa: { ...empresa, rut: cleanRut(empresa.rut) },
        solicitante,
        solicitudes: solicitudes.map(s => ({ id: s.id, trabajador: s.trabajador, examenes: s.examenes })),
        fechaCreacion: serverTimestamp(),
        estado: 'pendiente'
      };
      await addDoc(collection(firestore, 'solicitudes_publicas'), submissionData);
      setFormSubmitted(true);
    } catch (e) { toast({ title: "Error al enviar", variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  if (solicitudes.length === 0) return null;

  if (formSubmitted) {
    return (
        <div className="max-w-2xl mx-auto py-20 px-4 text-center text-left">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-6" />
            <h1 className="text-2xl font-black uppercase italic mb-2">¡Solicitud Enviada!</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Su requerimiento será procesado por nuestro equipo comercial.</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-20 font-sans text-left">
      <header className="bg-[#0a0a4d] text-white pt-14 pb-20 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <div className="flex justify-center md:justify-start md:ml-10"><Image src="/images/logo2.png" alt="Araval Logo" width={115} height={55} priority /></div>
          <div className="hidden md:block h-8 w-[1px] bg-white/20" />
          <div className="flex flex-col items-center md:items-start space-y-0 text-center md:text-left">
            <h1 className="text-[13px] font-black uppercase tracking-tighter opacity-80 leading-none">Bienvenidos a</h1>
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-[0.3em] leading-tight">Solicitud de Exámenes</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 -mt-7 relative z-10">
        <Card className="border-none shadow-2xl bg-white mb-8 overflow-hidden rounded-xl">
          <CardContent className="p-0">
            <div className="bg-white p-6 flex flex-col md:flex-row items-center gap-4">
                <div className="flex w-full max-w-md items-center space-x-2">
                    <Input placeholder="RUT Empresa" value={rutEmpresa} onChange={(e) => setRutEmpresa(formatRut(e.target.value))} className="h-11 font-bold border-slate-200" />
                    <Button onClick={handleValidateRut} disabled={isValidating} className="bg-[#0a0a4d] h-11 px-8 font-black uppercase text-[10px] tracking-widest shadow-lg">
                        {isValidating ? <Loader2 className="h-4 w-4 animate-spin"/> : "Validar Cliente"} 
                    </Button>
                </div>
                <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] md:ml-auto hidden lg:block">Sistema de Gestión Araval</div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-3">
            <Card className="border-none shadow-2xl overflow-hidden bg-white min-h-[650px] rounded-xl">
                <Progress value={(step/2)*100} className="h-1.5 rounded-none bg-slate-100" />
                <div className="p-8">
                  <AnimatePresence mode="wait">
                      <motion.div key={`${step}-${currentSolicitudIndex}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                          {step === 1 ? (
                              <Paso1DatosGenerales empresa={empresa} setEmpresa={setEmpresa} solicitante={solicitante} setSolicitante={setSolicitante} trabajador={currentSolicitud.trabajador} setTrabajador={(val) => { const news = [...solicitudes]; news[currentSolicitudIndex].trabajador = typeof val === 'function' ? val(news[currentSolicitudIndex].trabajador) : val; setSolicitudes(news); }} />
                          ) : (
                              <Paso2SeleccionExamenes selectedExams={currentSolicitud?.examenes || []} onExamToggle={handleExamToggle} showPrice={false} />
                          )}
                      </motion.div>
                  </AnimatePresence>

                  <div className="mt-12 flex justify-between items-center border-t pt-8">
                      <Button variant="ghost" onClick={() => setStep(1)} disabled={step === 1} className="font-black uppercase text-[10px]">Atrás</Button>
                      <Button onClick={step === 1 ? () => setStep(2) : handleSendRequest} disabled={isSubmitting || (step === 1 && isStep1Incomplete)} className={`px-12 h-12 font-black uppercase tracking-widest text-[10px] shadow-xl ${step === 1 ? (isStep1Incomplete ? "bg-slate-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700") : "bg-emerald-600 hover:bg-emerald-700"}`}>
                          {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : null}
                          {step === 1 ? "Siguiente Paso" : "Finalizar Solicitud"}
                      </Button>
                  </div>
                </div>
            </Card>
          </div>

          <div className="md:col-span-1 space-y-6">
            <Card className="border-none shadow-xl bg-white overflow-hidden rounded-xl text-left">
              <CardHeader className="p-4 bg-[#0a0a4d] border-b"><CardTitle className="text-[10px] font-black uppercase text-white flex items-center gap-2 tracking-widest"><Users className="h-3 w-3 text-blue-400"/> Nómina de Atención</CardTitle></CardHeader>
              <CardContent className="p-3 space-y-2">
                {solicitudes.map((s, index) => (
                  <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${index === currentSolicitudIndex ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent'}`}>
                    <button className="flex-grow text-left text-[11px] font-black uppercase truncate text-slate-700" onClick={() => { setCurrentSolicitudIndex(index); setStep(1); }}>{index + 1}. {s.trabajador.nombre || "S/N"}</button>
                    {solicitudes.length > 1 && <button className="text-slate-300 hover:text-red-500" onClick={() => { setSolicitudes(prev => prev.filter((_, i) => i !== index)); setCurrentSolicitudIndex(0); }}><Trash2 className="h-4 w-4"/></button>}
                  </div>
                ))}
                <Button onClick={addTrabajador} className="w-full mt-4 h-11 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase shadow-md"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Trabajador</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
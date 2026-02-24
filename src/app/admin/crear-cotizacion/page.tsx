'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, PlusCircle, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

import Paso1DatosGenerales from '@/components/cotizacion/Paso1DatosGenerales';
import Paso2SeleccionExamenes from '@/components/cotizacion/Paso2SeleccionExamenes';

import type { Empresa, Solicitante, Examen } from '@/lib/types';
import type { SolicitudTrabajador } from '@/types/models';

function CrearCotizacionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [empresa, setEmpresa] = useState<Empresa>({ rut: '', razonSocial: '', direccion: '', giro: '', ciudad: '', comuna: '', region: '', email: '' });
  const [solicitante, setSolicitante] = useState<Solicitante>({ nombre: '', rut: '', cargo: '', centroDeCostos: '', mail: '' });
  const [solicitudes, setSolicitudes] = useState<SolicitudTrabajador[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [originalRequestId, setOriginalRequestId] = useState<string | null>(null);

  useEffect(() => {
    const solicitudParam = searchParams.get('solicitud');
    if (solicitudParam) {
      try {
        const data = JSON.parse(decodeURIComponent(solicitudParam));
        if (data.empresa) setEmpresa(data.empresa);
        if (data.solicitante) setSolicitante(data.solicitante);
        if (data.solicitudes) setSolicitudes(data.solicitudes);
        if (data.originalRequestId) setOriginalRequestId(data.originalRequestId);
      } catch (e) { console.error("Error importación"); }
    } else if (solicitudes.length === 0) {
      setSolicitudes([{ id: crypto.randomUUID(), trabajador: { nombre: '', rut: '', cargo: '', fechaNacimiento: '', fechaAtencion: '' }, examenes: [] }]);
    }
  }, [searchParams]);

  const validateWorker = (sol: SolicitudTrabajador) => {
    return sol.trabajador.nombre && sol.trabajador.rut && sol.examenes.length > 0;
  };

  const handleSaveCotizacion = async () => {
    if (solicitudes.some(s => !validateWorker(s))) {
        toast({ variant: "destructive", title: "Inconsistencia", description: "Todos los trabajadores deben tener datos y exámenes." });
        return;
    }
    setIsSubmitting(true);
    try {
      const total = solicitudes.reduce((acc, s) => acc + s.examenes.reduce((sum, e) => sum + (Number(e.valor) || 0), 0), 0);
      
      // ------------------------------------------------------------------
      // REGLA DE NEGOCIO CORREGIDA: Bypass robusto para Clientes Frecuentes
      // ------------------------------------------------------------------
      const modalidad = (empresa.modalidadFacturacion || '').toLowerCase();
      // Detecta si dice frecuente sin importar mayúsculas/minúsculas, o si tiene un boolean true
      const isFrecuente = modalidad === 'frecuente' || (empresa as any).isFrecuente === true;
      const finalStatus = isFrecuente ? 'PAGADO' : 'CONFIRMADA';

      const docData = { 
        empresaData: empresa, 
        solicitanteData: solicitante, 
        solicitudesData: solicitudes, 
        total, 
        status: finalStatus, 
        fechaCreacion: serverTimestamp(), 
        originalRequestId 
      };

      await addDoc(collection(firestore, 'cotizaciones'), docData);
      
      if (originalRequestId) {
        await updateDoc(doc(firestore, 'solicitudes_publicas', originalRequestId), { estado: 'procesada' });
      }
      
      toast({ 
        title: isFrecuente ? "Orden Enviada a Consolidación" : "Cotización Creada",
        description: isFrecuente ? "Bypass aplicado. Movido a Pagados." : "Esperando envío de correo."
      });
      
      router.push('/cotizaciones-guardadas');
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Error", description: e.message }); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const addTrabajador = () => {
    if (!validateWorker(solicitudes[currentIndex])) {
        toast({ variant: "destructive", title: "Bloqueado", description: "Complete al trabajador actual antes de añadir otro." });
        return;
    }
    setSolicitudes(prev => [...prev, { id: crypto.randomUUID(), trabajador: { nombre: '', rut: '', cargo: '', fechaNacimiento: '', fechaAtencion: '' }, examenes: [] }]);
    setCurrentIndex(solicitudes.length);
    setStep(1);
  };

  const currentSol = solicitudes[currentIndex];
  if (!currentSol) return null;

  return (
    <div className="space-y-8 pb-20 font-sans text-left">
      <div>
        <h1 className="text-2xl font-black uppercase text-slate-800 tracking-tighter italic">Generar Cotización</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portal Administrativo Araval</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <Card className="border-none shadow-2xl overflow-hidden bg-white">
            <Progress value={(step / 2) * 100} className="h-1.5 rounded-none bg-slate-100" />
            <div className="p-8">
              {step === 1 ? (
                <Paso1DatosGenerales empresa={empresa} setEmpresa={setEmpresa} trabajador={currentSol.trabajador} setTrabajador={(val: any) => { const news = [...solicitudes]; news[currentIndex].trabajador = typeof val === 'function' ? val(news[currentIndex].trabajador) : val; setSolicitudes(news); }} solicitante={solicitante} setSolicitante={setSolicitante} />
              ) : (
                <Paso2SeleccionExamenes selectedExams={currentSol.examenes} onExamToggle={(exam, checked) => {
                    setSolicitudes(prev => {
                        const copy = [...prev];
                        const exams = copy[currentIndex].examenes || [];
                        if (checked) { if (!exams.some(e => e.id === exam.id)) copy[currentIndex].examenes = [...exams, exam]; }
                        else { copy[currentIndex].examenes = exams.filter(e => e.id !== exam.id); }
                        return copy;
                    });
                }} showPrice={true} />
              )}

              <div className="mt-12 flex justify-between items-center border-t pt-8">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={step === 1} className="font-black uppercase text-[10px]">Atrás</Button>
                <Button onClick={step === 1 ? () => setStep(2) : handleSaveCotizacion} disabled={isSubmitting} className={`px-10 h-12 font-black uppercase text-[11px] ${step === 1 ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                  {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                  {step === 1 ? "Siguiente Paso" : "Generar Cotización"}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl bg-white overflow-hidden rounded-xl">
            <CardHeader className="p-4 bg-[#0a0a4d] border-b text-left">
                <CardTitle className="text-[10px] font-black uppercase text-white flex items-center gap-2 tracking-widest"><Users className="h-3 w-3 text-blue-400"/> Nómina Actual</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {solicitudes.map((s, index) => (
                <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${index === currentIndex ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent'}`}>
                  <button className="flex-grow text-left text-[11px] font-black uppercase truncate text-slate-700" onClick={() => { setCurrentIndex(index); setStep(1); }}>{index + 1}. {s.trabajador.nombre || "S/N"}</button>
                  {solicitudes.length > 1 && <button className="text-slate-300 hover:text-red-500" onClick={() => { setSolicitudes(prev => prev.filter((_, i) => i !== index)); setCurrentIndex(0); }}><Trash2 className="h-4 w-4"/></button>}
                </div>
              ))}
              <Button onClick={addTrabajador} className="w-full mt-4 h-11 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase shadow-md"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Trabajador</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CrearCotizacionPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-blue-600" /></div>}>
      <CrearCotizacionContent />
    </Suspense>
  );
}
'use client';

import { useAuth } from '@/lib/auth';
import { ShieldAlert, Loader2, Stethoscope } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { MedicoDashboard } from '@/components/medico/MedicoDashboard'; // <-- IMPORTANTE

export default function MedicoPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Verificando credenciales médicas...</p>
      </div>
    );
  }

  const isAuthorized = user?.role === 'medico' || user?.role === 'admin';

  if (!user || !isAuthorized) {
    return (
      <div className="container mx-auto max-w-2xl pt-20">
        <Alert variant="destructive">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>Esta sección es exclusiva para personal médico.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <main className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="bg-primary/10 p-3 rounded-full">
          <Stethoscope className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel Operativo de Laboratorio</h1>
          <p className="text-muted-foreground">Bienvenido. Gestión de órdenes de examen vigentes.</p>
        </div>
      </div>
      
      {/* AQUÍ SE CARGA LA LISTA REAL */}
      <MedicoDashboard /> 

    </main>
  );
}
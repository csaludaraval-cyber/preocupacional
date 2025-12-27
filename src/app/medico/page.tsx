'use client';

import { useAuth } from '@/lib/auth';
import { ShieldAlert, Loader2, Stethoscope } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function MedicoPage() {
  const { user, loading } = useAuth();

  // 1. Estado de carga
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Verificando credenciales médicas...</p>
      </div>
    );
  }

  // 2. Validación de Rol (Solo 'medico'. Admin puede entrar para auditar si lo deseas)
  const isAuthorized = user?.role === 'medico' || user?.role === 'admin';

  if (!user || !isAuthorized) {
    return (
      <div className="container mx-auto max-w-2xl pt-20">
        <Alert variant="destructive" className="border-2">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">Acceso Denegado</AlertTitle>
          <AlertDescription className="text-base">
            Esta sección está restringida exclusivamente para el personal médico de laboratorio. 
            Si cree que esto es un error, contacte al administrador del sistema.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 3. Renderizado del Dashboard (Placeholder para el Paso 3)
  return (
    <main className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="bg-primary/10 p-3 rounded-full">
          <Stethoscope className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel Operativo de Laboratorio</h1>
          <p className="text-muted-foreground">Bienvenido, {user.email}. Gestión de órdenes de examen pagadas.</p>
        </div>
      </div>

      <div className="grid h-[400px] place-items-center border-2 border-dashed rounded-xl bg-muted/30">
         <p className="text-muted-foreground italic">La lista de pacientes se cargará en el siguiente paso...</p>
      </div>
    </main>
  );
}

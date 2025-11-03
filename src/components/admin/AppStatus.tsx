
'use client';

import { Activity, CheckCircle2, AlertCircle, Shield, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirebase } from '@/firebase/provider';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/lib/auth';

const StatusIndicator = ({ status, text }: { status: 'operational' | 'error' | 'loading', text: string }) => {
    return (
        <div className="flex items-center justify-between p-4 border-b last:border-b-0">
            <span className="font-medium">{text}</span>
            {status === 'loading' && <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />}
            {status === 'operational' && <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Operacional</span>
            </div>}
            {status === 'error' && <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">Error</span>
            </div>}
        </div>
    )
}


export function AppStatus() {
  const { user, loading: authLoading } = useAuth(); // Standard auth from lib
  const { areServicesAvailable, isUserLoading, userError, firebaseApp, firestore, auth } = useFirebase();

  if (authLoading) {
     return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (user?.role !== 'admin') {
    return (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
            <Shield className="h-4 w-4" />
            <AlertTitle>Acceso Denegado</AlertTitle>
            <AlertDescription>
                No tienes permisos para acceder a esta sección.
            </Alerc/components/admin/AppStatus.tsxtDescription>
        </Alert>
    );
  }

  // isLoading now considers both the central user loading and auth provider loading
  const isLoading = isUserLoading || authLoading;

  const getServiceStatus = (service: any) => {
    if (isLoading) return 'loading';
    return areServicesAvailable && service ? 'operational' : 'error';
  }

  const authStatus = getServiceStatus(auth);
  const firestoreStatus = getServiceStatus(firestore);
  const appStatus = getServiceStatus(firebaseApp);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-3xl flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary"/>
            Estado del Sistema
        </CardTitle>
        <CardDescription>
          Monitoreo en tiempo real del estado de los servicios de la aplicación. Si algún servicio falla, contacte a soporte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
            <StatusIndicator status={appStatus} text="Conexión con Firebase" />
            <StatusIndicator status={authStatus} text="Servicio de Autenticación" />
            <StatusIndicator status={firestoreStatus} text="Base de Datos (Firestore)" />
        </div>

        {(userError || (authStatus === 'error' || firestoreStatus === 'error' || appStatus === 'error')) && (
            <Alert variant="destructive" className="mt-6">
              <XCircle className="h-4 w-4" />
              <AlertTitle>¡Alerta de Servicio!</AlertTitle>
              <AlertDescription>
                Uno o más servicios no están operando correctamente. La funcionalidad de la aplicación puede estar comprometida. 
                Por favor, informe a soporte técnico para que investiguen el problema.
                {userError && <pre className='mt-2 text-xs bg-destructive/10 p-2 rounded-md'>{userError.message}</pre>}
                {!areServicesAvailable && !userError && <p className='mt-2'>El proveedor de Firebase no pudo inicializar los servicios.</p>}
              </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

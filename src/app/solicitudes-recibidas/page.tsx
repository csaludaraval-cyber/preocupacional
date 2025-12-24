import { AdminSolicitudes } from '@/components/admin/AdminSolicitudes';
import { Suspense } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export default function SolicitudesRecibidasPage() {
  return (
    <FirebaseClientProvider>
        <Suspense fallback={<p>Cargando solicitudes...</p>}>
            <AdminSolicitudes />
        </Suspense>
    </FirebaseClientProvider>
  );
}

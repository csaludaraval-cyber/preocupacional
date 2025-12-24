import AdminCotizaciones from '@/components/admin/AdminCotizaciones';
import { Suspense } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';


export default function CotizacionesGuardadasPage() {
  return (
    <FirebaseClientProvider>
        <Suspense fallback={<p>Cargando cotizaciones...</p>}>
            <AdminCotizaciones />
        </Suspense>
    </FirebaseClientProvider>
  );
}

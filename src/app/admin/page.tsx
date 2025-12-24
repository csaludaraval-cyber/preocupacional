import { AdminCatalogo } from '@/components/admin/AdminCatalogo';
import { Suspense } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export default function AdminPage() {
  return (
    <FirebaseClientProvider>
        <Suspense fallback={<p>Cargando...</p>}>
            <AdminCatalogo />
        </Suspense>
    </FirebaseClientProvider>
  );
}

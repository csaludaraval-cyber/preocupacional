
import { AdminClientes } from '@/components/admin/AdminClientes';
import { Suspense } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export default function AdminClientesPage() {
  return (
    <FirebaseClientProvider>
        <Suspense fallback={<p>Cargando clientes...</p>}>
            <AdminClientes />
        </Suspense>
    </FirebaseClientProvider>
  );
}

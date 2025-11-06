
import { Header } from '@/components/layout/Header';
import { AdminClientes } from '@/components/admin/AdminClientes';
import { Suspense } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export default function AdminClientesPage() {
  return (
    <FirebaseClientProvider>
        <div className="min-h-screen w-full bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 md:px-6">
            <Suspense fallback={<p>Cargando clientes...</p>}>
                <AdminClientes />
            </Suspense>
        </main>
        </div>
    </FirebaseClientProvider>
  );
}

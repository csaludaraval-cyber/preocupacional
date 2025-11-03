
import { Header } from '@/components/layout/Header';
import { AppStatus } from '@/components/admin/AppStatus';
import { Suspense } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export default function StatusPage() {
  return (
    <div className="min-h-screen w-full bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 md:px-6">
        <FirebaseClientProvider>
            <Suspense fallback={<p>Cargando estado del sistema...</p>}>
                <AppStatus />
            </Suspense>
        </FirebaseClientProvider>
      </main>
    </div>
  );
}

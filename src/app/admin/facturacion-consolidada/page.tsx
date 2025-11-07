
import { Header } from '@/components/layout/Header';
import { AdminFacturacionConsolidada } from '@/components/admin/AdminFacturacionConsolidada';
import { Suspense } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export default function FacturacionConsolidadaPage() {
  return (
    <FirebaseClientProvider>
        <div className="min-h-screen w-full bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 md:px-6">
            <Suspense fallback={<p>Cargando datos de facturación...</p>}>
                <AdminFacturacionConsolidada />
            </Suspense>
        </main>
        </div>
    </FirebaseClientProvider>
  );
}

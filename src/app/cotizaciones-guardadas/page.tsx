import { Header } from '@/components/layout/Header';
import { AdminCotizaciones } from '@/components/admin/AdminCotizaciones';
import { Suspense } from 'react';

export default function CotizacionesGuardadasPage() {
  return (
    <div className="min-h-screen w-full bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 md:px-6">
        <Suspense fallback={<p>Cargando cotizaciones...</p>}>
            <AdminCotizaciones />
        </Suspense>
      </main>
    </div>
  );
}

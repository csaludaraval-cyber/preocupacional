import { Header } from '@/components/layout/Header';
import { AdminSolicitudes } from '@/components/admin/AdminSolicitudes';
import { Suspense } from 'react';

export default function SolicitudesRecibidasPage() {
  return (
    <div className="min-h-screen w-full bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 md:px-6">
        <Suspense fallback={<p>Cargando solicitudes...</p>}>
            <AdminSolicitudes />
        </Suspense>
      </main>
    </div>
  );
}

    
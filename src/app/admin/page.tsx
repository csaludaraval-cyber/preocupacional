import { Header } from '@/components/layout/Header';
import { AdminCatalogo } from '@/components/admin/AdminCatalogo';
import { Suspense } from 'react';

export default function AdminPage() {
  return (
    <div className="min-h-screen w-full bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 md:px-6">
        <Suspense fallback={<p>Cargando...</p>}>
            <AdminCatalogo />
        </Suspense>
      </main>
    </div>
  );
}

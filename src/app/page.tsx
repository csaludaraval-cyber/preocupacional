
// src/app/page.tsx
import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { CrearCotizacion } from '@/components/cotizacion/CrearCotizacion';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Sidebar } from '@/components/layout/Sidebar';

export default function Home() {
  return (
    <FirebaseClientProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar />
        <div className="flex flex-col flex-grow">
          <Header />
          <main className="container mx-auto px-4 py-8 md:px-6">
            <Suspense fallback={<div>Cargando contenido...</div>}>
              <CrearCotizacion />
            </Suspense>
          </main>
        </div>
      </div>
    </FirebaseClientProvider>
  );
}

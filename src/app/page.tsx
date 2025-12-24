
// src/app/page.tsx
import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { CrearCotizacion } from '@/components/cotizacion/CrearCotizacion';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export default function Home() {
  return (
    <FirebaseClientProvider>
      <div className="min-h-screen w-full bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 md:px-6">
          {/* ENVOLVER el contenido principal con Suspense */}
          <Suspense fallback={<div>Cargando contenido...</div>}>
            <div className="mt-8">
              <CrearCotizacion />
            </div>
          </Suspense>
        </main>
      </div>
    </FirebaseClientProvider>
  );
}

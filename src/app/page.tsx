// src/app/page.tsx
import { Suspense } from 'react';
import { CrearCotizacion } from '@/components/cotizacion/CrearCotizacion';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export default function Home() {
  return (
    <FirebaseClientProvider>
      <Suspense fallback={<div>Cargando contenido...</div>}>
        <CrearCotizacion />
      </Suspense>
    </FirebaseClientProvider>
  );
}

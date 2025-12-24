import { VistaCotizacion } from '@/components/cotizacion/VistaCotizacion';
import { Suspense } from 'react';

export default function CotizacionPage() {
  return (
    <main className="container mx-auto px-4 py-8 md:px-6">
      <Suspense fallback={<div className="text-center">Cargando cotización...</div>}>
        <VistaCotizacion />
      </Suspense>
    </main>
  );
}


import { AdminFacturacionConsolidada } from '@/components/admin/AdminFacturacionConsolidada';
import { Suspense } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export default function FacturacionConsolidadaPage() {
  return (
    <FirebaseClientProvider>
        <Suspense fallback={<p>Cargando datos de facturación...</p>}>
            <AdminFacturacionConsolidada />
        </Suspense>
    </FirebaseClientProvider>
  );
}

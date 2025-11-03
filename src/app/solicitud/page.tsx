import { Header } from '@/components/layout/Header';
import { FormularioSolicitud } from '@/components/solicitud/FormularioSolicitud';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export default function SolicitudPage() {
  return (
    <FirebaseClientProvider>
        <div className="min-h-screen w-full bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 md:px-6">
            <FormularioSolicitud />
        </main>
        </div>
    </FirebaseClientProvider>
  );
}

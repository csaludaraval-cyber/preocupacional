import { Header } from '@/components/layout/Header';
import { CrearCotizacion } from '@/components/cotizacion/CrearCotizacion';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import AITimer from '@/components/AITimer';


export default function Home() {
  return (
    <FirebaseClientProvider>
        <div className="min-h-screen w-full bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 md:px-6">
            <AITimer />
            <div className="mt-8">
              <CrearCotizacion />
            </div>
        </main>
        </div>
    </FirebaseClientProvider>
  );
}

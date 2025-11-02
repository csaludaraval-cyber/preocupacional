import { Header } from '@/components/layout/Header';
import { CrearCotizacion } from '@/components/cotizacion/CrearCotizacion';

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 md:px-6">
        <CrearCotizacion />
      </main>
    </div>
  );
}

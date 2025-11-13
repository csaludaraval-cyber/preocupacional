
import type { Metadata } from 'next';
import './globals.css';
import { ClientOnly } from '@/components/ClientOnly';
import { Loader2 } from 'lucide-react';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Araval Cotizaciones',
  description: 'Sistema de Gestión de Cotizaciones',
};

const FullscreenLoader = () => (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ClientOnly fallback={<FullscreenLoader />}>
            <Providers>
                {children}
            </Providers>
        </ClientOnly>
      </body>
    </html>
  );
}

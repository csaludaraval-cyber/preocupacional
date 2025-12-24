// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import AppWrapper from './AppWrapper';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar'; // Importar nuevo Sidebar

export const metadata: Metadata = {
  title: 'Araval Preocupacional', // Título actualizado
  description: 'Sistema de Gestión de Exámenes Preocupacionales',
};

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="es">
       <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AppWrapper>
          <div className="flex min-h-screen">
            <Sidebar /> {/* Sidebar a la izquierda */}
            <div className="flex-1 flex flex-col">
              <Header /> {/* Header se mantiene, puede ajustarlo si es necesario */}
              <main className="flex-1 p-6 lg:p-8 bg-background overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        </AppWrapper>
      </body>
    </html>
  );
}
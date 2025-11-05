import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster'; // IMPORTACIÓN CORREGIDA (con llaves)

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Aravai Cotizaciones',
  description: 'Sistema de cotizaciones y administración de exámenes de laboratorio.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <Toaster /> 
      </body>
    </html>
  );
}

'use client';

import { type ReactNode } from 'react';
import { ClientOnly } from '@/components/ClientOnly';
import Providers from '@/components/Providers';
import { Toaster } from 'sonner';

/**
 * Este componente es el primer componente de cliente después del RootLayout de servidor.
 * Contiene la estructura principal, el aislamiento de la hidratación (ClientOnly),
 * y todos los proveedores de contexto. Al ser 'use client', y contener ClientOnly,
 * garantiza que todo el DOM de cliente se monte después de la capa de servidor.
 */
export default function AppWrapper({ children }: { children: ReactNode }) {
  return (
    // Aplicamos el aislamiento total a todo el contenido de la aplicación.
    <ClientOnly>
      {/* Movemos los Providers y el Toaster DENTRO del componente ClientOnly */}
      <Providers>
          {children}
      </Providers>
      <Toaster position="bottom-right" richColors />
    </ClientOnly>
  );
}

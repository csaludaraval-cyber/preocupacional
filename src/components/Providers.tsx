'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import { FirebaseClientProvider } from '@/firebase/client-provider';

/**
 * Agrupa todos los providers y librerías que deben ejecutarse EXCLUSIVAMENTE
 * en el entorno del cliente para evitar errores de hidratación (mismatch).
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </FirebaseClientProvider>
  );
}

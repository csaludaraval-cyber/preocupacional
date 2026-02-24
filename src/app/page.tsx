'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirección inmediata al flujo administrativo actual
    router.push('/solicitudes-recibidas');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <Loader2 className="h-10 w-10 animate-spin text-[#0a0a4d] mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        Iniciando Sistema Araval...
      </p>
    </div>
  );
}

'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verificando acceso Araval...</p>
      </div>
    </div>
  );
}
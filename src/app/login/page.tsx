'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Mail, ChevronRight } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = '/';
    } catch (error) {
      alert("Error: Credenciales inválidas para el portal ARAVAL.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f4f7fa] p-4 font-sans">
      
      <div className="w-full max-w-[420px] bg-white rounded-[30px] shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* CABECERA CORPORATIVA RECTA */}
        <div className="bg-[#0a0a4d] p-12 flex flex-col items-center justify-center text-white">
          <div className="mb-6">
            <Image
              src="/images/logo2.png"
              alt="ARAVAL Centro de Salud"
              width={180}
              height={70}
              className="object-contain"
              priority
            />
          </div>
          <h2 className="text-xl font-black tracking-tighter uppercase">Portal Interno</h2>
          <p className="text-blue-300 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Gestión de Salud Ocupacional</p>
        </div>

        {/* FORMULARIO */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-500 font-bold ml-1 text-[10px] uppercase">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@araval.cl"
                  className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0a0a4d]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-500 font-bold ml-1 text-[10px] uppercase">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0a0a4d]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 bg-[#0a0a4d] hover:bg-blue-900 text-white font-black uppercase tracking-widest rounded-xl transition-all mt-4"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  Entrar al Sistema <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </div>

        <div className="p-6 border-t border-slate-50 text-center bg-slate-50/50">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
            © {new Date().getFullYear()} ARAVAL SALUD | Acceso Protegido
          </p>
        </div>
      </div>
    </div>
  );
}
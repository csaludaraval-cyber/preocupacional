'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, LogOut, FileText, Inbox, History, FileClock, Shield, Users, Activity, Stethoscope, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (pathname === '/login' || pathname === '/solicitud') return <div className="min-h-screen bg-[#f4f7fa]">{children}</div>;

  const getNavLinks = () => {
    const role = String(user?.role || 'standard');
    if (role === 'admin' || role === 'superadmin') {
        return [
            { href: '/balance', label: 'Balance Mensual', icon: Activity },
            { href: '/', label: 'Crear Cotización', icon: FileText },
            { href: '/solicitudes-recibidas', label: 'Solicitudes', icon: Inbox },
            { href: '/cotizaciones-guardadas', label: 'Cotizaciones', icon: History },
            { href: '/admin/facturacion-consolidada', label: 'Facturación', icon: FileClock },
            { href: '/admin/historial', label: 'Facturas Emitidas', icon: List },
            { href: '/admin', label: 'Catálogo', icon: Shield },
            { href: '/admin/clientes', label: 'Clientes', icon: Users },
        ];
    }
    if (role === 'medico') return [{ href: '/medico', label: 'Órdenes Pendientes', icon: Stethoscope }];
    return [{ href: '/solicitud', label: 'Solicitar Examen', icon: FileText }];
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0a0a4d] text-white p-4 font-sans">
      <div className="px-2 py-8 mb-6 border-b border-white/5 text-left">
        <Image src="/images/logo2.png" alt="Logo Araval" width={140} height={70} priority className="brightness-0 invert" />
      </div>
      <nav className="flex-grow space-y-1 overflow-y-auto">
        {getNavLinks().map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={() => setIsOpen(false)} className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-[12px] font-black uppercase", pathname === href ? "bg-blue-600 text-white shadow-lg" : "text-blue-100/60 hover:bg-white/5")}>
            <Icon className="w-4 h-4" /> {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-white/10 text-left">
        <Button variant="ghost" className="w-full justify-start text-blue-200 hover:text-white font-black text-[11px] uppercase tracking-widest" onClick={() => firebaseSignOut(auth)}>
          <LogOut className="w-4 h-4 mr-3" /> Cerrar Sesión
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f4f7fa] overflow-hidden">
      <aside className="hidden lg:flex w-64 flex-shrink-0"><SidebarContent /></aside>
      <div className="flex flex-col flex-grow w-full relative">
        <header className="lg:hidden flex items-center justify-between p-4 bg-[#0a0a4d] text-white shadow-md">
          <div className="flex flex-col text-left font-black tracking-tighter uppercase italic text-lg text-white">ARAVAL</div>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="text-white"><Menu className="w-7 h-7" /></Button></SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-[#0a0a4d] border-none shadow-2xl"><SidebarContent /></SheetContent>
          </Sheet>
        </header>
        <main className="flex-grow overflow-y-auto p-4 md:p-10"><div className="max-w-7xl mx-auto">{children}</div></main>
      </div>
    </div>
  );
}
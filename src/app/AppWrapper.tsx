'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, LogOut, FileText, Inbox, History, FileClock, Shield, Users, Stethoscope, List } from 'lucide-react';
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

  const navLinks = user?.role === 'admin' ? [
    { href: '/solicitudes-recibidas', label: 'Solicitudes', icon: Inbox },
    { href: '/cotizaciones-guardadas', label: 'Cotizaciones', icon: History },
    { href: '/admin/crear-cotizacion', label: 'Crear Cotización', icon: FileText },
    { href: '/admin/facturacion-consolidada', label: 'Facturación', icon: FileClock },
    { href: '/admin/historial', label: 'Facturas Emitidas', icon: List },
    { href: '/admin', label: 'Catálogo', icon: Shield },
    { href: '/admin/clientes', label: 'Clientes', icon: Users },
  ] : [{ href: '/medico', label: 'Órdenes', icon: Stethoscope }];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0a0a4d] text-white p-4 font-sans shadow-2xl">
      <div className="px-2 py-8 mb-6 border-b border-white/5"><Image src="/images/logo2.png" alt="Araval" width={140} height={70} priority /></div>
      <nav className="flex-grow space-y-1 overflow-y-auto">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={() => setIsOpen(false)}
            className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-[13px] font-black uppercase tracking-tighter", pathname === href ? "bg-blue-600 text-white shadow-lg" : "text-blue-100/60 hover:bg-white/5")}
          >
            <Icon className={cn("w-4 h-4", pathname === href ? "text-white" : "text-blue-400")} /> {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-white/10">
        <Button variant="ghost" className="w-full justify-start text-blue-200 hover:text-white hover:bg-red-500/10 font-black text-[11px] uppercase" onClick={async () => { await firebaseSignOut(auth); window.location.href = '/login'; }}>
          <LogOut className="w-4 h-4 mr-3" /> Cerrar Sesión
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f4f7fa] overflow-hidden text-left">
      <aside className="hidden lg:flex w-64 flex-shrink-0"><SidebarContent /></aside>
      <div className="flex flex-col flex-grow w-full relative">
        <header className="lg:hidden flex items-center justify-between p-4 bg-[#0a0a4d] text-white z-50 shadow-md">
          <h1 className="font-black italic uppercase text-lg">ARAVAL</h1>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon"><Menu className="w-7 h-7" /></Button></SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-[#0a0a4d] border-none">
              <SheetHeader className="sr-only"><SheetTitle>Navegación</SheetTitle></SheetHeader>
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-grow overflow-y-auto p-4 md:p-10"><div className="max-w-7xl mx-auto">{children}</div></main>
      </div>
    </div>
  );
}
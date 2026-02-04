'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  Menu, LogOut, FileText, Inbox, History, 
  FileClock, Shield, Users, Activity, 
  Stethoscope, List 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Sheet, SheetContent, SheetTrigger, 
  SheetHeader, SheetTitle, SheetDescription 
} from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // EXCEPCIONES DE LAYOUT (Sin Sidebar)
  const isLoginPage = pathname === '/login';
  const isPublicForm = pathname === '/solicitud';

  if (isLoginPage || isPublicForm) {
    return <div className="min-h-screen bg-[#f4f7fa]">{children}</div>;
  }

  const getNavLinks = () => {
    switch (user?.role) {
        case 'admin':
            return [
                { href: '/', label: 'Crear Cotización', icon: FileText },
                { href: '/solicitudes-recibidas', label: 'Solicitudes', icon: Inbox },
                { href: '/cotizaciones-guardadas', label: 'Cotizaciones', icon: History },
                { href: '/admin/facturacion-consolidada', label: 'Facturación', icon: FileClock },
                { href: '/admin/historial', label: 'Facturas Emitidas', icon: List },
                { href: '/admin', label: 'Catálogo', icon: Shield },
                { href: '/admin/clientes', label: 'Clientes', icon: Users },
                { href: '/admin/status', label: 'Sistema', icon: Activity },
            ];
        case 'medico':
            return [{ href: '/medico', label: 'Órdenes Pendientes', icon: Stethoscope }];
        default:
            return [{ href: '/solicitud', label: 'Solicitar Examen', icon: FileText }];
    }
  };

  const navLinks = getNavLinks();

  const handleLogout = async () => {
    await firebaseSignOut(auth);
    window.location.href = '/login';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0a0a4d] text-white p-4 font-sans">
      <div className="px-2 py-6 mb-6">
        <Image src="/images/logo2.png" alt="Logo Araval" width={140} height={70} priority />
      </div>
      <nav className="flex-grow space-y-1 overflow-y-auto">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link 
              key={href} 
              href={href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-bold",
                isActive ? "bg-blue-600 text-white shadow-md" : "text-blue-100 hover:bg-white/10"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-blue-400")} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-4 border-t border-white/10">
        <Button variant="ghost" className="w-full justify-start text-blue-200 hover:text-white hover:bg-red-500/10 font-bold" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-3" /> Cerrar Sesión
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f4f7fa] overflow-hidden">
      <aside className="hidden lg:flex w-64 flex-shrink-0">
        <SidebarContent />
      </aside>
      <div className="flex flex-col flex-grow w-full">
        <header className="lg:hidden flex items-center justify-between p-4 bg-[#0a0a4d] text-white shadow-md">
          <div className="flex flex-col">
            <h1 className="font-black text-lg leading-none tracking-tight">ARAVAL</h1>
            <span className="text-[8px] font-bold text-blue-300 uppercase">Centro de Salud</span>
          </div>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white"><Menu className="w-7 h-7" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-[#0a0a4d] border-none">
              <SheetHeader className="sr-only"><SheetTitle>Menú Araval</SheetTitle><SheetDescription>Navegación</SheetDescription></SheetHeader>
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-grow overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
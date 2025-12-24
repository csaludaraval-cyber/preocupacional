
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { FileText, Shield, History, Inbox, Activity, Users, FileClock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const NavLink = ({ href, path, icon: Icon, label }: { href: string; path: string; icon: React.ElementType; label: string }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <Link
            href={href}
            className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8',
                path === href && 'bg-accent text-accent-foreground'
            )}
            >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{label}</span>
            </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
);

export function SidebarContent() {
    const pathname = usePathname();
    const { user } = useAuth();
    
    return (
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
            <Link
              href="/"
              className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
            >
              <Image src="/images/logo.png" alt="Araval Logo" width={24} height={24} className="transition-all group-hover:scale-110" />
              <span className="sr-only">Araval</span>
            </Link>
            
            {user && (
                 <NavLink href="/" path={pathname} icon={FileText} label="Crear Cotización" />
            )}
            {user?.role === 'admin' && (
                <>
                    <NavLink href="/solicitudes-recibidas" path={pathname} icon={Inbox} label="Solicitudes Recibidas" />
                    <NavLink href="/cotizaciones-guardadas" path={pathname} icon={History} label="Ver Cotizaciones" />
                    <NavLink href="/admin/facturacion-consolidada" path={pathname} icon={FileClock} label="Facturación Consolidada" />
                    <NavLink href="/admin" path={pathname} icon={Shield} label="Administrar Catálogo" />
                    <NavLink href="/admin/clientes" path={pathname} icon={Users} label="Gestionar Clientes" />
                    <NavLink href="/admin/status" path={pathname} icon={Activity} label="Estado del Sistema" />
                </>
            )}
        </nav>
    )
}


export function Sidebar() {

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-card sm:flex print:hidden">
        <TooltipProvider>
            <SidebarContent />
        </TooltipProvider>
    </aside>
  );
}

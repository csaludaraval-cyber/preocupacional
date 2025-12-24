"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, FileText, History, Shield, Inbox, Activity, Users, FileClock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

const NavLink = ({ href, path, children }: { href: string; path: string; children: React.ReactNode }) => (
    <Link
      href={href}
      className={cn(
        'transition-colors hover:text-primary',
        path === href ? 'text-primary font-semibold' : 'text-card-foreground/80'
      )}
    >
      {children}
    </Link>
  );

export function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm print:hidden">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Araval Logo" width={32} height={32} />
          </Link>
           <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
                {user && (
                    <NavLink href="/" path={pathname}>Crear Cotización</NavLink>
                )}
                {user?.role === 'admin' && (
                    <>
                        <NavLink href="/solicitudes-recibidas" path={pathname}>Solicitudes</NavLink>
                        <NavLink href="/cotizaciones-guardadas" path={pathname}>Cotizaciones</NavLink>
                        <NavLink href="/admin/facturacion-consolidada" path={pathname}>Facturación</NavLink>
                        <NavLink href="/admin" path={pathname}>Catálogo</NavLink>
                        <NavLink href="/admin/clientes" path={pathname}>Clientes</NavLink>
                        <NavLink href="/admin/status" path={pathname}>Sistema</NavLink>
                    </>
                )}
           </nav>
        </div>

        <div className="flex items-center gap-4">
          {loading ? (
             <Skeleton className="h-8 w-24" />
          ) : user ? (
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-card-foreground/80 hidden sm:inline">
                    {user.email}
                </span>
                <Button variant="ghost" size="icon" onClick={logout}>
                    <LogOut className="h-5 w-5 text-card-foreground" />
                </Button>
            </div>
          ) : (
             <Button asChild>
                <Link href="/solicitud">
                  Solicitar Exámenes
                </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

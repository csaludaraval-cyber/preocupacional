
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Shield, User as UserIcon, LogOut } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';

export function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  const navLinkClasses = (path: string) =>
    cn(
      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
      pathname === path
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    );

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" />
          <span className="font-headline text-xl font-bold text-foreground">
            Araval Cotizaciones
          </span>
        </Link>
        <nav className="hidden items-center gap-4 md:flex">
          <Link href="/" className={navLinkClasses('/')}>
            <FileText className="h-4 w-4" />
            Crear Cotización
          </Link>
          {user?.role === 'admin' && (
            <Link href="/admin" className={navLinkClasses('/admin')}>
              <Shield className="h-4 w-4" />
              Administrar Catálogo
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-4">
          {loading ? (
             <Skeleton className="h-8 w-24" />
          ) : user ? (
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
                    {user.email}
                </span>
                <Button variant="ghost" size="icon" onClick={logout}>
                    <LogOut className="h-5 w-5 text-muted-foreground"/>
                </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

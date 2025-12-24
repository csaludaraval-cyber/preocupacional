"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Sidebar } from './Sidebar';


export function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm print:hidden">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6 md:hidden">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Menu className="h-5 w-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64 border-r-0">
                    <Sidebar />
                </SheetContent>
            </Sheet>
        </div>
        
        <div className="flex-1" />

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

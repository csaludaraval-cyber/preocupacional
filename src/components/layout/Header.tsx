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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-sidebar-background px-6 print:hidden">
        <div className="flex items-center gap-6 md:hidden">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 bg-transparent border-sidebar-foreground/50 text-sidebar-foreground hover:bg-white/10 hover:text-white">
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
             <Skeleton className="h-8 w-24 bg-white/10" />
          ) : user ? (
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-sidebar-foreground hidden sm:inline">
                    {user.email}
                </span>
                <Button variant="ghost" size="icon" onClick={logout} className="text-sidebar-foreground hover:bg-white/10 hover:text-white">
                    <LogOut className="h-5 w-5" />
                </Button>
            </div>
          ) : (
             <Button asChild variant="outline" className="bg-transparent border-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground">
                <Link href="/solicitud">
                  Solicitar Exámenes
                </Link>
            </Button>
          )}
        </div>
    </header>
  );
}

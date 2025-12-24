
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { SidebarContent } from './Sidebar';


export function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card/80 px-4 backdrop-blur-sm sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 print:hidden">
       <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="sm:hidden text-card-foreground">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sm:max-w-xs bg-card text-card-foreground">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      <div className="ml-auto flex items-center gap-4">
        {loading ? (
           <Skeleton className="h-8 w-24" />
        ) : user ? (
          <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-card-foreground hidden sm:inline">
                  {user.email}
              </span>
              <Button variant="ghost" size="icon" onClick={logout}>
                  <LogOut className="h-5 w-5 text-card-foreground" />
              </Button>
          </div>
        ) : (
          <Button asChild variant="secondary">
            <Link href="/solicitud">
              Solicitar Exámenes
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}

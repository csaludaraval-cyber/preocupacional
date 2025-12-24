// src/components/layout/Sidebar.tsx
"use client";
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, FileClock, Inbox, History, Shield, Activity, Users } from 'lucide-react'; // Importar iconos
import { useAuth } from '@/lib/auth';


export const Sidebar = () => {
    const pathname = usePathname();
    const { user } = useAuth();

    const navLinks = user?.role === 'admin' ? [
        { href: '/', label: 'Crear Cotización', icon: FileText },
        { href: '/solicitudes-recibidas', label: 'Solicitudes', icon: Inbox },
        { href: '/cotizaciones-guardadas', label: 'Cotizaciones', icon: History },
        { href: '/admin/facturacion-consolidada', label: 'Facturación', icon: FileClock },
        { href: '/admin', label: 'Catálogo', icon: Shield },
        { href: '/admin/clientes', label: 'Clientes', icon: Users },
        { href: '/admin/status', label: 'Sistema', icon: Activity },
    ] : [
        { href: '/solicitud', label: 'Solicitar Examen', icon: FileText },
    ];


    return (
        <aside className="w-64 flex-col bg-sidebar-background p-4 hidden md:flex print:hidden">
            <div className="px-2 py-4 mb-4">
                <Link href="/">
                    <Image src="/images/logo2.png" alt="Logo Araval" width={160} height={80} priority />
                </Link>
            </div>
            <nav className="flex flex-col gap-2">
                {navLinks.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                                isActive 
                                    ? 'bg-sidebar-active-background text-sidebar-active-foreground shadow-sm' 
                                    : 'text-sidebar-foreground hover:bg-white/10'
                            }`}
                        >
                            <Icon className="h-5 w-5" />
                            {label}
                        </Link>
                    );
                })}
            </nav>
            <div className="mt-auto text-center text-xs text-sidebar-foreground/50">
                <span>© {new Date().getFullYear()} ARAVAL SALUD</span>
            </div>
        </aside>
    );
};

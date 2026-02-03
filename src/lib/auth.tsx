'use client';

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useMemo, 
  type ReactNode 
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase'; 
import { Loader2 } from 'lucide-react';

// 1. DEFINICIÓN LOCAL DE TIPOS (Para evitar errores de importación)
export type AppUserRole = 'admin' | 'medico' | 'standard' | 'superadmin';

export interface AppUser extends FirebaseUser {
    uid: string;
    role: AppUserRole;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicRoutes = ['/login', '/crear-primer-admin', '/solicitud'];
const quoteRoute = '/cotizacion';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userWithRole, setUserWithRole] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const { user: firebaseUser, auth, firestore, isUserLoading } = useFirebase();

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (isUserLoading || !isClient) return;

    const processUser = async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          if (!firestore) throw new Error("Firestore not available");
          
          const adminRoleRef = doc(firestore, 'roles_admin', fbUser.uid);
          const adminRoleDoc = await getDoc(adminRoleRef);
          
          let userRole: AppUserRole = 'standard'; 

          if (adminRoleDoc.exists()) {
              const data = adminRoleDoc.data();
              userRole = (data.role as AppUserRole) || 'admin'; 
          }
          
          const finalUser = { ...fbUser, uid: fbUser.uid, role: userRole } as AppUser;
          setUserWithRole(finalUser);

          // 🚀 REDIRECCIÓN INTELIGENTE POST-LOGIN
          if (pathname === '/login' || pathname === '/') {
            if (userRole === 'medico') {
                router.push('/medico');
            } else if (userRole === 'admin' || userRole === 'superadmin') {
                if (pathname === '/login') router.push('/');
            }
        }

        } catch (error) {
          console.error("Error AuthProvider:", error);
          setUserWithRole({ ...fbUser, uid: fbUser.uid, role: 'standard' } as AppUser);
        } finally {
          setLoading(false);
        }
      } else {
        setUserWithRole(null);
        const isProtectedRoute = !publicRoutes.includes(pathname) && !pathname.startsWith(quoteRoute);
        if (isProtectedRoute) {
          router.push('/login');
        }
        setLoading(false);
      }
    };

    processUser(firebaseUser);
  }, [firebaseUser, isUserLoading, isClient, firestore, pathname, router]);

  const logout = async () => {
    if (!auth) return;
    setLoading(true);
    await signOut(auth);
    setUserWithRole(null);
    router.push('/login');
    setLoading(false);
  };
  
  const value = useMemo(() => ({ user: userWithRole, loading, logout }), [userWithRole, loading]);

  if (loading && isClient) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-center">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Sincronizando sesión segura...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
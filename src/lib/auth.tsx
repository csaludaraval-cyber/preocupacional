'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase'; 
import { Loader2 } from 'lucide-react';

export type AppUserRole = 'admin' | 'medico' | 'standard' | 'superadmin';
export interface AppUser extends FirebaseUser { uid: string; role: AppUserRole; }
interface AuthContextType { user: AppUser | null; loading: boolean; logout: () => Promise<void>; }
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const publicRoutes = ['/login', '/crear-primer-admin', '/solicitud'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userWithRole, setUserWithRole] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user: firebaseUser, auth, firestore, isUserLoading } = useFirebase();

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (isUserLoading || !isClient || !firestore) return;

    const processUser = async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setUserWithRole(null);
        setLoading(false);
        if (!publicRoutes.includes(pathname) && !pathname.startsWith('/cotizacion')) {
          router.replace('/login');
        }
        return;
      }

      try {
        const roleRef = doc(firestore, 'roles_admin', fbUser.uid);
        const roleSnap = await getDoc(roleRef);
        let userRole: any = 'standard'; 

        if (roleSnap.exists()) {
          const data = roleSnap.data();
          if (data.admin === true || data.role === 'admin' || data.role === 'superadmin') {
            userRole = 'admin';
          } else if (data.role === 'medico') {
            userRole = 'medico';
          }
        }
        
        setUserWithRole({ ...fbUser, uid: fbUser.uid, role: userRole as AppUserRole } as AppUser);

        if (pathname === '/login' || pathname === '/') {
          if (String(userRole) === 'admin' || String(userRole) === 'superadmin') {
            router.replace('/balance');
          } else if (String(userRole) === 'medico') {
            router.replace('/medico');
          } else {
            router.replace('/solicitud');
          }
        }
      } catch (e) {
        setUserWithRole({ ...fbUser, uid: fbUser.uid, role: 'standard' } as AppUser);
      } finally {
        setLoading(false);
      }
    };

    processUser(firebaseUser);
  }, [firebaseUser, isUserLoading, isClient, firestore, pathname, router]);

  const logout = async () => { if (auth) { setLoading(true); await signOut(auth); setUserWithRole(null); router.replace('/login'); setLoading(false); } };
  const value = useMemo(() => ({ user: userWithRole, loading, logout }), [userWithRole, loading]);

  if (loading && isClient) return <div className="flex h-screen w-full items-center justify-center bg-white"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth error');
  return context;
};
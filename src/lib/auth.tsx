"use client";
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '@/lib/firebase'; 
import { Loader2 } from 'lucide-react';

export type AppUserRole = 'admin' | 'medico' | 'standard' | 'superadmin';
export interface AppUser extends FirebaseUser { role: AppUserRole; }
const AuthContext = createContext<{user: AppUser | null, loading: boolean, logout: () => Promise<void>} | undefined>(undefined);
const publicRoutes = ['/login', '/crear-primer-admin', '/solicitud'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const roleSnap = await getDoc(doc(firestore, 'roles_admin', fbUser.uid));
          let userRole: AppUserRole = 'admin';
          if (roleSnap.exists()) {
            const data = roleSnap.data();
            userRole = data.role || (data.admin ? 'admin' : 'standard');
          }
          setUser({ ...fbUser, role: userRole } as AppUser);
        } catch (e) { setUser({ ...fbUser, role: 'admin' } as AppUser); }
      } else { setUser(null); }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user && !publicRoutes.includes(pathname)) router.replace('/login');
    if (user && pathname === '/login') router.replace(user.role === 'medico' ? '/medico' : '/solicitudes-recibidas');
  }, [user, loading, pathname]);

  const value = useMemo(() => ({ user, loading, logout: async () => { await signOut(auth); window.location.href='/login'; } }), [user, loading]);

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#f4f7fa] z-[9999]">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
    </div>
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth error");
  return context;
};
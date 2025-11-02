"use client";

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useMemo, 
  type ReactNode 
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from './firebase';
import type { User } from './types';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicRoutes = ['/login', '/crear-primer-admin', '/solicitud'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const adminRoleRef = doc(firestore, 'roles_admin', firebaseUser.uid);
        const adminRoleDoc = await getDoc(adminRoleRef);

        const userProfile: User = {
          ...firebaseUser,
          role: adminRoleDoc.exists() ? 'admin' : 'standard',
        };
        
        setUser(userProfile);
        
        // Redirect logic after user is identified
        if (pathname === '/login' || pathname === '/crear-primer-admin') {
            if (userProfile.role === 'admin') {
                router.push('/admin');
            } else {
                router.push('/');
            }
        }

      } else {
        setUser(null);
        // If user logs out or session expires, redirect to login if not already on a public page
        if (!publicRoutes.includes(pathname)) {
            router.push('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setUser(null);
    router.push('/login');
    // No es necesario setLoading(false) aquí porque el onAuthStateChanged se encargará.
  };
  
  const value = useMemo(() => ({
    user,
    loading,
    logout,
  }), [user, loading, logout]);
  
  const isPublicRoute = publicRoutes.includes(pathname);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPublicRoute && !user) {
    // No renderiza nada mientras redirige para evitar flashes de contenido.
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

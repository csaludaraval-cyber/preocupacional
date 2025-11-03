
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
import { signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase'; 
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
  const [userWithRole, setUserWithRole] = useState<User | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const { user: firebaseUser, auth, firestore, isUserLoading, areServicesAvailable } = useFirebase();

  useEffect(() => {
    // Wait until firebase services are actually available
    if (!areServicesAvailable) return;

    const checkUserRole = async (fbUser: FirebaseUser) => {
      if (!firestore) return;
      setLoadingRole(true);
      try {
        const adminRoleRef = doc(firestore, 'roles_admin', fbUser.uid);
        const adminRoleDoc = await getDoc(adminRoleRef);
        
        const extendedUser: User = {
          ...fbUser,
          role: adminRoleDoc.exists() ? 'admin' : 'standard',
        };
        
        setUserWithRole(extendedUser);

        if (pathname === '/login' || pathname === '/crear-primer-admin') {
            if (extendedUser.role === 'admin') {
                router.push('/admin');
            } else {
                router.push('/');
            }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserWithRole(fbUser as User); 
      } finally {
        setLoadingRole(false);
      }
    };
    
    if (firebaseUser) {
      checkUserRole(firebaseUser);
    } else if (!isUserLoading) {
      setUserWithRole(null);
      setLoadingRole(false);
      if (!publicRoutes.includes(pathname) && pathname !== '/cotizacion') {
          router.push('/login');
      }
    }
  }, [firebaseUser, isUserLoading, firestore, router, pathname, areServicesAvailable]);

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    setUserWithRole(null);
    router.push('/login');
  };
  
  const loading = isUserLoading || loadingRole;

  const value = useMemo(() => ({
    user: userWithRole,
    loading,
    logout,
  }), [userWithRole, loading, auth]);
  
  const isPublicRoute = publicRoutes.includes(pathname) || pathname === '/cotizacion';

  if (loading && !isPublicRoute) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPublicRoute && !loading && !userWithRole) {
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

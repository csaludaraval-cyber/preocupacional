
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
const adminOnlyInitialRoute = '/admin';
const quoteRoute = '/cotizacion';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userWithRole, setUserWithRole] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const { user: firebaseUser, auth, firestore, isUserLoading, areServicesAvailable } = useFirebase();

  useEffect(() => {
    if (isUserLoading || !areServicesAvailable) {
      return; // Wait until Firebase Auth is initialized and services are ready
    }

    const handleUserRole = async (fbUser: FirebaseUser) => {
      if (!firestore) return;
      try {
        const adminRoleRef = doc(firestore, 'roles_admin', fbUser.uid);
        const adminRoleDoc = await getDoc(adminRoleRef);
        const role = adminRoleDoc.exists() ? 'admin' : 'standard';
        
        const user: User = {
          ...fbUser,
          uid: fbUser.uid,
          role: role,
        };
        setUserWithRole(user);

        // --- REDIRECTION LOGIC FOR AUTHENTICATED USERS ---
        const isOnLogin = publicRoutes.includes(pathname);
        if (role === 'admin' && isOnLogin) {
          router.push(adminOnlyInitialRoute);
        } else if (isOnLogin) {
          router.push('/');
        }

      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserWithRole({ ...fbUser, uid: fbUser.uid, role: 'standard' });
      } finally {
        setAuthChecked(true);
      }
    };

    if (firebaseUser) {
      handleUserRole(firebaseUser);
    } else {
      // --- REDIRECTION LOGIC FOR UNAUTHENTICATED USERS ---
      setUserWithRole(null);
      setAuthChecked(true);
      const isProtectedRoute = !publicRoutes.includes(pathname) && !pathname.startsWith(quoteRoute);
      if (isProtectedRoute) {
        router.push('/login');
      }
    }

  }, [firebaseUser, isUserLoading, areServicesAvailable, firestore, pathname, router]);

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    setUserWithRole(null);
    setAuthChecked(false);
    router.push('/login');
  };
  
  const value = useMemo(() => ({
    user: userWithRole,
    loading: !authChecked,
    logout,
  }), [userWithRole, authChecked, auth]);

  if (!authChecked) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
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

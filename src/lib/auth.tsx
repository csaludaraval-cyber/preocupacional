
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
const quoteRoute = '/cotizacion';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userWithRole, setUserWithRole] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const { user: firebaseUser, auth, firestore, isUserLoading, areServicesAvailable } = useFirebase();

  useEffect(() => {
    const isLoading = !areServicesAvailable || isUserLoading;
    setLoading(isLoading);

    if (isLoading) {
      return;
    }

    const isPublicPath = publicRoutes.includes(pathname) || pathname.startsWith(quoteRoute);

    const handleUser = async (fbUser: FirebaseUser | null) => {
      if (fbUser && firestore) {
        try {
          const adminRoleRef = doc(firestore, 'roles_admin', fbUser.uid);
          const adminRoleDoc = await getDoc(adminRoleRef);
          
          const extendedUser: User = {
            ...fbUser,
            uid: fbUser.uid,
            role: adminRoleDoc.exists() ? 'admin' : 'standard',
          };
          setUserWithRole(extendedUser);

        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserWithRole({ ...fbUser, uid: fbUser.uid, role: 'standard' });
        }
      } else {
        setUserWithRole(null);
        if (!isPublicPath) {
            router.push('/login');
        }
      }
    };

    handleUser(firebaseUser);

  }, [firebaseUser, isUserLoading, areServicesAvailable, firestore, pathname, router]);

  const logout = async () => {
    if (!auth) return;
    setLoading(true);
    await signOut(auth);
    setUserWithRole(null);
    router.push('/login');
    setLoading(false);
  };
  
  const value = useMemo(() => ({
    user: userWithRole,
    loading,
    logout,
  }), [userWithRole, loading, auth]);
  
  const isPublicPath = publicRoutes.includes(pathname) || pathname.startsWith(quoteRoute);
  if (loading && !isPublicPath) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPublicPath && !loading && !userWithRole) {
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

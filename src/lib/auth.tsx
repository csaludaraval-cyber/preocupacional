
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
  const [loading, setLoading] = useState(true); // Manages UI loading state
  const router = useRouter();
  const pathname = usePathname();

  const { user: firebaseUser, auth, firestore, isUserLoading, areServicesAvailable } = useFirebase();

  useEffect(() => {
    // Wait until Firebase is initialized and has checked the user's auth state
    if (isUserLoading || !areServicesAvailable) {
      return; 
    }

    const processUser = async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        // User is signed in, get their role
        try {
          if (!firestore) throw new Error("Firestore service is not available.");
          const adminRoleRef = doc(firestore, 'roles_admin', fbUser.uid);
          const adminRoleDoc = await getDoc(adminRoleRef);
          const role = adminRoleDoc.exists() ? 'admin' : 'standard';
          
          const user: User = { ...fbUser, uid: fbUser.uid, role: role };
          setUserWithRole(user);

          // Handle redirection for logged-in user
          const isOnPublicOnlyPage = publicRoutes.includes(pathname);
          if (isOnPublicOnlyPage) {
            router.push(role === 'admin' ? adminOnlyInitialRoute : '/');
          }

        } catch (error) {
          console.error("Error fetching user role:", error);
          // Fallback to standard role on error
          setUserWithRole({ ...fbUser, uid: fbUser.uid, role: 'standard' });
        }
      } else {
        // User is not signed in
        setUserWithRole(null);
        // Handle redirection for non-logged-in user
        const isProtectedRoute = !publicRoutes.includes(pathname) && !pathname.startsWith(quoteRoute);
        if (isProtectedRoute) {
          router.push('/login');
        }
      }
      setLoading(false); // Authentication check is complete
    };

    processUser(firebaseUser);

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
    loading: loading,
    logout,
  }), [userWithRole, loading, auth]);

  if (loading) {
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

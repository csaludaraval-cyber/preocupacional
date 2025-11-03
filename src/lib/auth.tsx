
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
    // We are loading if Firebase services are not ready OR if the user state is being checked.
    const isLoading = !areServicesAvailable || isUserLoading;
    setLoading(isLoading);

    if (isLoading) {
      return; // Wait until Firebase is fully initialized and user state is known.
    }

    const handleUser = async (fbUser: FirebaseUser | null) => {
      if (fbUser && firestore) {
        // If there's a Firebase user, fetch their role.
        try {
          const adminRoleRef = doc(firestore, 'roles_admin', fbUser.uid);
          const adminRoleDoc = await getDoc(adminRoleRef);
          
          const extendedUser: User = {
            ...fbUser,
            uid: fbUser.uid, // ensure uid is there
            role: adminRoleDoc.exists() ? 'admin' : 'standard',
          };
          setUserWithRole(extendedUser);

        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserWithRole({ ...fbUser, uid: fbUser.uid, role: 'standard' });
        }
      } else {
        // No Firebase user.
        setUserWithRole(null);
        // If not a public route, redirect to login.
        if (!publicRoutes.includes(pathname) && pathname !== quoteRoute) {
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
  
  // Render a global loading screen if we're still figuring out auth state,
  // unless it's a public route where content can be shown immediately.
  const isPublicPath = publicRoutes.includes(pathname) || pathname === quoteRoute;
  if (loading && !isPublicPath) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If the path is not public, and we're done loading, and there's still no user,
  // it means the redirect is in progress. Render nothing to avoid flashes of content.
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

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
import { useFirebase } from '@/firebase'; // Use the central hook
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

  // Get user and auth services from the central provider
  const { user: firebaseUser, auth, firestore, isUserLoading } = useFirebase();

  useEffect(() => {
    const checkUserRole = async (fbUser: FirebaseUser) => {
      if (!firestore) return;
      setLoadingRole(true);
      try {
        const adminRoleRef = doc(firestore, 'roles_admin', fbUser.uid);
        const adminRoleDoc = await getDoc(adminRoleRef);
        
        const extendedUser: User = {
          // Re-structure to avoid spreading a FirebaseUser object
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
          emailVerified: fbUser.emailVerified,
          isAnonymous: fbUser.isAnonymous,
          metadata: fbUser.metadata,
          providerData: fbUser.providerData,
          providerId: fbUser.providerId,
          tenantId: fbUser.tenantId,
          refreshToken: fbUser.refreshToken,
          delete: fbUser.delete,
          getIdToken: fbUser.getIdToken,
          getIdTokenResult: fbUser.getIdTokenResult,
          reload: fbUser.reload,
          toJSON: fbUser.toJSON,
          // Add our custom role
          role: adminRoleDoc.exists() ? 'admin' : 'standard',
        };
        
        setUserWithRole(extendedUser);

        // Redirect logic after role is determined
        if (pathname === '/login' || pathname === '/crear-primer-admin') {
            if (extendedUser.role === 'admin') {
                router.push('/admin');
            } else {
                router.push('/');
            }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        // Set a default user object without a role or handle the error appropriately
        setUserWithRole(fbUser as User); // Fallback to basic user
      } finally {
        setLoadingRole(false);
      }
    };
    
    if (firebaseUser) {
      checkUserRole(firebaseUser);
    } else if (!isUserLoading) {
      setUserWithRole(null);
      setLoadingRole(false);
      // If user logs out or session expires, redirect to login if not already on a public page
      if (!publicRoutes.includes(pathname) && pathname !== '/cotizacion') {
          router.push('/login');
      }
    }
  }, [firebaseUser, isUserLoading, firestore, router, pathname]);

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
  }), [userWithRole, loading, () => logout]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const isPublicRoute = publicRoutes.includes(pathname) || pathname === '/cotizacion';

  if (loading && !isPublicRoute) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // This prevents flashing the login page for authenticated users on a protected route.
  if (!isPublicRoute && !loading && !userWithRole) {
    // The redirect is handled in the useEffect, so we just prevent rendering.
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

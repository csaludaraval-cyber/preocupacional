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
import { Loader2 } from 'lucide-react';

// TIPOS DE ROL: Definidos localmente para asegurar que AuthProvider funcione
export type AppUserRole = 'admin' | 'medico' | 'standard';

// Definición del usuario de la aplicación, extendiendo al usuario de Firebase
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

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isUserLoading || !isClient) {
      return; 
    }

    const processUser = async (fbUser: FirebaseUser | null) => {
      setLoading(true);
      if (fbUser) {
        try {
          if (!firestore) throw new Error("Firestore service is not available.");
          
          const roleDocRef = doc(firestore, 'roles_admin', fbUser.uid); 
          const roleDoc = await getDoc(roleDocRef);
          
          let userRole: AppUserRole = 'standard';
          if (roleDoc.exists()) {
              // Leer explícitamente el campo 'role' del documento
              const data = roleDoc.data();
              if (data && (data.role === 'admin' || data.role === 'medico')) {
                userRole = data.role;
              } else if (data && data.admin === true) { // Fallback para la lógica antigua
                userRole = 'admin';
              }
          }
          
          const userDetails: AppUser = { ...fbUser, uid: fbUser.uid, role: userRole } as AppUser;
          setUserWithRole(userDetails);

        } catch (error) {
          console.error("Error fetching user role:", error);
          const userDetails: AppUser = { ...fbUser, uid: fbUser.uid, role: 'standard' } as AppUser;
          setUserWithRole(userDetails);
        }
      } else {
        setUserWithRole(null);
        const isProtectedRoute = !publicRoutes.includes(pathname) && !pathname.startsWith(quoteRoute);
        if (isProtectedRoute) {
          router.push('/login');
        }
      }
      setLoading(false);
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
  
  const value = useMemo(() => ({
    user: userWithRole,
    loading: loading,
    logout,
  }), [userWithRole, loading, logout]);

  if (loading && isClient) {
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

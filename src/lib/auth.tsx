"use client";

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useMemo, 
  type ReactNode 
} from 'react';
import { onAuthStateChanged, signInAnonymously, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, firestore } from './firebase';
import type { User } from './types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  toggleRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(firestore, 'solicitantes', firebaseUser.uid);
        const adminRoleRef = doc(firestore, 'roles_admin', firebaseUser.uid);
        
        const [userDoc, adminRoleDoc] = await Promise.all([
          getDoc(userDocRef),
          getDoc(adminRoleDoc)
        ]);

        let userProfile: User = { ...firebaseUser, role: 'standard' };

        if (adminRoleDoc.exists()) {
          userProfile.role = 'admin';
        }
        
        if (userDoc.exists()) {
          // You might merge user profile data here if you store more in Firestore
        }

        setUser(userProfile);
      } else {
        // Simple anonymous sign-in for demo purposes
        signInAnonymously(auth).catch(error => {
          console.error("Anonymous sign-in failed:", error);
        });
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleRole = async () => {
    if (!user) return;
    
    setLoading(true);
    const newRole = user.role === 'admin' ? 'standard' : 'admin';
    const adminRoleRef = doc(firestore, 'roles_admin', user.uid);

    try {
      if (newRole === 'admin') {
        await setDoc(adminRoleRef, { admin: true });
      } else {
        // In a real app, you'd use a cloud function to delete this for security
        // For now, client-side deletion is enabled by the rules for demo purposes
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(adminRoleRef);
      }
      setUser({ ...user, role: newRole });
    } catch(e) {
      console.error("Failed to toggle role", e);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(() => ({
    user,
    loading,
    toggleRole
  }), [user, loading]);

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

"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useMemo } from 'react';

type UserRole = 'standard' | 'admin';

interface User {
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  toggleRole: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const standardUser: User = { name: 'Usuario Estándar', role: 'standard' };
const adminUser: User = { name: 'Administrador', role: 'admin' };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(standardUser);

  const toggleRole = () => {
    setUser(currentUser => (currentUser?.role === 'admin' ? standardUser : adminUser));
  };

  const contextValue = useMemo(() => ({
    user,
    setUser,
    toggleRole,
  }), [user]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

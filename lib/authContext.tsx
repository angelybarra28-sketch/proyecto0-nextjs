'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from './types';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { canAccessAdmin, type AppRole } from '@/lib/auth/permissions';
import { getCurrentAuthProfile } from '@/lib/auth/profileClient';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Omit<User, 'id' | 'createdAt' | 'role'>) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  getAllUsers: () => User[];
  deleteUser: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAppUser(profile: { userId: string; role: AppRole; fullName: string | null }): User {
  return {
    id: profile.userId,
    dni: '',
    nombreApellido: profile.fullName ?? 'Usuario',
    telefono: '',
    email: '',
    domicilio: '',
    password: '',
    role: canAccessAdmin(profile.role) ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const syncUser = async () => {
      try {
        const profile = await getCurrentAuthProfile();
        setUser(profile && profile.isActive ? toAppUser(profile) : null);
      } catch (error) {
        console.error('Error loading Supabase auth profile:', error);
        setUser(null);
      }
    };

    void syncUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void syncUser();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) return false;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return false;

    const profile = await getCurrentAuthProfile();
    setUser(profile && profile.isActive ? toAppUser(profile) : null);
    return Boolean(profile?.isActive);
  };

  const register = async (userData: Omit<User, 'id' | 'createdAt' | 'role'>): Promise<{ success: boolean; message: string }> => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { success: false, message: 'Supabase Auth no está configurado' };
    }

    const { error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.nombreApellido,
          phone: userData.telefono,
          address: userData.domicilio,
          dni: userData.dni,
        },
      },
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Usuario registrado correctamente' };
  };

  const logout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    setUser(null);
  };

  const getAllUsers = (): User[] => {
    return [];
  };

  const deleteUser = (id: string) => {
    console.warn(`User deletion must be handled server-side. Ignored user id: ${id}`);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout,
        getAllUsers,
        deleteUser,
      }}
    >
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

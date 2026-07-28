'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { User, AuthState } from './types';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { canAccessAdmin, type AppRole } from '@/lib/auth/permissions';
import { getCurrentAuthProfile } from '@/lib/auth/profileClient';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (userData: Omit<User, 'id' | 'createdAt' | 'role'>) => Promise<{ success: boolean; message: string; emailConfirmationPending?: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAppUser(profile: { userId: string; role: AppRole; fullName: string | null; telefono: string | null; domicilio: string | null; email: string | null }): User {
  return {
    id: profile.userId,
    dni: '',
    nombreApellido: profile.fullName ?? 'Usuario',
    telefono: profile.telefono ?? '',
    email: profile.email ?? '',
    domicilio: profile.domicilio ?? '',
    password: '',
    role: canAccessAdmin(profile.role) ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    const syncUser = async () => {
      try {
        const profile = await getCurrentAuthProfile();
        setUser(profile && profile.isActive ? toAppUser(profile) : null);
      } catch (error) {
        console.error('Error loading Supabase auth profile:', error);
        setUser(null);
      } finally {
        setIsAuthLoading(false);
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

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) return { success: false, message: 'Supabase Auth no está configurado' };

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        return { success: false, message: 'Falta confirmar la cuenta. Revisá tu bandeja de entrada del email.' };
      }
      return { success: false, message: 'Email o contraseña incorrectos' };
    }

    const profile = await getCurrentAuthProfile();
    setUser(profile && profile.isActive ? toAppUser(profile) : null);
    return Boolean(profile?.isActive) ? { success: true } : { success: false, message: 'Cuenta desactivada' };
  }, []);

  const register = useCallback(async (userData: Omit<User, 'id' | 'createdAt' | 'role'>): Promise<{ success: boolean; message: string; emailConfirmationPending?: boolean }> => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { success: false, message: 'Supabase Auth no está configurado' };
    }

    const { data, error } = await supabase.auth.signUp({
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

    if (!data.session) {
      return { success: true, message: 'Te enviamos un email para confirmar tu cuenta. Revisá tu bandeja de entrada.', emailConfirmationPending: true };
    }

    return { success: true, message: 'Usuario registrado correctamente' };
  }, []);

  const logout = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isAuthLoading,
      login,
      register,
      logout,
    }),
    [user, isAuthLoading, login, register, logout]
  );

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

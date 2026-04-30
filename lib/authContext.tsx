'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from './types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => boolean;
  register: (userData: Omit<User, 'id' | 'createdAt' | 'role'>) => { success: boolean; message: string };
  logout: () => void;
  getAllUsers: () => User[];
  deleteUser: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Usuario admin predefinido
const ADMIN_USER: User = {
  id: 'admin-001',
  dni: '00000000',
  nombreApellido: 'Administrador',
  telefono: '0000000000',
  email: 'admin',
  domicilio: 'Admin',
  password: 'ADMIN',
  role: 'admin',
  createdAt: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Cargar usuario desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading user:', error);
      }
    }
    setIsHydrated(true);
  }, []);

  // Guardar usuario en localStorage
  useEffect(() => {
    if (isHydrated && user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else if (isHydrated && !user) {
      localStorage.removeItem('currentUser');
    }
  }, [user, isHydrated]);

  const login = (email: string, password: string): boolean => {
    // Verificar si es el usuario admin
    if (email === 'ADMIN' && password === 'ADMIN') {
      setUser(ADMIN_USER);
      return true;
    }

    // Buscar en usuarios registrados
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
      const users: User[] = JSON.parse(savedUsers);
      const foundUser = users.find(u => u.email === email && u.password === password);
      if (foundUser) {
        setUser(foundUser);
        return true;
      }
    }
    return false;
  };

  const register = (userData: Omit<User, 'id' | 'createdAt' | 'role'>): { success: boolean; message: string } => {
    // Verificar si el email ya existe
    const savedUsers = localStorage.getItem('users');
    let users: User[] = savedUsers ? JSON.parse(savedUsers) : [];

    if (users.some(u => u.email === userData.email)) {
      return { success: false, message: 'El email ya está registrado' };
    }

    if (users.some(u => u.dni === userData.dni)) {
      return { success: false, message: 'El DNI ya está registrado' };
    }

    // Crear nuevo usuario
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    // Iniciar sesión automáticamente
    setUser(newUser);

    return { success: true, message: 'Usuario registrado correctamente' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const getAllUsers = (): User[] => {
    const savedUsers = localStorage.getItem('users');
    return savedUsers ? JSON.parse(savedUsers) : [];
  };

  const deleteUser = (id: string) => {
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
      const users: User[] = JSON.parse(savedUsers);
      const filteredUsers = users.filter(u => u.id !== id);
      localStorage.setItem('users', JSON.stringify(filteredUsers));
    }
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
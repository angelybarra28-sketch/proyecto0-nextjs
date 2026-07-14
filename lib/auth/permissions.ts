export type AppRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface AuthProfile {
  userId: string;
  role: AppRole;
  fullName: string | null;
  isActive: boolean;
  telefono: string | null;
  domicilio: string | null;
  email: string | null;
}

export function canAccessAdmin(role: AppRole | null | undefined): boolean {
  return role === 'ADMIN' || role === 'STAFF';
}

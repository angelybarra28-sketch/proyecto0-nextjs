import type { AdminUserView } from '@/lib/types';

export type AdminCustomerView = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  dni: string | null;
  user_id: string | null;
  operation_numbers: string[];
  credit_accounts: Array<{
    id: string;
    operation_number: string | null;
    product_name: string;
    sale_date: string;
    installment_amount: number;
    installment_count: number;
  }>;
};

export async function fetchAdminUsers(signal?: AbortSignal, options?: { page?: number; limit?: number }): Promise<AdminUserView[]> {
  const searchParams = new URLSearchParams();
  if (options?.page !== undefined && options.page !== null) {
    searchParams.set('page', String(options.page));
  }
  if (options?.limit !== undefined && options.limit !== null) {
    searchParams.set('limit', String(options.limit));
  }
  const query = searchParams.toString();
  const response = await fetch(`/api/admin/users${query ? `?${query}` : ''}`, { signal });

  if (!response.ok) {
    throw new Error('No se pudieron cargar los usuarios');
  }

  const payload = await response.json() as { users: AdminUserView[] };
  return payload.users;
}

export async function toggleAdminUser(userId: string, isActive: boolean, signal?: AbortSignal): Promise<{ previousIsActive: boolean; newIsActive: boolean }> {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isActive }),
  });

  if (!response.ok) {
    const payload = await response.json() as { error?: { message?: string }; message?: string };
    throw new Error(payload.error?.message ?? payload.message ?? 'No se pudo registrar el pago');
  }

  const payload = await response.json() as { previousIsActive: boolean; newIsActive: boolean };
  return payload;
}

export async function fetchAdminCustomers(signal?: AbortSignal): Promise<AdminCustomerView[]> {
  const response = await fetch('/api/admin/customers', { signal });

  if (!response.ok) {
    throw new Error('No se pudieron cargar los clientes');
  }

  const payload = await response.json() as { customers: AdminCustomerView[] };
  return payload.customers;
}

export async function linkCustomerToUser(customerId: string, userId: string | null, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`/api/admin/customers/${customerId}`, {
    method: 'PATCH',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const payload = await response.json() as { error?: { message?: string }; message?: string };
    throw new Error(payload.error?.message ?? payload.message ?? 'No se pudo vincular el cliente');
  }
}

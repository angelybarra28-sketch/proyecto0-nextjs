import type { CollectionStatus, SaleStatus } from '@/lib/supabase/types';

export function formatCurrency(value?: number | null) {
  return Number(value ?? 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function getStatusClass(status: SaleStatus | CollectionStatus) {
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'OVERDUE') return 'overdue';

  if (
    status === 'DELIVERED' ||
    status === 'CONFIRMED' ||
    status === 'PAID'
  ) {
    return 'completed';
  }

  return 'pending';
}

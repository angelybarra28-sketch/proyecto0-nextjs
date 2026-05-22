import type { AdminSaleDetail, CollectionStatus, InstallmentView } from '@/lib/supabase/types';

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function getOverdueDays(dueDate: string, referenceDate = startOfToday()): number {
  const due = new Date(dueDate);
  const dueOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffMs = referenceDate.getTime() - dueOnly.getTime();
  return Math.max(0, Math.floor(diffMs / 86400000));
}

export function isInstallmentOverdue(installment: Pick<InstallmentView, 'dueDate' | 'remainingAmount'>): boolean {
  return getOverdueDays(installment.dueDate) > 0 && installment.remainingAmount > 0;
}

export function calculateSaleCollectionStatus(
  installments: Pick<InstallmentView, 'dueDate' | 'remainingAmount'>[],
  remainingAmount: number
): CollectionStatus {
  if (remainingAmount <= 0) return 'PAID';
  if (installments.some(isInstallmentOverdue)) return 'OVERDUE';
  if (installments.some((installment) => installment.remainingAmount > 0)) return 'UP_TO_DATE';
  return 'PENDING';
}

export function calculateCustomerDebt(sales: Pick<AdminSaleDetail, 'remainingAmount'>[]): number {
  return sales.reduce((total, sale) => total + sale.remainingAmount, 0);
}

export function getOverdueInstallments(installments: InstallmentView[]): InstallmentView[] {
  return installments.filter(isInstallmentOverdue);
}

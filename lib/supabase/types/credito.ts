import type { MonthlyMetric } from './comunes';

export type InstallmentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
export type AllocationStatus = 'ACTIVE' | 'VOIDED';

export interface InstallmentView {
  id: string;
  saleId: string;
  installmentNumber: number;
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InstallmentStatus;
  overdueDays: number;
}

export interface PaymentAllocationView {
  id: string;
  paymentId: string;
  installmentId: string;
  amount: number;
  status: AllocationStatus;
}

export interface CreditDashboardMetrics {
  totalFinanced: number;
  totalCollected: number;
  totalPending: number;
  customerCount: number;
  customersWithDebt: number;
  activeAccounts: number;
  finishedAccounts: number;
  currentMonthCollected: number;
  previousMonthCollected: number;
  monthlyCollection: MonthlyMetric[];
}

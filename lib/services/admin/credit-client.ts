import type {
  CollectionSummary,
  AdminDashboardStats,
} from '@/lib/supabase/types';
import type {
  CreditAccountSummary,
  CreditDashboard,
  CreateCreditAccountInput,
  CreditAccountDetail,
  CreditCollectionNote,
  CollectionRouteItem,
  ImportPortfolioPreview,
  ImportPortfolioRow,
  ImportPortfolioResult,
} from '@/lib/types';
import { appendDefinedParam, parseApiError } from './helpers';

// --- Collection / Dashboard ---

export async function fetchCollectionSummary(signal?: AbortSignal): Promise<CollectionSummary> {
  const response = await fetch('/api/admin/collections/summary', { signal });

  if (!response.ok) {
    throw new Error('No se pudo cargar el resumen de cobranza');
  }

  const payload = await response.json() as { summary: CollectionSummary | null };

  if (!payload.summary) {
    throw new Error('Resumen de cobranza no disponible');
  }

  return payload.summary;
}

export async function fetchAdminDashboard(signal?: AbortSignal): Promise<AdminDashboardStats> {
  const response = await fetch('/api/admin/dashboard', { signal });

  if (!response.ok) {
    throw new Error('No se pudo cargar el dashboard');
  }

  const payload = await response.json() as { dashboard: AdminDashboardStats | null };

  if (!payload.dashboard) {
    throw new Error('Dashboard no disponible');
  }

  return payload.dashboard;
}

// --- Credit Accounts ---

export async function fetchCreditAccounts(
  signal?: AbortSignal,
  options?: { search?: string; statusFilter?: 'active' | 'finished' | 'all'; page?: number; pageSize?: number; filterMonth?: number; filterYear?: number; filterPaymentStatus?: 'paid' | 'pending' | null }
): Promise<{ accounts: CreditAccountSummary[]; dashboard: CreditDashboard | null; totalCount?: number; page?: number; pageSize?: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set('dashboard', 'true');
  if (options?.search) searchParams.set('search', options.search);
  if (options?.statusFilter) searchParams.set('statusFilter', options.statusFilter);
  if (options?.page) searchParams.set('page', String(options.page));
  if (options?.pageSize) searchParams.set('pageSize', String(options.pageSize));
  if (options?.filterMonth !== undefined) searchParams.set('filterMonth', String(options.filterMonth));
  if (options?.filterYear !== undefined) searchParams.set('filterYear', String(options.filterYear));
  if (options?.filterPaymentStatus) searchParams.set('filterPaymentStatus', options.filterPaymentStatus);
  const response = await fetch(`/api/admin/credit-accounts?${searchParams.toString()}`, { signal });

  if (!response.ok) {
    throw new Error('No se pudieron cargar las cuentas corrientes');
  }

  return await response.json() as { accounts: CreditAccountSummary[]; dashboard: CreditDashboard | null; totalCount?: number; page?: number; pageSize?: number };
}

export async function createCreditAccount(
  input: Omit<CreateCreditAccountInput, 'saleDate'> & { saleDate?: string }
): Promise<CreditAccountSummary> {
  const response = await fetch('/api/admin/credit-accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message || 'No se pudo registrar el pago');
  }

  const payload = await response.json() as { account: CreditAccountSummary };
  return payload.account;
}

export async function fetchCreditAccountDetail(accountId: string, signal?: AbortSignal): Promise<CreditAccountDetail> {
  const response = await fetch(`/api/admin/credit-accounts/${accountId}`, { signal });

  if (!response.ok) {
    throw new Error('No se pudo cargar el detalle de la cuenta corriente');
  }

  const payload = await response.json() as { account: CreditAccountDetail };
  return payload.account;
}

export async function registerCreditPayment(
  accountId: string,
  input: { amount: number; paymentMethod?: string; paymentDate?: string; notes?: string }
): Promise<CreditAccountDetail> {
  const response = await fetch(`/api/admin/credit-accounts/${accountId}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = await response.json() as { message?: string };
    throw new Error(payload.message ?? 'No se pudo registrar el pago');
  }

  const payload = await response.json() as { account: CreditAccountDetail };
  return payload.account;
}

export async function addCreditCollectionNote(
  accountId: string,
  input: {
    contactType: 'CALL' | 'WHATSAPP' | 'VISIT' | 'OTHER';
    result: 'NOTE' | 'PROMISE' | 'NO_CONTACT' | 'PARTIAL_PAYMENT' | 'PAID' | 'OTHER';
    notes: string;
    createdBy: string;
  }
): Promise<CreditCollectionNote> {
  const response = await fetch(`/api/admin/credit-accounts/${accountId}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = await response.json() as { message?: string };
    throw new Error(payload.message ?? 'No se pudo guardar la gestion');
  }

  const payload = await response.json() as { note: CreditCollectionNote };
  return payload.note;
}

export async function fetchCreditCollectionRoute(signal?: AbortSignal): Promise<CollectionRouteItem[]> {
  const response = await fetch('/api/admin/credit-accounts/overdue', { signal });

  if (!response.ok) {
    throw new Error('No se pudo cargar la ruta de cobranza');
  }

  const payload = await response.json() as { route: CollectionRouteItem[] };
  return payload.route;
}

// --- Portfolio Import ---

export async function previewPortfolioImport(formData: FormData): Promise<ImportPortfolioPreview> {
  const response = await fetch('/api/admin/importacion-cartera/preview', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json() as { message?: string };
    throw new Error(payload.message ?? 'No se pudo generar el preview');
  }

  const payload = await response.json() as { preview: ImportPortfolioPreview };
  return payload.preview;
}

export async function executePortfolioImport(rows: ImportPortfolioRow[]): Promise<ImportPortfolioResult> {
  const response = await fetch('/api/admin/importacion-cartera/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rows }),
  });

  if (!response.ok) {
    const payload = await response.json() as { message?: string };
    throw new Error(payload.message ?? 'No se pudo importar la cartera');
  }

  const payload = await response.json() as { result: ImportPortfolioResult };
  return payload.result;
}

// --- Clean ---

export async function fetchCleanSummary(signal?: AbortSignal): Promise<{
  allocationCount: number;
  paymentCount: number;
  installmentCount: number;
  accountCount: number;
  customerCount: number;
}> {
  const response = await fetch('/api/admin/credit-accounts/clean-summary', { signal });

  if (!response.ok) {
    throw new Error('No se pudo cargar el resumen de limpieza');
  }

  return await response.json() as {
    allocationCount: number;
    paymentCount: number;
    installmentCount: number;
    accountCount: number;
    customerCount: number;
  };
}

export async function cleanCreditPortfolio(): Promise<{
  allocationsDeleted: number;
  paymentsDeleted: number;
  installmentsDeleted: number;
  accountsDeleted: number;
  customersDeleted: number;
  timestamp: string;
}> {
  const response = await fetch('/api/admin/credit-accounts/clean', {
    method: 'POST',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const msg = payload?.error?.message || payload?.message || 'No se pudo ejecutar la limpieza';
    throw new Error(msg);
  }

  return await response.json() as {
    allocationsDeleted: number;
    paymentsDeleted: number;
    installmentsDeleted: number;
    accountsDeleted: number;
    customersDeleted: number;
    timestamp: string;
  };
}

// --- Commercial Metrics ---

export async function fetchCommercialMetrics(signal?: AbortSignal): Promise<{
  currentMonthlyCollection: number;
  monthlyReplacement: number;
  replacementCount: number;
  finishedCards: number;
  finishedInstallmentsAmount: number;
  projectedNextMonth: number;
  finishedAccountsList: CreditAccountSummary[];
}> {
  const response = await fetch('/api/admin/credit-accounts/commercial-metrics', { signal });

  if (!response.ok) {
    throw new Error('No se pudieron cargar las métricas comerciales');
  }

  return await response.json() as {
    currentMonthlyCollection: number;
    monthlyReplacement: number;
    replacementCount: number;
    finishedCards: number;
    finishedInstallmentsAmount: number;
    projectedNextMonth: number;
    finishedAccountsList: CreditAccountSummary[];
  };
}

// --- Monthly Control ---

export async function fetchControlMensual(signal?: AbortSignal): Promise<{
  rows: {
    customerName: string;
    operationNumber: string;
    productName: string;
    installmentAmount: number;
    status: string;
    saleDate: string;
    lastPaymentDate: string | null;
    remainingAmount: number;
    originMonth: number | null;
    originYear: number | null;
  }[];
  summary: {
    monthlyReplacement: number;
    finishedCards: number;
    currentMonthlyCollection: number;
    projectedNextMonth: number;
  };
}> {
  const response = await fetch('/api/admin/credit-accounts/control-mensual', { signal });

  if (!response.ok) {
    throw new Error('No se pudo cargar el control mensual');
  }

  return await response.json() as {
    rows: {
      customerName: string;
      operationNumber: string;
      productName: string;
      installmentAmount: number;
      status: string;
      saleDate: string;
      lastPaymentDate: string | null;
      remainingAmount: number;
      originMonth: number | null;
      originYear: number | null;
    }[];
    summary: {
      monthlyReplacement: number;
      finishedCards: number;
      currentMonthlyCollection: number;
      projectedNextMonth: number;
    };
  };
}

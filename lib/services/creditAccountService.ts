import {
  getCreditAccounts,
  getCreditAccountById,
  getCustomerForCredit,
  insertCreditAccount,
  generateInstallmentsForAccount,
  insertCreditPayment,
  insertCollectionNote,
  getCreditDashboardFromRpc,
  getCollectionRouteFromRpc,
} from '@/lib/repositories/creditAccountRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type {
  CreditAccountSummary,
  CreditAccountDetail,
  CreditDashboard,
  CreditInstallment,
  CreditPayment,
  CreditCollectionNote,
  CollectionRouteItem,
  CreateCreditAccountInput,
  RegisterCreditPaymentInput,
} from '@/lib/types';

function calculateSummary(
  account: {
    id: string;
    customer_id: string;
    operation_number: string | null;
    product_name: string;
    quantity: number;
    installment_count: number;
    installment_amount: number;
    sale_date: string;
    notes: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    origin_month?: number | null;
    origin_year?: number | null;
  },
  installments: { original_amount: number; paid_amount: number; status: string }[]
): CreditAccountSummary {
  const total = Number(account.installment_amount) * account.installment_count;
  const paid = installments.reduce((sum, inst) => sum + Number(inst.paid_amount), 0);
  return {
    id: account.id,
    customerId: account.customer_id,
    operationNumber: account.operation_number,
    productName: account.product_name,
    quantity: account.quantity,
    installmentCount: account.installment_count,
    installmentAmount: Number(account.installment_amount),
    saleDate: account.sale_date,
    notes: account.notes ?? '',
    isActive: account.is_active,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
    originMonth: account.origin_month ?? null,
    originYear: account.origin_year ?? null,
    total,
    paid,
    remaining: Math.max(0, total - paid),
    paymentCount: installments.filter((inst) => inst.status === 'PAID' || inst.status === 'PARTIAL').length,
  };
}

function mapInstallment(inst: {
  id: string;
  credit_account_id: string;
  installment_number: number;
  due_date: string;
  original_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}): CreditInstallment {
  return {
    id: inst.id,
    creditAccountId: inst.credit_account_id,
    installmentNumber: inst.installment_number,
    dueDate: inst.due_date,
    originalAmount: Number(inst.original_amount),
    paidAmount: Number(inst.paid_amount),
    remainingAmount: Number(inst.remaining_amount),
    status: inst.status as CreditInstallment['status'],
    createdAt: inst.created_at,
    updatedAt: inst.updated_at,
  };
}

function mapPayment(payment: {
  id: string;
  credit_account_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
  created_at: string;
}): CreditPayment {
  return {
    id: payment.id,
    creditAccountId: payment.credit_account_id,
    amount: Number(payment.amount),
    paymentMethod: payment.payment_method as CreditPayment['paymentMethod'],
    paymentDate: payment.payment_date,
    notes: payment.notes ?? '',
    createdAt: payment.created_at,
  };
}

function mapCollectionNote(note: {
  id: string;
  credit_account_id: string;
  contact_type: string;
  result: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}): CreditCollectionNote {
  return {
    id: note.id,
    creditAccountId: note.credit_account_id,
    contactType: note.contact_type as CreditCollectionNote['contactType'],
    result: note.result as CreditCollectionNote['result'],
    notes: note.notes ?? '',
    createdBy: note.created_by ?? '',
    createdAt: note.created_at,
  };
}

export async function listCreditAccountSummaries(options?: {
  search?: string;
  statusFilter?: 'active' | 'finished' | 'all';
}): Promise<CreditAccountSummary[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const { accounts, installments } = await getCreditAccounts(supabase);

  const installmentsByAccount = new Map<string, { original_amount: number; paid_amount: number; status: string }[]>();
  for (const inst of installments) {
    const list = installmentsByAccount.get(inst.credit_account_id) ?? [];
    list.push(inst);
    installmentsByAccount.set(inst.credit_account_id, list);
  }

  let summaries = accounts.map((account) =>
    calculateSummary(account, installmentsByAccount.get(account.id) ?? [])
  );

  const statusFilter = options?.statusFilter ?? 'active';
  if (statusFilter === 'active') {
    summaries = summaries.filter((s) => s.remaining > 0);
  } else if (statusFilter === 'finished') {
    summaries = summaries.filter((s) => s.remaining <= 0);
  }

  // Cargar nombres de clientes para mostrar en tabla y permitir búsqueda
  const customerIds = [...new Set(summaries.map((s) => s.customerId))];
  const { data: customers } = await supabase
    .from('customers')
    .select('id, full_name, phone')
    .in('id', customerIds);

  const customerMap = new Map(
    (customers ?? []).map((c: { id: string; full_name: string; phone: string | null }) => [c.id, c])
  );

  summaries = summaries.map((s) => ({
    ...s,
    customerName: customerMap.get(s.customerId)?.full_name ?? 'Cliente desconocido',
  }));

  const search = (options?.search ?? '').trim().toLowerCase();
  if (search) {
    summaries = summaries.filter((s) => {
      return (
        (s.operationNumber && s.operationNumber.toLowerCase().includes(search)) ||
        s.productName.toLowerCase().includes(search) ||
        (s.customerName ?? '').toLowerCase().includes(search) ||
        (customerMap.get(s.customerId)?.phone ?? '').toLowerCase().includes(search)
      );
    });
  }

  return summaries;
}

export async function getCreditAccountDetail(accountId: string): Promise<CreditAccountDetail> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const { account, installments, payments, collectionNotes } = await getCreditAccountById(supabase, accountId);
  const customer = await getCustomerForCredit(supabase, account.customer_id);

  const summary = calculateSummary(
    account,
    installments.map((inst) => ({
      original_amount: inst.original_amount,
      paid_amount: inst.paid_amount,
      status: inst.status,
    }))
  );

  return {
    ...summary,
    customer: {
      id: customer?.id ?? account.customer_id,
      fullName: customer?.full_name ?? 'Cliente desconocido',
      phone: customer?.phone ?? null,
      email: customer?.email ?? null,
      address: customer?.address ?? null,
    },
    installments: installments.map(mapInstallment),
    payments: payments.map(mapPayment),
    collectionNotes: collectionNotes.map(mapCollectionNote),
  };
}

export async function createCreditAccount(
  input: CreateCreditAccountInput
): Promise<CreditAccountSummary> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const account = await insertCreditAccount(supabase, {
    customer_id: input.customerId,
    operation_number: input.operationNumber ?? null,
    product_name: input.productName,
    quantity: input.quantity ?? 1,
    installment_count: input.installmentCount ?? 8,
    installment_amount: input.installmentAmount,
    sale_date: input.saleDate ?? new Date().toISOString(),
    notes: input.notes ?? null,
  });

  // Generate installments automatically
  const installmentCount = input.installmentCount ?? 8;
  const total = Number(account.installment_amount) * account.installment_count;
  const installmentAmount = total / installmentCount;
  await generateInstallmentsForAccount(supabase, account.id, installmentCount, installmentAmount, input.saleDate ?? new Date().toISOString());

  return calculateSummary(account, []);
}

export async function registerCreditPayment(
  accountId: string,
  input: RegisterCreditPaymentInput
): Promise<CreditAccountDetail> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const detail = await getCreditAccountDetail(accountId);

  if (input.amount > detail.remaining) {
    throw new Error('PAYMENT_EXCEEDS_DEBT');
  }

  if (input.amount <= 0) {
    throw new Error('PAYMENT_INVALID_AMOUNT');
  }

  await insertCreditPayment(supabase, {
    credit_account_id: accountId,
    amount: input.amount,
    payment_date: input.paymentDate ?? new Date().toISOString(),
    payment_method: input.paymentMethod,
    notes: input.notes ?? null,
  });

  return getCreditAccountDetail(accountId);
}

export async function addCollectionNote(
  accountId: string,
  input: {
    contactType: 'CALL' | 'WHATSAPP' | 'VISIT' | 'OTHER';
    result: 'NOTE' | 'PROMISE' | 'NO_CONTACT' | 'PARTIAL_PAYMENT' | 'PAID' | 'OTHER';
    notes: string;
    createdBy: string;
  }
): Promise<CreditCollectionNote> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const note = await insertCollectionNote(supabase, {
    credit_account_id: accountId,
    contact_type: input.contactType,
    result: input.result,
    notes: input.notes ?? null,
    created_by: input.createdBy,
  });

  return mapCollectionNote(note);
}

export async function getCreditDashboard(): Promise<CreditDashboard> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const row = await getCreditDashboardFromRpc(supabase);

  if (!row) {
    return {
      totalFinanced: 0,
      totalCollected: 0,
      totalPending: 0,
      customerCount: 0,
      customersWithDebt: 0,
      activeAccounts: 0,
      finishedAccounts: 0,
      currentMonthCollected: 0,
      previousMonthCollected: 0,
      monthlyCollection: [],
    };
  }

  return {
    totalFinanced: Number(row.total_financed),
    totalCollected: Number(row.total_collected),
    totalPending: Number(row.total_pending),
    customerCount: Number(row.customer_count),
    customersWithDebt: Number(row.customers_with_debt),
    activeAccounts: Number(row.active_accounts),
    finishedAccounts: Number(row.finished_accounts),
    currentMonthCollected: Number(row.current_month_collected),
    previousMonthCollected: Number(row.previous_month_collected),
    monthlyCollection: row.monthly_collection ?? [],
  };
}

export async function getCollectionRoute(): Promise<CollectionRouteItem[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const rows = await getCollectionRouteFromRpc(supabase);

  return rows.map((row) => ({
    creditAccountId: row.credit_account_id,
    customerId: row.customer_id,
    customerFullName: row.customer_full_name,
    customerPhone: row.customer_phone,
    customerAddress: row.customer_address,
    operationNumber: row.operation_number,
    productName: row.product_name,
    totalDebt: Number(row.total_debt),
    overdueAmount: Number(row.overdue_amount),
    daysOverdue: row.days_overdue,
    firstOverdueDate: row.first_overdue_date,
    installmentCount: row.installment_count,
    paidInstallments: row.paid_installments,
    overdueInstallments: row.overdue_installments,
  }));
}

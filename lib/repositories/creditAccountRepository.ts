import type { SupabaseClient } from '@supabase/supabase-js';

export interface DbCreditAccount {
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
}

export interface DbCreditPayment {
  id: string;
  credit_account_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

export interface DbCreditInstallment {
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
}

export interface DbCreditPaymentAllocation {
  id: string;
  credit_payment_id: string;
  credit_installment_id: string;
  amount: number;
  created_at: string;
}

export interface DbCreditCollectionNote {
  id: string;
  credit_account_id: string;
  contact_type: string;
  result: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DbCreditAccountItem {
  id: string;
  credit_account_id: string;
  product_name: string;
  quantity: number;
  unit_price: number | null;
  created_at: string;
}

export async function getCreditAccounts(
  supabase: SupabaseClient
): Promise<{ accounts: DbCreditAccount[]; installments: DbCreditInstallment[]; payments: DbCreditPayment[]; items: DbCreditAccountItem[] }> {
  const { data: accounts, error: accError } = await supabase
    .from('credit_accounts')
    .select('*')
    .eq('is_active', true)
    .order('sale_date', { ascending: false });

  if (accError) {
    throw accError;
  }

  const accountIds = (accounts ?? []).map((a) => a.id);

  const { data: installments, error: instError } = await supabase
    .from('credit_installments')
    .select('*')
    .in('credit_account_id', accountIds)
    .order('installment_number', { ascending: true });

  if (instError) {
    throw instError;
  }

  const { data: payments, error: payError } = await supabase
    .from('credit_payments')
    .select('*')
    .in('credit_account_id', accountIds)
    .order('payment_date', { ascending: false });

  if (payError) {
    throw payError;
  }

  const { data: items, error: itemsError } = await supabase
    .from('credit_account_items')
    .select('*')
    .in('credit_account_id', accountIds)
    .order('created_at', { ascending: true });

  if (itemsError) {
    throw itemsError;
  }

  return { accounts: accounts ?? [], installments: installments ?? [], payments: payments ?? [], items: items ?? [] };
}

export async function getCreditAccountById(
  supabase: SupabaseClient,
  accountId: string
): Promise<{ account: DbCreditAccount; installments: DbCreditInstallment[]; payments: DbCreditPayment[]; collectionNotes: DbCreditCollectionNote[]; items: DbCreditAccountItem[] }> {
  const { data: account, error: accError } = await supabase
    .from('credit_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (accError) {
    throw accError;
  }

  const { data: installments, error: instError } = await supabase
    .from('credit_installments')
    .select('*')
    .eq('credit_account_id', accountId)
    .order('installment_number', { ascending: true });

  if (instError) {
    throw instError;
  }

  const { data: payments, error: payError } = await supabase
    .from('credit_payments')
    .select('*')
    .eq('credit_account_id', accountId)
    .order('payment_date', { ascending: false });

  if (payError) {
    throw payError;
  }

  const { data: collectionNotes, error: noteError } = await supabase
    .from('credit_collection_notes')
    .select('*')
    .eq('credit_account_id', accountId)
    .order('created_at', { ascending: false });

  if (noteError) {
    throw noteError;
  }

  const { data: items, error: itemsError } = await supabase
    .from('credit_account_items')
    .select('*')
    .eq('credit_account_id', accountId)
    .order('created_at', { ascending: true });

  if (itemsError) {
    throw itemsError;
  }

  return { account, installments: installments ?? [], payments: payments ?? [], collectionNotes: collectionNotes ?? [], items: items ?? [] };
}

export async function getCustomerForCredit(
  supabase: SupabaseClient,
  customerId: string
): Promise<{ id: string; full_name: string; phone: string | null; email: string | null; address: string | null } | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, phone, email, address')
    .eq('id', customerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function insertCreditAccount(
  supabase: SupabaseClient,
  input: {
    customer_id: string;
    operation_number?: string | null;
    product_name: string;
    quantity: number;
    installment_count: number;
    installment_amount: number;
    sale_date: string;
    notes: string | null;
  }
): Promise<DbCreditAccount> {
  const { data, error } = await supabase
    .from('credit_accounts')
    .insert({
      customer_id: input.customer_id,
      operation_number: input.operation_number ?? null,
      product_name: input.product_name,
      quantity: input.quantity,
      installment_count: input.installment_count,
      installment_amount: input.installment_amount,
      sale_date: input.sale_date,
      notes: input.notes,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('CREDIT_ACCOUNT_INSERT_NO_ROWS');
  }

  return data;
}

export async function insertCreditAccountItems(
  supabase: SupabaseClient,
  accountId: string,
  items: Array<{ product_name: string; quantity: number; unit_price?: number | null }>
): Promise<void> {
  const { error } = await supabase
    .from('credit_account_items')
    .insert(
      items.map((item) => ({
        credit_account_id: accountId,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price ?? null,
      }))
    );

  if (error) throw error;
}

export async function getCreditAccountItems(
  supabase: SupabaseClient,
  accountId: string
): Promise<DbCreditAccountItem[]> {
  const { data, error } = await supabase
    .from('credit_account_items')
    .select('*')
    .eq('credit_account_id', accountId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCreditAccountItemsForAccounts(
  supabase: SupabaseClient,
  accountIds: string[]
): Promise<DbCreditAccountItem[]> {
  const { data, error } = await supabase
    .from('credit_account_items')
    .select('*')
    .in('credit_account_id', accountIds)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function generateInstallmentsForAccount(
  supabase: SupabaseClient,
  accountId: string,
  installmentCount: number,
  installmentAmount: number,
  startDate: string
): Promise<void> {
  const { error } = await supabase.rpc('generate_credit_installments', {
    p_credit_account_id: accountId,
    p_installment_count: installmentCount,
    p_installment_amount: installmentAmount,
    p_start_date: startDate,
  });

  if (error) {
    throw error;
  }
}

export async function registerCreditPaymentRpc(
  supabase: SupabaseClient,
  input: {
    credit_account_id: string;
    amount: number;
    payment_date: string;
    payment_method?: string;
    notes: string | null;
  }
): Promise<{ payment_id: string }> {
  const { data, error } = await supabase.rpc('register_credit_payment', {
    p_credit_account_id: input.credit_account_id,
    p_amount: input.amount,
    p_payment_date: input.payment_date,
    p_payment_method: input.payment_method ?? 'EFECTIVO',
    p_notes: input.notes ?? null,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('CREDIT_PAYMENT_INSERT_NO_RESULT');
  }

  return { payment_id: data as string };
}

export async function insertCollectionNote(
  supabase: SupabaseClient,
  input: {
    credit_account_id: string;
    contact_type: string;
    result: string;
    notes: string | null;
    created_by: string | null;
  }
): Promise<DbCreditCollectionNote> {
  const { data, error } = await supabase
    .from('credit_collection_notes')
    .insert({
      credit_account_id: input.credit_account_id,
      contact_type: input.contact_type,
      result: input.result,
      notes: input.notes,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('COLLECTION_NOTE_INSERT_NO_ROWS');
  }

  return data;
}

export async function getCreditDashboardFromRpc(
  supabase: SupabaseClient
): Promise<{
  total_financed: number;
  total_collected: number;
  total_pending: number;
  customer_count: number;
  customers_with_debt: number;
  active_accounts: number;
  finished_accounts: number;
  current_month_collected: number;
  previous_month_collected: number;
  monthly_collection: { month: string; collected: number }[];
} | null> {
  const { data, error } = await supabase.rpc('get_credit_dashboard');

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;

  return row as {
    total_financed: number;
    total_collected: number;
    total_pending: number;
    customer_count: number;
    customers_with_debt: number;
    active_accounts: number;
    finished_accounts: number;
    current_month_collected: number;
    previous_month_collected: number;
    monthly_collection: { month: string; collected: number }[];
  } | null;
}

export async function importPortfolioRow(
  supabase: SupabaseClient,
  row: import('@/lib/types').ImportPortfolioRow
): Promise<{ creditAccountId: string; customerId: string; paymentsImported: number }> {
  console.error('[importPortfolioRow] RPC input:', JSON.stringify(row, null, 2));

  const payload = {
  operation_number: row.operationNumber,
  product_name: row.productName,
  sale_date: row.saleDate,
  installment_count: row.installmentCount,
  installment_amount: row.installmentAmount,
  total_amount: row.totalAmount,
  accumulated_payment: row.accumulatedPayment,
  remaining_amount: row.remainingAmount,
  origin_month: row.originMonth ?? null,
  origin_year: row.originYear ?? null,

  customer: {
    full_name: row.customerFullName,
    phone: row.customerPhone,
    address: row.customerAddress,
    between_streets: row.betweenStreets,
  },

  payments: row.payments.map((p) => ({
    amount: p.amount,
    payment_date: p.paymentDate,
    payment_method: p.paymentMethod,
    notes: p.notes ?? null,
  })),
};

console.log(
  '[importPortfolioRow] RPC payload:',
  JSON.stringify(payload, null, 2)
);

const { data, error } = await supabase.rpc(
  'import_credit_portfolio_row',
  {
    p_data: payload,
  }
);

  if (error) {
    console.error('[importPortfolioRow] Supabase RPC error:', {
      message: error.message,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
      code: (error as { code?: string }).code,
    });
    throw error;
  }

  const result = data as {
    credit_account_id: string;
    customer_id: string;
    payments_imported: number;
  } | null;

  if (!result) {
    throw new Error('IMPORT_PORTFOLIO_ROW_NO_RESULT');
  }

  return {
    creditAccountId: result.credit_account_id,
    customerId: result.customer_id,
    paymentsImported: result.payments_imported,
  };
}

export async function getCollectionRouteFromRpc(
  supabase: SupabaseClient
): Promise<{
  credit_account_id: string;
  customer_id: string;
  customer_full_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  operation_number: string | null;
  product_name: string;
  total_debt: number;
  overdue_amount: number;
  days_overdue: number;
  first_overdue_date: string;
  installment_count: number;
  paid_installments: number;
  overdue_installments: number;
}[]> {
  // First refresh overdue statuses
  await supabase.rpc('refresh_credit_overdue');

  const { data, error } = await supabase.rpc('get_credit_collection_route');

  if (error) {
    throw error;
  }

  return (data ?? []) as {
    credit_account_id: string;
    customer_id: string;
    customer_full_name: string;
    customer_phone: string | null;
    customer_address: string | null;
    operation_number: string | null;
    product_name: string;
    total_debt: number;
    overdue_amount: number;
    days_overdue: number;
    first_overdue_date: string;
    installment_count: number;
    paid_installments: number;
    overdue_installments: number;
  }[];
}

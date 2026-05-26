import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CheckoutSaleRpcInput,
  CheckoutSaleRpcRow,
  SaleInsert,
  SaleItemInsert,
  SaleRow,
  SaleStatus,
  AdminSaleDetail,
  AdminSaleSummary,
  InstallmentStatus,
  PaymentPlanType,
  AllocationStatus,
  PaymentMethod,
  PaymentStatus,
  CollectionStatus,
  CollectionSummary,
} from '@/lib/supabase/types';
import { getOverdueDays } from '@/lib/financial/collectionHelpers';
import type { AdminSortDirection } from '@/lib/services/admin/types';

interface SupabaseCustomerRelation {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
}

interface SupabaseSaleItemRelation {
  id: string;
  legacy_product_id: number | null;
  product_name_snapshot: string;
  product_slug_snapshot: string | null;
  category_name_snapshot: string | null;
  unit_price_snapshot: number | string;
  quantity: number;
  line_subtotal: number | string;
  line_discount_amount: number | string;
  line_total: number | string;
  image_url_snapshot: string | null;
}

interface SupabaseInstallmentRelation {
  id: string;
  sale_id: string;
  installment_number: number;
  due_date: string;
  original_amount: number | string;
  paid_amount: number | string;
  remaining_amount: number | string;
  status: InstallmentStatus;
}

interface SupabasePaymentAllocationRelation {
  id: string;
  payment_id: string;
  installment_id: string;
  amount: number | string;
  status: AllocationStatus;
}

interface SupabasePaymentRelation {
  id: string;
  sale_id: string;
  customer_id: string;
  amount: number | string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  payment_date: string;
  notes: string | null;
  payment_allocations?: SupabasePaymentAllocationRelation[];
}

interface SupabaseAdminSaleRow {
  id: string;
  sale_number: string;
  sale_status: SaleStatus;
  subtotal_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  paid_amount: number | string;
  remaining_amount: number | string;
  collection_status: CollectionStatus;
  item_count: number;
  payment_plan_type: PaymentPlanType;
  installments_count: number;
  payment_method_requested: string | null;
  delivery_full_name: string | null;
  delivery_phone: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  notes: string | null;
  sale_date: string;
  created_at: string;
  updated_at: string;
  customers: SupabaseCustomerRelation | SupabaseCustomerRelation[] | null;
  sale_items?: SupabaseSaleItemRelation[];
  installments?: SupabaseInstallmentRelation[];
  payments?: SupabasePaymentRelation[];
}

export type AdminSaleSortKey = 'saleDate' | 'saleNumber' | 'customerName' | 'total' | 'saleStatus' | 'collectionStatus';

export type AdminSaleFilters = {
  search: string;
  saleStatus: SaleStatus | 'all';
  collectionStatus: CollectionStatus | 'all';
  dateFrom: string;
  dateTo: string;
};

export type PaginatedSalesInput = {
  page: number;
  limit: number;
  filters: AdminSaleFilters;
  sorting: {
    sortKey: AdminSaleSortKey;
    direction: AdminSortDirection;
  };
};

export type PaginatedSalesResult = {
  sales: AdminSaleSummary[];
  total: number;
};

const adminSaleSelect = `
  id,
  sale_number,
  sale_status,
  subtotal_amount,
  discount_amount,
  total_amount,
  paid_amount,
  remaining_amount,
  collection_status,
  item_count,
  payment_plan_type,
  installments_count,
  payment_method_requested,
  delivery_full_name,
  delivery_phone,
  delivery_address,
  delivery_city,
  notes,
  sale_date,
  created_at,
  updated_at,
  customers (
    id,
    full_name,
    phone,
    email,
    address,
    city
  )
`;

const adminSaleDetailSelect = `${adminSaleSelect},
  sale_items (
    id,
    legacy_product_id,
    product_name_snapshot,
    product_slug_snapshot,
    category_name_snapshot,
    unit_price_snapshot,
    quantity,
    line_subtotal,
    line_discount_amount,
    line_total,
    image_url_snapshot
  ),
  installments (
    id,
    sale_id,
    installment_number,
    due_date,
    original_amount,
    paid_amount,
    remaining_amount,
    status
  ),
  payments (
    id,
    sale_id,
    customer_id,
    amount,
    payment_method,
    status,
    payment_date,
    notes,
    payment_allocations (
      id,
      payment_id,
      installment_id,
      amount,
      status
    )
  )
`;

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

function toCollectionStatus(remainingAmount: number): 'PENDING' | 'PAID' {
  return remainingAmount > 0 ? 'PENDING' : 'PAID';
}

function getCustomerRelation(row: SupabaseAdminSaleRow): SupabaseCustomerRelation | null {
  if (Array.isArray(row.customers)) {
    return row.customers[0] ?? null;
  }

  return row.customers;
}

function mapSaleSummary(row: SupabaseAdminSaleRow): AdminSaleSummary {
  const remainingAmount = toNumber(row.remaining_amount);
  const customer = getCustomerRelation(row);

  return {
    id: row.id,
    saleNumber: row.sale_number,
    customerName: customer?.full_name ?? row.delivery_full_name ?? 'Cliente sin nombre',
    customerPhone: customer?.phone ?? row.delivery_phone,
    saleDate: row.sale_date,
    total: toNumber(row.total_amount),
    itemCount: row.item_count,
    paymentPlanType: row.payment_plan_type,
    installmentsCount: row.installments_count,
    saleStatus: row.sale_status,
    collectionStatus: row.collection_status ?? toCollectionStatus(remainingAmount),
  };
}

function mapSaleDetail(row: SupabaseAdminSaleRow): AdminSaleDetail {
  const summary = mapSaleSummary(row);
  const customer = getCustomerRelation(row);

  return {
    ...summary,
    subtotal: toNumber(row.subtotal_amount),
    discountAmount: toNumber(row.discount_amount),
    paidAmount: toNumber(row.paid_amount),
    remainingAmount: toNumber(row.remaining_amount),
    paymentMethodRequested: row.payment_method_requested,
    deliveryFullName: row.delivery_full_name,
    deliveryPhone: row.delivery_phone,
    deliveryAddress: row.delivery_address,
    deliveryCity: row.delivery_city,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customer: customer ? {
      id: customer.id,
      fullName: customer.full_name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      city: customer.city,
    } : null,
    items: (row.sale_items ?? []).map((item) => ({
      id: item.id,
      legacyProductId: item.legacy_product_id,
      name: item.product_name_snapshot,
      slug: item.product_slug_snapshot,
      category: item.category_name_snapshot,
      unitPrice: toNumber(item.unit_price_snapshot),
      quantity: item.quantity,
      subtotal: toNumber(item.line_subtotal),
      discountAmount: toNumber(item.line_discount_amount),
      total: toNumber(item.line_total),
      imageUrl: item.image_url_snapshot,
    })),
    installments: (row.installments ?? [])
      .sort((a, b) => a.installment_number - b.installment_number)
      .map((installment) => ({
        id: installment.id,
        saleId: installment.sale_id,
        installmentNumber: installment.installment_number,
        dueDate: installment.due_date,
        originalAmount: toNumber(installment.original_amount),
        paidAmount: toNumber(installment.paid_amount),
        remainingAmount: toNumber(installment.remaining_amount),
        status: installment.status,
        overdueDays: getOverdueDays(installment.due_date),
      })),
    payments: (row.payments ?? [])
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .map((payment) => ({
        id: payment.id,
        saleId: payment.sale_id,
        customerId: payment.customer_id,
        amount: toNumber(payment.amount),
        paymentMethod: payment.payment_method,
        status: payment.status,
        paymentDate: payment.payment_date,
        notes: payment.notes,
        allocations: (payment.payment_allocations ?? []).map((allocation) => ({
          id: allocation.id,
          paymentId: allocation.payment_id,
          installmentId: allocation.installment_id,
          amount: toNumber(allocation.amount),
          status: allocation.status,
        })),
      })),
  };
}

function getSaleOrderColumn(sortKey: AdminSaleSortKey): string {
  if (sortKey === 'saleNumber') return 'sale_number';
  if (sortKey === 'total') return 'total_amount';
  if (sortKey === 'saleStatus') return 'sale_status';
  if (sortKey === 'collectionStatus') return 'collection_status';
  return 'sale_date';
}

export async function createCheckoutSaleTransaction(
  supabase: SupabaseClient,
  input: CheckoutSaleRpcInput
): Promise<CheckoutSaleRpcRow> {
  const { data, error } = await supabase
    .rpc('create_checkout_sale', {
      p_checkout_request_id: input.checkoutRequestId,
      p_customer: input.customer,
      p_items: input.items,
      p_payment_method_requested: input.paymentMethodRequested ?? null,
      p_payment_plan_type: input.paymentPlanType,
      p_installments_count: input.installmentsCount,
      p_first_due_date: input.firstDueDate ?? null,
    })
    .single();

  if (error) {
    throw error;
  }

  return data as CheckoutSaleRpcRow;
}

const saleSelect = 'id, sale_number, checkout_request_id, customer_id, sale_status, subtotal_amount, discount_amount, total_amount, paid_amount, remaining_amount, item_count, payment_method_requested, delivery_full_name, delivery_phone, delivery_address, delivery_city, notes';

export async function findSaleByCheckoutRequestId(
  supabase: SupabaseClient,
  checkoutRequestId: string
): Promise<SaleRow | null> {
  const { data, error } = await supabase
    .from('sales')
    .select(saleSelect)
    .eq('checkout_request_id', checkoutRequestId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as SaleRow | null;
}

export async function createSale(
  supabase: SupabaseClient,
  input: SaleInsert
): Promise<SaleRow> {
  const { data, error } = await supabase
    .from('sales')
    .insert(input)
    .select(saleSelect)
    .single();

  if (error) {
    if (error.code === '23505') {
      const existingSale = await findSaleByCheckoutRequestId(supabase, input.checkout_request_id);
      if (existingSale) return existingSale;
    }
    throw error;
  }

  return data as SaleRow;
}

export async function createSaleItems(
  supabase: SupabaseClient,
  items: SaleItemInsert[]
): Promise<void> {
  const { error } = await supabase.from('sale_items').insert(items);

  if (error) {
    throw error;
  }
}

export async function updateSaleStatus(
  supabase: SupabaseClient,
  saleId: string,
  saleStatus: SaleStatus,
  notes: string
): Promise<void> {
  const { error } = await supabase
    .from('sales')
    .update({ sale_status: saleStatus, notes })
    .eq('id', saleId);

  if (error) {
    throw error;
  }
}

export async function getSales(
  supabase: SupabaseClient,
  limit = 50
): Promise<AdminSaleSummary[]> {
  const { data, error } = await supabase
    .from('sales')
    .select(adminSaleSelect)
    .order('sale_date', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data as unknown as SupabaseAdminSaleRow[] | null) ?? []).map(mapSaleSummary);
}

export async function getSalesPaginated(
  supabase: SupabaseClient,
  input: PaginatedSalesInput
): Promise<PaginatedSalesResult> {
  const from = (input.page - 1) * input.limit;
  const to = from + input.limit - 1;
  let query = supabase
    .from('sales')
    .select(adminSaleSelect, { count: 'exact' });

  if (input.filters.saleStatus !== 'all') {
    query = query.eq('sale_status', input.filters.saleStatus);
  }

  if (input.filters.collectionStatus !== 'all') {
    query = query.eq('collection_status', input.filters.collectionStatus);
  }

  if (input.filters.dateFrom) {
    query = query.gte('sale_date', input.filters.dateFrom);
  }

  if (input.filters.dateTo) {
    query = query.lte('sale_date', input.filters.dateTo);
  }

  if (input.filters.search) {
    const search = input.filters.search.replaceAll('%', '').replaceAll(',', ' ').trim();
    if (search) {
      query = query.or(`sale_number.ilike.%${search}%,delivery_full_name.ilike.%${search}%,delivery_phone.ilike.%${search}%`);
    }
  }

  query = query
    .order(getSaleOrderColumn(input.sorting.sortKey), { ascending: input.sorting.direction === 'asc' })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  const sales = ((data as unknown as SupabaseAdminSaleRow[] | null) ?? []).map(mapSaleSummary);

  if (input.sorting.sortKey === 'customerName') {
    sales.sort((firstSale, secondSale) => {
      const result = firstSale.customerName.localeCompare(secondSale.customerName, 'es-AR');
      return input.sorting.direction === 'asc' ? result : -result;
    });
  }

  return {
    sales,
    total: count ?? 0,
  };
}

export async function getRecentSales(
  supabase: SupabaseClient,
  limit = 10
): Promise<AdminSaleSummary[]> {
  return getSales(supabase, limit);
}

export async function getSalesWithCustomer(
  supabase: SupabaseClient,
  limit = 50
): Promise<AdminSaleSummary[]> {
  return getSales(supabase, limit);
}

export async function getSaleById(
  supabase: SupabaseClient,
  saleId: string
): Promise<AdminSaleDetail | null> {
  const { data, error } = await supabase
    .from('sales')
    .select(adminSaleDetailSelect)
    .eq('id', saleId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapSaleDetail(data as unknown as SupabaseAdminSaleRow) : null;
}

export async function refreshFinancialStatuses(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc('refresh_financial_statuses');

  if (error) {
    throw error;
  }
}

export async function getOverdueSales(
  supabase: SupabaseClient,
  limit = 50
): Promise<AdminSaleSummary[]> {
  const { data, error } = await supabase
    .from('sales')
    .select(adminSaleSelect)
    .eq('collection_status', 'OVERDUE')
    .order('sale_date', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data as unknown as SupabaseAdminSaleRow[] | null) ?? []).map(mapSaleSummary);
}

export async function getCustomersWithDebt(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from('sales')
    .select('customer_id')
    .gt('remaining_amount', 0);

  if (error) {
    throw error;
  }

  return new Set(((data as { customer_id: string }[] | null) ?? []).map((row) => row.customer_id)).size;
}

export async function getOverdueInstallmentsCount(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('installments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'OVERDUE')
    .gt('remaining_amount', 0);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getCollectionSummary(supabase: SupabaseClient): Promise<CollectionSummary> {
  await refreshFinancialStatuses(supabase);

  const { data, error } = await supabase
    .from('sales')
    .select('customer_id, remaining_amount, collection_status')
    .gt('remaining_amount', 0);

  if (error) {
    throw error;
  }

  const sales = (data as Array<{ customer_id: string; remaining_amount: number | string; collection_status: CollectionStatus }> | null) ?? [];
  const totalDebt = sales.reduce((total, sale) => total + toNumber(sale.remaining_amount), 0);
  const overdueDebt = sales
    .filter((sale) => sale.collection_status === 'OVERDUE')
    .reduce((total, sale) => total + toNumber(sale.remaining_amount), 0);
  const overdueSales = sales.filter((sale) => sale.collection_status === 'OVERDUE').length;
  const customersWithDebt = new Set(sales.map((sale) => sale.customer_id)).size;
  const overdueInstallments = await getOverdueInstallmentsCount(supabase);

  return {
    totalDebt,
    overdueDebt,
    overdueInstallments,
    overdueSales,
    customersWithDebt,
  };
}

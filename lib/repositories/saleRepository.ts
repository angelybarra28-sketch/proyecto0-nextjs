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
} from '@/lib/supabase/types';

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

interface SupabaseAdminSaleRow {
  id: string;
  sale_number: string;
  sale_status: SaleStatus;
  subtotal_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  paid_amount: number | string;
  remaining_amount: number | string;
  item_count: number;
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
}

const adminSaleSelect = `
  id,
  sale_number,
  sale_status,
  subtotal_amount,
  discount_amount,
  total_amount,
  paid_amount,
  remaining_amount,
  item_count,
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
    saleStatus: row.sale_status,
    collectionStatus: toCollectionStatus(remainingAmount),
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
  };
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

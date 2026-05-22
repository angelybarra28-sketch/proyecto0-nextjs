import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CheckoutSaleRpcInput,
  CheckoutSaleRpcRow,
  SaleInsert,
  SaleItemInsert,
  SaleRow,
  SaleStatus,
} from '@/lib/supabase/types';

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

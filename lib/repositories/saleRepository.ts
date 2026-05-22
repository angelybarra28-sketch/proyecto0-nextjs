import type { SupabaseClient } from '@supabase/supabase-js';
import type { SaleInsert, SaleItemInsert, SaleRow, SaleStatus } from '@/lib/supabase/types';

export async function createSale(
  supabase: SupabaseClient,
  input: SaleInsert
): Promise<SaleRow> {
  const { data, error } = await supabase
    .from('sales')
    .insert(input)
    .select('id, sale_number, customer_id, sale_status, subtotal_amount, discount_amount, total_amount, paid_amount, remaining_amount, item_count, payment_method_requested, delivery_full_name, delivery_phone, delivery_address, delivery_city, notes')
    .single();

  if (error) {
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

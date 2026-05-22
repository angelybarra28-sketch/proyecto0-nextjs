import type { SupabaseClient } from '@supabase/supabase-js';
import type { CustomerInsert, CustomerRow } from '@/lib/supabase/types';

export async function findOrCreateCustomer(
  supabase: SupabaseClient,
  input: CustomerInsert
): Promise<CustomerRow> {
  if (input.phone) {
    const { data: existingCustomer, error: findError } = await supabase
      .from('customers')
      .select('id, full_name, phone, email, address, city, notes')
      .eq('phone', input.phone)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existingCustomer) {
      return existingCustomer as CustomerRow;
    }
  }

  if (input.email) {
    const { data: existingCustomer, error: findError } = await supabase
      .from('customers')
      .select('id, full_name, phone, email, address, city, notes')
      .eq('email', input.email)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existingCustomer) {
      return existingCustomer as CustomerRow;
    }
  }

  const { data, error } = await supabase
    .from('customers')
    .insert(input)
    .select('id, full_name, phone, email, address, city, notes')
    .single();

  if (error) {
    throw error;
  }

  return data as CustomerRow;
}

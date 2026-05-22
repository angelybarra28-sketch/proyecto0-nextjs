import type { SupabaseClient } from '@supabase/supabase-js';
import type { CustomerInsert, CustomerRow } from '@/lib/supabase/types';

function normalizeCustomerInput(input: CustomerInsert): CustomerInsert {
  return {
    ...input,
    full_name: input.full_name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
  };
}

export async function findOrCreateCustomer(
  supabase: SupabaseClient,
  input: CustomerInsert
): Promise<CustomerRow> {
  const normalizedInput = normalizeCustomerInput(input);

  if (normalizedInput.phone) {
    const { data: existingCustomer, error: findError } = await supabase
      .from('customers')
      .select('id, full_name, phone, email, address, city, notes')
      .eq('phone', normalizedInput.phone)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existingCustomer) {
      return existingCustomer as CustomerRow;
    }
  }

  if (normalizedInput.email) {
    const { data: existingCustomer, error: findError } = await supabase
      .from('customers')
      .select('id, full_name, phone, email, address, city, notes')
      .eq('email', normalizedInput.email)
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
    .insert(normalizedInput)
    .select('id, full_name, phone, email, address, city, notes')
    .single();

  if (error) {
    if (error.code === '23505') {
      return findOrCreateCustomer(supabase, normalizedInput);
    }
    throw error;
  }

  return data as CustomerRow;
}

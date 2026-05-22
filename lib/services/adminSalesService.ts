import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { getRecentSales, getSaleById, getSalesWithCustomer } from '@/lib/repositories/saleRepository';
import type { AdminSaleDetail, AdminSaleSummary } from '@/lib/supabase/types';

export async function listAdminSales(limit = 50): Promise<AdminSaleSummary[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  return getSalesWithCustomer(supabase, limit);
}

export async function listRecentAdminSales(limit = 10): Promise<AdminSaleSummary[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  return getRecentSales(supabase, limit);
}

export async function getAdminSaleDetail(saleId: string): Promise<AdminSaleDetail | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  return getSaleById(supabase, saleId);
}

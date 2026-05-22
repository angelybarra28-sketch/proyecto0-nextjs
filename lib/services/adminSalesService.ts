import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { getCollectionSummary, getRecentSales, getSaleById, getSalesWithCustomer, refreshFinancialStatuses } from '@/lib/repositories/saleRepository';
import type { AdminSaleDetail, AdminSaleSummary, CollectionSummary } from '@/lib/supabase/types';

export async function listAdminSales(limit = 50): Promise<AdminSaleSummary[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  await refreshFinancialStatuses(supabase);
  return getSalesWithCustomer(supabase, limit);
}

export async function listRecentAdminSales(limit = 10): Promise<AdminSaleSummary[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  await refreshFinancialStatuses(supabase);
  return getRecentSales(supabase, limit);
}

export async function getAdminSaleDetail(saleId: string): Promise<AdminSaleDetail | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  await refreshFinancialStatuses(supabase);
  return getSaleById(supabase, saleId);
}

export async function getAdminCollectionSummary(): Promise<CollectionSummary> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      totalDebt: 0,
      overdueDebt: 0,
      overdueInstallments: 0,
      overdueSales: 0,
      customersWithDebt: 0,
    };
  }

  return getCollectionSummary(supabase);
}

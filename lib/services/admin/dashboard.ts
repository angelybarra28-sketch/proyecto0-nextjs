import { getAdminDashboardStats } from '@/lib/repositories/statisticsRepository';
import { getAdminDashboardAnalytics } from '@/lib/services/admin/analytics';
import { getCreditDashboard } from '@/lib/services/creditAccountService';
import { assertRuntimeContract } from '@/lib/services/runtimeContractService';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { AdminDashboardStats } from '@/lib/supabase/types';

export async function getAdminDashboard(): Promise<AdminDashboardStats | null> {
  let stats: AdminDashboardStats | null = null;

  try {
    await assertRuntimeContract('admin dashboard');
    stats = await getAdminDashboardAnalytics();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown error';
    console.error(`Dashboard load failed (${errorMessage}), falling back to repository aggregation:`, error);
  }

  if (!stats) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return null;
    }
    stats = await getAdminDashboardStats(supabase);
  }

  try {
    const credit = await getCreditDashboard();
    stats = {
      ...stats,
      credit: {
        totalFinanced: credit.totalFinanced,
        totalCollected: credit.totalCollected,
        totalPending: credit.totalPending,
        customerCount: credit.customerCount,
        customersWithDebt: credit.customersWithDebt,
        activeAccounts: credit.activeAccounts,
        finishedAccounts: credit.finishedAccounts,
        currentMonthCollected: credit.currentMonthCollected,
        previousMonthCollected: credit.previousMonthCollected,
        monthlyCollection: credit.monthlyCollection.map((m) => ({ month: m.month, salesCount: 0, revenue: 0, collected: m.collected })),
      },
    };
  } catch (creditError) {
    console.error('Error loading credit dashboard metrics:', creditError);
  }

  return stats;
}

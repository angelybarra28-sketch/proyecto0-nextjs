import { getAdminDashboardStats } from '@/lib/repositories/statisticsRepository';
import { getAdminDashboardAnalytics } from '@/lib/services/admin/analytics';
import { assertRuntimeContract } from '@/lib/services/runtimeContractService';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { AdminDashboardStats } from '@/lib/supabase/types';

export async function getAdminDashboard(): Promise<AdminDashboardStats | null> {
  try {
    await assertRuntimeContract('admin dashboard');
    return await getAdminDashboardAnalytics();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown error';
    console.error(`Dashboard load failed (${errorMessage}), falling back to repository aggregation:`, error);
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  return getAdminDashboardStats(supabase);
}

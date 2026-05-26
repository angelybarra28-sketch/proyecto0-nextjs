import { getAdminDashboardStats } from '@/lib/repositories/statisticsRepository';
import { getAdminDashboardAnalytics } from '@/lib/services/admin/analytics';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { AdminDashboardStats } from '@/lib/supabase/types';

export async function getAdminDashboard(): Promise<AdminDashboardStats | null> {
  try {
    return await getAdminDashboardAnalytics();
  } catch (error) {
    console.error('Error loading dashboard analytics RPC, falling back to repository aggregation:', error);
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  return getAdminDashboardStats(supabase);
}

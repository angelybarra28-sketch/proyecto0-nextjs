import { getAdminDashboardStats } from '@/lib/repositories/statisticsRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { AdminDashboardStats } from '@/lib/supabase/types';

export async function getAdminDashboard(): Promise<AdminDashboardStats | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  return getAdminDashboardStats(supabase);
}

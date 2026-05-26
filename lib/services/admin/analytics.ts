import { unstable_cache } from 'next/cache';
import { getDashboardAnalytics } from '@/lib/repositories/analyticsRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { AdminDashboardStats } from '@/lib/supabase/types';

const getCachedDashboardAnalytics = unstable_cache(
  async (): Promise<AdminDashboardStats | null> => {
    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      return null;
    }

    return getDashboardAnalytics(supabase);
  },
  ['admin-dashboard-analytics'],
  { revalidate: 60 }
);

export async function getAdminDashboardAnalytics(): Promise<AdminDashboardStats | null> {
  return getCachedDashboardAnalytics();
}

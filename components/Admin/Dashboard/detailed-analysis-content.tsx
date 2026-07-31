'use client';

import type { AdminDashboardStats } from '@/lib/supabase/types';
import type { SmartDashboardCommercial } from '@/lib/services/admin/smart-dashboard-client';
import { FinancialDashboardSection } from './FinancialDashboardSection';
import { RankingsSection } from './RankingsSection';

export default function DetailedAnalysisContent({
  dashboard,
  commercial,
}: {
  dashboard: AdminDashboardStats;
  commercial: SmartDashboardCommercial | null;
}) {
  return (
    <>
      <FinancialDashboardSection dashboard={dashboard} commercial={commercial} />
      {dashboard && <RankingsSection dashboard={dashboard} />}
    </>
  );
}

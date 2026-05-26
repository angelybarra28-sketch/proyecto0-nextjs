import { refreshAdminFinancialStatuses } from '@/lib/services/adminSalesService';
import { getAdminDashboardAnalytics } from '@/lib/services/admin/analytics';

export type MaintenanceJobName = 'refresh_financial_statuses' | 'refresh_dashboard_analytics' | 'send_payment_reminders';

export async function runMaintenanceJob(jobName: MaintenanceJobName): Promise<void> {
  if (jobName === 'refresh_financial_statuses') {
    await refreshAdminFinancialStatuses();
    return;
  }

  if (jobName === 'refresh_dashboard_analytics') {
    await getAdminDashboardAnalytics();
    return;
  }

  // Placeholder for a future scheduled reminder job. No side effects are implemented yet.
}

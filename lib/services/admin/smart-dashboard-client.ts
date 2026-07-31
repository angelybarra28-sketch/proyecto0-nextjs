import { parseApiError } from './helpers';
import type { SmartDashboardResponse } from './smart-dashboard';

export type {
  SmartDashboardResponse,
  SmartDashboardDayStatus,
  SmartDashboardQuickSummary,
  SmartDashboardAlert,
  SmartDashboardActivity,
  SmartDashboardCommercial,
  RecentPriceChange,
  CreditOverdueAggregate,
} from './smart-dashboard';

export async function fetchSmartDashboard(signal?: AbortSignal): Promise<SmartDashboardResponse> {
  const response = await fetch('/api/admin/smart-dashboard', { signal });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message || 'No se pudo cargar el dashboard inteligente');
  }

  return response.json();
}

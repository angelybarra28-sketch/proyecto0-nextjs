import { parseApiError } from './helpers';
import type {
  MaintenanceAction,
  MaintenanceActionResult,
  MaintenanceStatusResponse,
  StorageCheckResult,
} from './maintenance';

export type {
  MaintenanceStatus,
  MaintenanceSystemStatus,
  MaintenanceDiagnostic,
  MaintenanceSystemInfo,
  MaintenanceStatusResponse,
  MaintenanceActionResult,
  StorageCheckResult,
  StorageCheckBucket,
} from './maintenance';

export async function fetchMaintenanceStatus(signal?: AbortSignal): Promise<MaintenanceStatusResponse> {
  const response = await fetch('/api/admin/maintenance/status', { signal });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message || 'No se pudo cargar el estado del sistema');
  }

  return response.json();
}

export async function runMaintenanceAction(action: MaintenanceAction): Promise<MaintenanceActionResult> {
  const response = await fetch('/api/admin/maintenance/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message || 'No se pudo ejecutar la acción de mantenimiento');
  }

  return response.json();
}

export function isStorageCheckResult(result: unknown): result is StorageCheckResult {
  return Boolean(result && typeof result === 'object' && 'buckets' in result);
}

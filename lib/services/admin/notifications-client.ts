import { parseApiError } from './helpers';
import type { NotificationsResponse } from './notifications';

export type {
  NotificationItem,
  NotificationCategory,
  NotificationPriority,
  NotificationTone,
  NotificationSummary,
  NotificationsResponse,
} from './notifications';

export async function fetchNotifications(signal?: AbortSignal): Promise<NotificationsResponse> {
  const response = await fetch('/api/admin/notifications', { signal });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message || 'No se pudieron cargar las notificaciones');
  }

  return response.json();
}

export async function markNotificationsViewed(): Promise<void> {
  try {
    await fetch('/api/admin/notifications', { method: 'POST' });
  } catch {
    // Registrar la vista es opcional; nunca debe romper la página.
  }
}

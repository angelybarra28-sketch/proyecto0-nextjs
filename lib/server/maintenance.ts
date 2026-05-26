import { errorResponse } from '@/lib/server/apiErrors';

export function isMaintenanceModeActive(): boolean {
  return process.env.MAINTENANCE_MODE?.trim().toLowerCase() === 'true';
}

export function maintenanceModeError(): Error {
  return new Error('MAINTENANCE_MODE_ACTIVE');
}

export function maintenanceModeResponse(requestId: string) {
  return errorResponse(maintenanceModeError(), requestId, 503);
}

export function getMaintenanceModeStatus() {
  return {
    active: isMaintenanceModeActive(),
    source: 'MAINTENANCE_MODE',
  };
}

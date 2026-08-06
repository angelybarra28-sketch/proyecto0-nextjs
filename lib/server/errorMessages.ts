export type ApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'RUNTIME_CONTRACT_FAILED'
  | 'STOCK_INSUFFICIENT'
  | 'PRODUCT_NOT_FOUND'
  | 'MAINTENANCE_MODE_ACTIVE'
  | 'STORAGE_INCONSISTENT'
  | 'INTERNAL_ERROR';

const SAFE_MESSAGES: Record<ApiErrorCode, string> = {
  AUTH_REQUIRED: 'Autenticación requerida',
  FORBIDDEN: 'Acceso denegado',
  VALIDATION_ERROR: 'Solicitud inválida',
  RUNTIME_CONTRACT_FAILED: 'Inconsistencia de base de datos',
  STOCK_INSUFFICIENT: 'Stock insuficiente',
  PRODUCT_NOT_FOUND: 'Recurso no encontrado',
  MAINTENANCE_MODE_ACTIVE: 'Servicio temporalmente no disponible',
  STORAGE_INCONSISTENT: 'Inconsistencia de datos',
  INTERNAL_ERROR: 'Error interno del servidor',
};

export function resolveSafeErrorMessage(code: ApiErrorCode, status: number, safeMessage?: string): string {
  if (typeof safeMessage === 'string' && safeMessage.trim().length > 0) {
    return safeMessage;
  }

  if (code === 'MAINTENANCE_MODE_ACTIVE') {
    return SAFE_MESSAGES.MAINTENANCE_MODE_ACTIVE;
  }

  if (status >= 500) {
    return SAFE_MESSAGES.INTERNAL_ERROR;
  }

  if (code === 'INTERNAL_ERROR') {
    if (status === 404) return 'Recurso no encontrado';
    if (status === 409) return 'Conflicto';
    return 'Solicitud inválida';
  }

  return SAFE_MESSAGES[code] ?? 'Solicitud inválida';
}

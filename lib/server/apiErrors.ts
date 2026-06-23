import { NextResponse } from 'next/server';

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

export function classifyError(error: unknown): ApiErrorCode {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('MAINTENANCE_MODE_ACTIVE')) return 'MAINTENANCE_MODE_ACTIVE';
  if (message.includes('STORAGE_INCONSISTENT')) return 'STORAGE_INCONSISTENT';
  if (message.includes('insufficient stock')) return 'STOCK_INSUFFICIENT';
  if (message.includes('not found') || message.includes('no longer exists')) return 'PRODUCT_NOT_FOUND';
  if (message.includes('Contrato de base de datos') || message.includes('runtime contract')) return 'RUNTIME_CONTRACT_FAILED';
  if (message.includes('inválid') || message.includes('invalid') || message.includes('required')) return 'VALIDATION_ERROR';

  return 'INTERNAL_ERROR';
}

export function errorResponse(error: unknown, requestId: string, status = 400) {
  const message = error instanceof Error ? error.message : 'Error interno';

  return NextResponse.json({
    success: false,
    error: {
      code: classifyError(error),
      message,
      requestId,
    },
  }, { status, headers: { 'x-request-id': requestId } });
}

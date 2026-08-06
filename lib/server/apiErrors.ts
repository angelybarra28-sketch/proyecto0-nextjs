import { NextResponse } from 'next/server';
import { resolveSafeErrorMessage, type ApiErrorCode } from './errorMessages';

export type { ApiErrorCode } from './errorMessages';

export function classifyError(error: unknown): ApiErrorCode {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('MAINTENANCE_MODE_ACTIVE')) return 'MAINTENANCE_MODE_ACTIVE';
  if (message.includes('STORAGE_INCONSISTENT')) return 'STORAGE_INCONSISTENT';
  if (message.includes('insufficient stock')) return 'STOCK_INSUFFICIENT';
  if (message.includes('not found') || message.includes('no longer exists')) return 'PRODUCT_NOT_FOUND';
  if (message.includes('Contrato de base de datos') || message.includes('runtime contract')) return 'RUNTIME_CONTRACT_FAILED';
  if (message.includes('inválid') || message.includes('invalid') || message.includes('required') || message.includes('obligatorio') || message.includes('debe ser un número') || message.includes('supera el saldo')) return 'VALIDATION_ERROR';

  return 'INTERNAL_ERROR';
}

export function errorResponse(error: unknown, requestId: string, status = 400, safeMessage?: string) {
  const code = classifyError(error);

  // El mensaje del error nunca se expone al cliente en crudo: puede contener
  // detalle interno de Supabase, PostgreSQL u otras librerías. Se devuelve un
  // mensaje seguro derivado del código y del status, salvo que el caller pase
  // explícitamente un `safeMessage` (mensaje curado, sin detalles internos).
  // El detalle completo queda únicamente en los logs del servidor.
  const message = resolveSafeErrorMessage(code, status, safeMessage);

  return NextResponse.json({
    success: false,
    error: {
      code,
      message,
      requestId,
    },
  }, { status, headers: { 'x-request-id': requestId } });
}

export function validateInstallmentAmount(value: unknown): number {
  if (typeof value !== 'number' || value <= 0) {
    throw new Error('installmentAmount debe ser un número positivo');
  }
  return value;
}

export function validatePaymentAmount(value: unknown): number {
  if (typeof value !== 'number' || value <= 0) {
    throw new Error('amount debe ser un número positivo');
  }
  return value;
}

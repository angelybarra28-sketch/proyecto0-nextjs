export function validateCustomerName(value: unknown): string {
  if (!value || typeof value !== 'string') {
    throw new Error('fullName es requerido');
  }
  return value;
}

export function validateUserIdField(value: unknown): void {
  if (value !== null && typeof value !== 'string') {
    throw new Error('userId debe ser un string o null');
  }
}

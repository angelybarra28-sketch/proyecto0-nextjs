export function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text ? text : null;
}

export function validarFecha(fecha: string): Date {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) throw new Error(`Fecha inválida: ${fecha}`);
  return d;
}

export function validarMonto(monto: unknown): number {
  const n = Number(monto);
  if (isNaN(n) || n <= 0) throw new Error('El monto debe ser un número positivo');
  return n;
}

export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

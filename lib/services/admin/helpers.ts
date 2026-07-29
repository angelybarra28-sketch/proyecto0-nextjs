import type { CompraEstado } from '@/lib/supabase/types';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export function appendDefinedParam(searchParams: URLSearchParams, key: string, value: unknown) {
  if (value !== undefined && value !== null && value !== '') {
    searchParams.set(key, String(value));
  }
}

export async function parseApiError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    return payload?.error?.message ?? payload?.message ?? '';
  } catch {
    return '';
  }
}

export const PROVEEDORES_COLS = 'id, nombre, telefono, whatsapp, email, direccion, observaciones, estado, created_at, updated_at';
export const COMPRAS_COLS = 'id, proveedor_id, fecha, numero_factura, importe_total, estado, observaciones, created_at, updated_at';
export const COMPRAS_COLS_WITH_PROVEEDOR = `${COMPRAS_COLS}, proveedor:proveedores!inner(nombre)`;
export const ITEMS_COLS = 'id, compra_id, descripcion, cantidad, costo_unitario, subtotal, created_at';
export const PAGOS_COLS = 'id, proveedor_id, compra_id, fecha, monto, forma_pago, observaciones, created_at, updated_at';
export const ADJUNTOS_COLS = 'id, compra_id, pago_id, tipo, nombre_original, path, url, created_at';

export function calcularEstado(importe_total: number, pagado: number): CompraEstado {
  if (pagado <= 0) return 'pendiente';
  if (pagado >= importe_total) return 'pagada';
  return 'parcial';
}

export function sumarPagos(pagoTotal: { monto: number }[] | null | undefined): number {
  return (pagoTotal ?? []).reduce((s: number, p: any) => s + Number(p.monto), 0);
}

export async function recalcularEstadoCompra(supabase: ReturnType<typeof getSupabaseAdminClient>, compraId: string): Promise<void> {
  if (!supabase) return;

  const { data: compra } = await supabase.from('proveedor_compras').select('importe_total').eq('id', compraId).single();
  if (!compra) return;

  const { data: pagosData } = await supabase.from('proveedor_pagos').select('monto').eq('compra_id', compraId);
  const pagado = (pagosData ?? []).reduce((s: number, p: any) => s + Number(p.monto), 0);
  const estado = calcularEstado(Number(compra.importe_total), pagado);

  await supabase.from('proveedor_compras').update({ estado }).eq('id', compraId);
}

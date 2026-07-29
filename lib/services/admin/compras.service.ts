import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { ProveedorCompraRow, ProveedorCompraInsert, ProveedorCompraItemRow, ProveedorCompraItemInsert, ProveedorPagoRow, ProveedorAdjuntoRow } from '@/lib/supabase/types';
import { validarMonto, validarFecha } from '@/lib/validation/common';
import { COMPRAS_COLS, COMPRAS_COLS_WITH_PROVEEDOR, ITEMS_COLS, PAGOS_COLS, ADJUNTOS_COLS, calcularEstado, sumarPagos } from './helpers';

export async function listCompras(
  proveedorId?: string,
  estado?: string,
  dateFrom?: string,
  dateTo?: string,
  soloPendientes?: boolean,
  soloPagadas?: boolean
): Promise<ProveedorCompraRow[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  let query = supabase
    .from('proveedor_compras')
    .select(`${COMPRAS_COLS}, proveedor:proveedores!inner(nombre), pago_total:proveedor_pagos(monto, fecha)`)
    .order('fecha', { ascending: false });

  if (proveedorId) query = query.eq('proveedor_id', proveedorId);
  if (estado && estado !== 'todos') query = query.eq('estado', estado);
  if (dateFrom) query = query.gte('fecha', dateFrom);
  if (dateTo) query = query.lte('fecha', dateTo);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let result = ((data ?? []) as any[]).map((r: any) => {
    const pagos = (r.pago_total ?? []) as { monto: number; fecha: string }[];
    const pagado = sumarPagos(pagos);
    const importeTotal = Number(r.importe_total);
    const ultimoPago = pagos.length > 0
      ? pagos.reduce((max, p) => (p.fecha > max ? p.fecha : max), pagos[0].fecha)
      : null;
    return {
      ...r,
      proveedor_nombre: r.proveedor?.nombre,
      pagado,
      saldo: importeTotal - pagado,
      estado: calcularEstado(importeTotal, pagado),
      ultimo_pago_fecha: ultimoPago,
    };
  }) as ProveedorCompraRow[];

  if (soloPendientes) {
    result = result.filter((c) => (c.saldo ?? 0) > 0);
  }

  if (soloPagadas) {
    result = result.filter((c) => (c.saldo ?? 0) === 0);
  }

  return result;
}

export async function getCompra(id: string): Promise<{ compra: ProveedorCompraRow; items: ProveedorCompraItemRow[]; pagos: ProveedorPagoRow[]; adjuntos: ProveedorAdjuntoRow[] } | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data: compra, error: compraError } = await supabase
    .from('proveedor_compras')
    .select(`${COMPRAS_COLS}, proveedor:proveedores!inner(nombre)`)
    .eq('id', id)
    .single();

  if (compraError) throw new Error(compraError.message);
  if (!compra) return null;

  const [{ data: items }, { data: pagos }, { data: adjuntos }] = await Promise.all([
    supabase.from('proveedor_compra_items').select(ITEMS_COLS).eq('compra_id', id).order('created_at'),
    supabase.from('proveedor_pagos').select(PAGOS_COLS).eq('compra_id', id).order('fecha', { ascending: false }),
    supabase.from('proveedor_adjuntos').select(ADJUNTOS_COLS).eq('compra_id', id).order('created_at'),
  ]);

  const pagosList = (pagos ?? []) as ProveedorPagoRow[];
  const pagado = pagosList.reduce((s: number, p: any) => s + Number(p.monto), 0);
  const importeTotal = Number((compra as any).importe_total);
  const ultimoPago = pagosList.length > 0 ? pagosList[0] : null;

  return {
    compra: {
      ...compra,
      proveedor_nombre: (compra as any).proveedor?.nombre,
      pagado,
      saldo: importeTotal - pagado,
      estado: calcularEstado(importeTotal, pagado),
      ultimo_pago_fecha: (ultimoPago as any)?.fecha ?? null,
    } as ProveedorCompraRow,
    items: (items ?? []) as ProveedorCompraItemRow[],
    pagos: pagosList,
    adjuntos: (adjuntos ?? []) as ProveedorAdjuntoRow[],
  };
}

export async function createCompra(input: ProveedorCompraInsert): Promise<ProveedorCompraRow> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no disponible');

  if (!input.proveedor_id) throw new Error('El proveedor es obligatorio');
  validarMonto(input.importe_total);

  if (input.fecha) {
    validarFecha(input.fecha);
  }

  const { data: proveedor } = await supabase.from('proveedores').select('id').eq('id', input.proveedor_id).single();
  if (!proveedor) throw new Error('El proveedor especificado no existe');

  const { data, error } = await supabase.from('proveedor_compras').insert(input).select(COMPRAS_COLS).single();
  if (error) throw new Error(error.message);
  return data as ProveedorCompraRow;
}

export async function updateCompra(id: string, input: Partial<ProveedorCompraInsert>): Promise<ProveedorCompraRow> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no disponible');

  const { data, error } = await supabase.from('proveedor_compras').update(input).eq('id', id).select(COMPRAS_COLS).single();
  if (error) throw new Error(error.message);
  return data as ProveedorCompraRow;
}

export async function deleteCompra(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no disponible');

  const { count } = await supabase.from('proveedor_pagos').select('id', { count: 'exact', head: true }).eq('compra_id', id);
  const totalPagos = count ?? 0;

  if (totalPagos > 0) {
    throw new Error('No se puede eliminar la compra porque tiene pagos asociados. Elimine los pagos primero o anule la factura.');
  }

  const { error } = await supabase.from('proveedor_compras').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function createCompraItems(items: ProveedorCompraItemInsert[]): Promise<ProveedorCompraItemRow[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from('proveedor_compra_items').insert(items).select(ITEMS_COLS);
  if (error) throw new Error(error.message);
  return (data ?? []) as ProveedorCompraItemRow[];
}

export async function deleteCompraItem(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no disponible');

  const { error } = await supabase.from('proveedor_compra_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

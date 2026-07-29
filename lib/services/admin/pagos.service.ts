import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { ProveedorPagoRow, ProveedorPagoInsert, ProveedorAdjuntoRow, ProveedorAdjuntoInsert } from '@/lib/supabase/types';
import { PAGOS_COLS, ADJUNTOS_COLS, validarMonto, validarFecha, recalcularEstadoCompra } from './helpers';

export async function listPagos(proveedorId?: string): Promise<ProveedorPagoRow[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  let query = supabase
    .from('proveedor_pagos')
    .select(`${PAGOS_COLS}, proveedor:proveedores!inner(nombre), compra:proveedor_compras!inner(numero_factura)`)
    .order('fecha', { ascending: false });

  if (proveedorId) query = query.eq('proveedor_id', proveedorId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((r: any) => ({
    ...r,
    proveedor_nombre: r.proveedor?.nombre,
    compra_numero_factura: r.compra?.numero_factura,
  })) as ProveedorPagoRow[];
}

export async function createPago(input: ProveedorPagoInsert): Promise<ProveedorPagoRow> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no disponible');

  if (!input.proveedor_id) throw new Error('El proveedor es obligatorio');
  const monto = validarMonto(input.monto);

  if (input.fecha) {
    validarFecha(input.fecha);
  }

  const { data: proveedor } = await supabase.from('proveedores').select('id').eq('id', input.proveedor_id).single();
  if (!proveedor) throw new Error('El proveedor especificado no existe');

  if (input.compra_id) {
    const { data: compra } = await supabase.from('proveedor_compras').select('id, importe_total, proveedor_id').eq('id', input.compra_id).single();
    if (!compra) throw new Error('La compra asociada no existe');
    if (compra.proveedor_id !== input.proveedor_id) throw new Error('La compra no pertenece al proveedor especificado');

    const { data: rpcData, error: rpcError } = await supabase.rpc('insert_and_validate_pago', {
      p_proveedor_id: input.proveedor_id,
      p_compra_id: input.compra_id,
      p_fecha: input.fecha,
      p_monto: monto,
      p_forma_pago: input.forma_pago,
      p_observaciones: input.observaciones ?? null,
    });

    if (rpcError) throw new Error(rpcError.message);

    return (rpcData as unknown) as ProveedorPagoRow;
  }

  const { data, error } = await supabase.from('proveedor_pagos').insert({
    proveedor_id: input.proveedor_id,
    compra_id: null,
    fecha: input.fecha,
    monto,
    forma_pago: input.forma_pago,
    observaciones: input.observaciones ?? null,
  }).select(PAGOS_COLS).single();
  if (error) throw new Error(error.message);

  return data as ProveedorPagoRow;
}

export async function deletePago(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no disponible');

  const { data: pago } = await supabase.from('proveedor_pagos').select('compra_id').eq('id', id).single();
  if (!pago) throw new Error('Pago no encontrado');

  const { error } = await supabase.from('proveedor_pagos').delete().eq('id', id);
  if (error) throw new Error(error.message);

  if (pago.compra_id) {
    await recalcularEstadoCompra(supabase, pago.compra_id);
  }
}

export async function createAdjunto(input: ProveedorAdjuntoInsert): Promise<ProveedorAdjuntoRow> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no disponible');

  const { data, error } = await supabase.from('proveedor_adjuntos').insert(input).select(ADJUNTOS_COLS).single();
  if (error) throw new Error(error.message);
  return data as ProveedorAdjuntoRow;
}

export async function listAdjuntos(): Promise<ProveedorAdjuntoRow[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('proveedor_adjuntos')
    .select(`${ADJUNTOS_COLS}`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ProveedorAdjuntoRow[];
}

export async function deleteAdjunto(id: string, path: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no disponible');

  const { error: storageError } = await supabase.storage.from('proveedor-adjuntos').remove([path]);
  if (storageError) console.error('Error deleting file from storage:', storageError);

  const { error } = await supabase.from('proveedor_adjuntos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

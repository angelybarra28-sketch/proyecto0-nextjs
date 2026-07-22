import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type {
  ProveedorRow,
  ProveedorInsert,
  ProveedorCompraRow,
  ProveedorCompraInsert,
  ProveedorCompraItemRow,
  ProveedorCompraItemInsert,
  ProveedorPagoRow,
  ProveedorPagoInsert,
  ProveedorAdjuntoRow,
  ProveedorAdjuntoInsert,
  ProveedorDashboard,
  ProveedorDeuda,
  ProveedorAlerta,
} from '@/lib/supabase/types';

const PROVEEDORES_COLS = 'id, nombre, telefono, whatsapp, email, direccion, observaciones, estado, created_at, updated_at';
const COMPRAS_COLS = 'id, proveedor_id, fecha, numero_factura, importe_total, estado, observaciones, created_at, updated_at';
const COMPRAS_COLS_WITH_PROVEEDOR = `${COMPRAS_COLS}, proveedor:proveedores!inner(nombre)`;
const ITEMS_COLS = 'id, compra_id, descripcion, cantidad, costo_unitario, subtotal, created_at';
const PAGOS_COLS = 'id, proveedor_id, compra_id, fecha, monto, forma_pago, observaciones, created_at, updated_at';
const ADJUNTOS_COLS = 'id, compra_id, tipo, nombre_original, path, url, created_at';

export async function listProveedores(estado?: string, search?: string): Promise<ProveedorRow[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  let query = supabase.from('proveedores').select(PROVEEDORES_COLS).order('nombre');

  if (estado && estado !== 'todos') {
    query = query.eq('estado', estado);
  }
  if (search) {
    query = query.ilike('nombre', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ProveedorRow[];
}

export async function getProveedor(id: string): Promise<ProveedorRow | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from('proveedores').select(PROVEEDORES_COLS).eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as ProveedorRow;
}

export async function createProveedor(input: ProveedorInsert): Promise<ProveedorRow> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no disponible');

  const { data, error } = await supabase.from('proveedores').insert(input).select(PROVEEDORES_COLS).single();
  if (error) throw new Error(error.message);
  return data as ProveedorRow;
}

export async function updateProveedor(id: string, input: Partial<ProveedorInsert>): Promise<ProveedorRow> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no disponible');

  const { data, error } = await supabase.from('proveedores').update(input).eq('id', id).select(PROVEEDORES_COLS).single();
  if (error) throw new Error(error.message);
  return data as ProveedorRow;
}

export async function listCompras(
  proveedorId?: string,
  estado?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ProveedorCompraRow[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  let query = supabase
    .from('proveedor_compras')
    .select(`${COMPRAS_COLS}, proveedor:proveedores!inner(nombre), pago_total:proveedor_pagos(monto)`)
    .order('fecha', { ascending: false });

  if (proveedorId) query = query.eq('proveedor_id', proveedorId);
  if (estado && estado !== 'todos') query = query.eq('estado', estado);
  if (dateFrom) query = query.gte('fecha', dateFrom);
  if (dateTo) query = query.lte('fecha', dateTo);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((r: any) => ({
    ...r,
    proveedor_nombre: r.proveedor?.nombre,
    pagado: r.pago_total?.reduce((s: number, p: any) => s + Number(p.monto), 0) ?? 0,
  })) as ProveedorCompraRow[];
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

  return {
    compra: { ...compra, proveedor_nombre: (compra as any).proveedor?.nombre } as ProveedorCompraRow,
    items: (items ?? []) as ProveedorCompraItemRow[],
    pagos: (pagos ?? []) as ProveedorPagoRow[],
    adjuntos: (adjuntos ?? []) as ProveedorAdjuntoRow[],
  };
}

export async function createCompra(input: ProveedorCompraInsert): Promise<ProveedorCompraRow> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no disponible');

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

  const { data, error } = await supabase.from('proveedor_pagos').insert(input).select(PAGOS_COLS).single();
  if (error) throw new Error(error.message);
  return data as ProveedorPagoRow;
}

export async function deletePago(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no disponible');

  const { error } = await supabase.from('proveedor_pagos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function createAdjunto(input: ProveedorAdjuntoInsert): Promise<ProveedorAdjuntoRow> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no disponible');

  const { data, error } = await supabase.from('proveedor_adjuntos').insert(input).select(ADJUNTOS_COLS).single();
  if (error) throw new Error(error.message);
  return data as ProveedorAdjuntoRow;
}

export async function deleteAdjunto(id: string, path: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no disponible');

  const { error: storageError } = await supabase.storage.from('proveedor-adjuntos').remove([path]);
  if (storageError) console.error('Error deleting file from storage:', storageError);

  const { error } = await supabase.from('proveedor_adjuntos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getProveedorDashboard(): Promise<ProveedorDashboard> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return {
    compras_mes: 0, deuda_total: 0, facturas_pendientes: 0,
    total_comprado: 0, total_pagado: 0, ultimas_compras: [],
  };

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const [comprasMes, comprasTotal, pagosTotal, pendientes, ultimasResult] = await Promise.all([
    supabase.from('proveedor_compras').select('importe_total', { count: 'exact' }).gte('fecha', firstDay),
    supabase.from('proveedor_compras').select('importe_total'),
    supabase.from('proveedor_pagos').select('monto'),
    supabase.from('proveedor_compras').select('id', { count: 'exact', head: true }).neq('estado', 'pagada'),
    supabase.from('proveedor_compras')
      .select(`id, fecha, importe_total, estado, proveedor:proveedores!inner(nombre)`)
      .order('fecha', { ascending: false })
      .limit(5),
  ]);

  const compras_mes = ((comprasMes.data ?? []) as any[]).reduce((s: number, r: any) => s + Number(r.importe_total), 0);
  const total_comprado = ((comprasTotal.data ?? []) as any[]).reduce((s: number, r: any) => s + Number(r.importe_total), 0);
  const total_pagado = ((pagosTotal.data ?? []) as any[]).reduce((s: number, r: any) => s + Number(r.monto), 0);
  const facturas_pendientes = pendientes.count ?? 0;

  return {
    compras_mes,
    deuda_total: total_comprado - total_pagado,
    facturas_pendientes,
    total_comprado,
    total_pagado,
    ultimas_compras: ((ultimasResult.data ?? []) as any[]).map((r: any) => ({
      id: r.id,
      proveedor_nombre: r.proveedor?.nombre ?? '—',
      fecha: r.fecha,
      importe_total: Number(r.importe_total),
      estado: r.estado,
    })),
  };
}

export async function getDeudasPorProveedor(): Promise<ProveedorDeuda[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data: proveedores, error: provError } = await supabase
    .from('proveedores')
    .select('id, nombre')
    .eq('estado', 'activo')
    .order('nombre');

  if (provError) throw new Error(provError.message);
  if (!proveedores?.length) return [];

  const deudas: ProveedorDeuda[] = [];

  for (const p of proveedores) {
    const [{ data: compras }, { data: pagos }] = await Promise.all([
      supabase.from('proveedor_compras').select('importe_total').eq('proveedor_id', p.id),
      supabase.from('proveedor_pagos').select('monto').eq('proveedor_id', p.id),
    ]);

    const total_comprado = ((compras ?? []) as any[]).reduce((s: number, r: any) => s + Number(r.importe_total), 0);
    const total_pagado = ((pagos ?? []) as any[]).reduce((s: number, r: any) => s + Number(r.monto), 0);

    deudas.push({
      proveedor_id: p.id,
      proveedor_nombre: p.nombre,
      total_comprado,
      total_pagado,
      saldo_pendiente: total_comprado - total_pagado,
    });
  }

  return deudas.filter((d) => d.total_comprado > 0);
}

export async function getProveedorAlertas(): Promise<ProveedorAlerta[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const alertas: ProveedorAlerta[] = [];
  let idCounter = 0;
  const hoy = new Date();
  const hace90dias = new Date(hoy);
  hace90dias.setDate(hace90dias.getDate() - 90);
  const fechaLimite = hace90dias.toISOString().split('T')[0];

  const { data: comprasPendientes } = await supabase
    .from('proveedor_compras')
    .select(`id, fecha, importe_total, estado, proveedor_id, proveedor:proveedores!inner(nombre)`)
    .in('estado', ['pendiente', 'parcial'])
    .order('fecha', { ascending: false });

  for (const c of (comprasPendientes ?? []) as any[]) {
    alertas.push({
      id: `alerta-${++idCounter}`,
      tipo: c.estado === 'pendiente' ? 'factura_pendiente' : 'saldo_pendiente',
      titulo: c.estado === 'pendiente' ? 'Factura pendiente' : 'Pago parcial',
      descripcion: `${(c as any).proveedor?.nombre ?? '—'} — $${Number(c.importe_total).toLocaleString('es-AR')}`,
      proveedor_id: c.proveedor_id,
      proveedor_nombre: (c as any).proveedor?.nombre ?? '—',
      compra_id: c.id,
      compra_fecha: c.fecha,
      compra_importe: Number(c.importe_total),
      link_tab: 'compras',
      link_id: c.id,
    });
  }

  const { data: proveedores } = await supabase
    .from('proveedores')
    .select('id, nombre');

  if (proveedores?.length) {
    const proveedorIds = proveedores.map((p: any) => p.id);

    const { data: ultimasCompras } = await supabase
      .from('proveedor_compras')
      .select('proveedor_id, fecha')
      .in('proveedor_id', proveedorIds)
      .order('fecha', { ascending: false });

    const ultimaFechaPorProv = new Map<string, string>();
    for (const c of (ultimasCompras ?? []) as any[]) {
      if (!ultimaFechaPorProv.has(c.proveedor_id)) {
        ultimaFechaPorProv.set(c.proveedor_id, c.fecha);
      }
    }

    for (const p of proveedores as any[]) {
      const ultimaFecha = ultimaFechaPorProv.get(p.id);
      const sinMovimiento = !ultimaFecha || ultimaFecha < fechaLimite;
      if (sinMovimiento) {
        alertas.push({
          id: `alerta-${++idCounter}`,
          tipo: 'sin_movimiento',
          titulo: 'Sin movimiento',
          descripcion: `${p.nombre} — sin compras en los últimos 90 días`,
          proveedor_id: p.id,
          proveedor_nombre: p.nombre,
          link_tab: 'proveedores',
        });
      }
    }
  }

  const { data: comprasSinFactura } = await supabase
    .from('proveedor_compras')
    .select(`id, fecha, importe_total, proveedor_id, proveedor:proveedores!inner(nombre)`)
    .is('numero_factura', null)
    .order('fecha', { ascending: false })
    .limit(50);

  if (comprasSinFactura?.length) {
    const compraIds = comprasSinFactura.map((c: any) => c.id);

    const { data: adjuntos } = await supabase
      .from('proveedor_adjuntos')
      .select('compra_id')
      .in('compra_id', compraIds);

    const comprasConAdjunto = new Set((adjuntos ?? []).map((a: any) => a.compra_id));

    for (const c of comprasSinFactura as any[]) {
      if (!comprasConAdjunto.has(c.id)) {
        alertas.push({
          id: `alerta-${++idCounter}`,
          tipo: 'sin_factura_adjunto',
          titulo: 'Sin factura ni adjunto',
          descripcion: `${c.proveedor?.nombre ?? '—'} — compra del ${new Date(c.fecha).toLocaleDateString('es-AR')}`,
          proveedor_id: c.proveedor_id,
          proveedor_nombre: c.proveedor?.nombre ?? '—',
          compra_id: c.id,
          compra_fecha: c.fecha,
          compra_importe: Number(c.importe_total),
          link_tab: 'compras',
          link_id: c.id,
        });
      }
    }
  }

  return alertas;
}

export async function getEstadisticasCompras() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { compras_por_mes: [], compras_por_proveedor: [], evolucion_gasto: [] };

  const { data: compras } = await supabase
    .from('proveedor_compras')
    .select('fecha, importe_total, proveedor:proveedores!inner(nombre)');

  if (!compras) return { compras_por_mes: [], compras_por_proveedor: [], evolucion_gasto: [] };

  const raw = compras as any[];

  const compras_por_mes = raw.reduce<Record<string, number>>((acc, r) => {
    const mes = r.fecha.slice(0, 7);
    acc[mes] = (acc[mes] ?? 0) + Number(r.importe_total);
    return acc;
  }, {});

  const compras_por_proveedor = raw.reduce<Record<string, number>>((acc, r) => {
    const name = r.proveedor?.nombre ?? '—';
    acc[name] = (acc[name] ?? 0) + Number(r.importe_total);
    return acc;
  }, {});

  const meses = Object.entries(compras_por_mes).sort(([a], [b]) => a.localeCompare(b));
  let acumulado = 0;
  const evolucion_gasto = meses.map(([mes, total]) => {
    acumulado += total;
    return { mes, total, acumulado };
  });

  return {
    compras_por_mes: meses.map(([mes, total]) => ({ mes, total })),
    compras_por_proveedor: Object.entries(compras_por_proveedor).map(([proveedor, total]) => ({ proveedor, total })),
    evolucion_gasto,
  };
}

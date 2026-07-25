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
  ProveedorDashboardProveedor,
  ProveedorDeuda,
  ProveedorAlerta,
  CompraEstado,
} from '@/lib/supabase/types';

const PROVEEDORES_COLS = 'id, nombre, telefono, whatsapp, email, direccion, observaciones, estado, created_at, updated_at';
const COMPRAS_COLS = 'id, proveedor_id, fecha, numero_factura, importe_total, estado, observaciones, created_at, updated_at';
const COMPRAS_COLS_WITH_PROVEEDOR = `${COMPRAS_COLS}, proveedor:proveedores!inner(nombre)`;
const ITEMS_COLS = 'id, compra_id, descripcion, cantidad, costo_unitario, subtotal, created_at';
const PAGOS_COLS = 'id, proveedor_id, compra_id, fecha, monto, forma_pago, observaciones, created_at, updated_at';
const ADJUNTOS_COLS = 'id, compra_id, pago_id, tipo, nombre_original, path, url, created_at';

function calcularEstado(importe_total: number, pagado: number): CompraEstado {
  if (pagado <= 0) return 'pendiente';
  if (pagado >= importe_total) return 'pagada';
  return 'parcial';
}

function sumarPagos(pagoTotal: { monto: number }[] | null | undefined): number {
  return (pagoTotal ?? []).reduce((s: number, p: any) => s + Number(p.monto), 0);
}

function validarFecha(fecha: string): Date {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) throw new Error(`Fecha inválida: ${fecha}`);
  return d;
}

function validarMonto(monto: unknown): number {
  const n = Number(monto);
  if (isNaN(n) || n <= 0) throw new Error('El monto debe ser un número positivo');
  return n;
}

async function recalcularEstadoCompra(supabase: ReturnType<typeof getSupabaseAdminClient>, compraId: string): Promise<void> {
  if (!supabase) return;

  const { data: compra } = await supabase.from('proveedor_compras').select('importe_total').eq('id', compraId).single();
  if (!compra) return;

  const { data: pagosData } = await supabase.from('proveedor_pagos').select('monto').eq('compra_id', compraId);
  const pagado = (pagosData ?? []).reduce((s: number, p: any) => s + Number(p.monto), 0);
  const estado = calcularEstado(Number(compra.importe_total), pagado);

  await supabase.from('proveedor_compras').update({ estado }).eq('id', compraId);
}

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
  dateTo?: string,
  soloPendientes?: boolean
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

  const { data: pagosExistentes } = await supabase.from('proveedor_pagos').select('id', { count: 'exact', head: true }).eq('compra_id', id);
  const totalPagos = (pagosExistentes ?? []).length;

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

export async function getProveedorDashboard(): Promise<ProveedorDashboard> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return {
    compras_mes: 0, deuda_total: 0, facturas_pendientes: 0,
    total_comprado: 0, total_pagado: 0, ultimas_compras: [], proveedores: [],
  };

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const [comprasMes, comprasTotal, pagosTotal, ultimasResult, proveedoresRaw, pagosAll, comprasAll] = await Promise.all([
    supabase.from('proveedor_compras').select('importe_total', { count: 'exact' }).gte('fecha', firstDay),
    supabase.from('proveedor_compras').select('importe_total'),
    supabase.from('proveedor_pagos').select('monto'),
    supabase.from('proveedor_compras')
      .select(`id, fecha, importe_total, pago_total:proveedor_pagos(monto), proveedor:proveedores!inner(nombre)`)
      .order('fecha', { ascending: false })
      .limit(5),
    supabase.from('proveedores').select('id, nombre').eq('estado', 'activo').order('nombre'),
    supabase.from('proveedor_pagos').select('proveedor_id, monto'),
    supabase.from('proveedor_compras').select('proveedor_id, importe_total, pago_total:proveedor_pagos(monto)'),
  ]);

  const compras_mes = ((comprasMes.data ?? []) as any[]).reduce((s: number, r: any) => s + Number(r.importe_total), 0);
  const total_comprado = ((comprasTotal.data ?? []) as any[]).reduce((s: number, r: any) => s + Number(r.importe_total), 0);
  const total_pagado = ((pagosTotal.data ?? []) as any[]).reduce((s: number, r: any) => s + Number(r.monto), 0);

  const pagosPorProv = ((pagosAll.data ?? []) as any[]).reduce<Record<string, number>>((acc, p: any) => {
    acc[p.proveedor_id] = (acc[p.proveedor_id] ?? 0) + Number(p.monto);
    return acc;
  }, {});

  const comprasPorProv = ((comprasAll.data ?? []) as any[]).reduce<Record<string, { total: number; pendientes: number; parciales: number; pagadas: number }>>((acc, c: any) => {
    if (!acc[c.proveedor_id]) acc[c.proveedor_id] = { total: 0, pendientes: 0, parciales: 0, pagadas: 0 };
    const importeTotal = Number(c.importe_total);
    const pagado = sumarPagos(c.pago_total);
    acc[c.proveedor_id].total += importeTotal;
    const st = calcularEstado(importeTotal, pagado);
    if (st === 'pendiente') acc[c.proveedor_id].pendientes++;
    else if (st === 'parcial') acc[c.proveedor_id].parciales++;
    else if (st === 'pagada') acc[c.proveedor_id].pagadas++;
    return acc;
  }, {});

  const proveedores = ((proveedoresRaw.data ?? []) as any[]).map((p: any): ProveedorDashboardProveedor => {
    const comprado = comprasPorProv[p.id]?.total ?? 0;
    const pagado = pagosPorProv[p.id] ?? 0;
    return {
      proveedor_id: p.id,
      proveedor_nombre: p.nombre,
      total_comprado: comprado,
      total_pagado: pagado,
      total_pendiente: comprado - pagado,
      facturas_pendientes: comprasPorProv[p.id]?.pendientes ?? 0,
      facturas_parciales: comprasPorProv[p.id]?.parciales ?? 0,
      facturas_pagadas: comprasPorProv[p.id]?.pagadas ?? 0,
    };
  }).filter((p) => p.total_comprado > 0 || p.total_pendiente > 0);

  const facturas_pendientes = proveedores.reduce((s, p) => s + p.facturas_pendientes + p.facturas_parciales, 0);

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
      estado: calcularEstado(Number(r.importe_total), sumarPagos(r.pago_total)),
    })),
    proveedores,
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

  const [{ data: comprasAll }, { data: pagosAll }] = await Promise.all([
    supabase.from('proveedor_compras').select('proveedor_id, importe_total'),
    supabase.from('proveedor_pagos').select('proveedor_id, monto'),
  ]);

  const compradoPorProv = ((comprasAll ?? []) as any[]).reduce<Record<string, number>>((acc, r: any) => {
    acc[r.proveedor_id] = (acc[r.proveedor_id] ?? 0) + Number(r.importe_total);
    return acc;
  }, {});

  const pagadoPorProv = ((pagosAll ?? []) as any[]).reduce<Record<string, number>>((acc, r: any) => {
    acc[r.proveedor_id] = (acc[r.proveedor_id] ?? 0) + Number(r.monto);
    return acc;
  }, {});

  const deudas: ProveedorDeuda[] = (proveedores as any[]).map((p) => {
    const total_comprado = compradoPorProv[p.id] ?? 0;
    const total_pagado = pagadoPorProv[p.id] ?? 0;
    return {
      proveedor_id: p.id,
      proveedor_nombre: p.nombre,
      total_comprado,
      total_pagado,
      saldo_pendiente: total_comprado - total_pagado,
    };
  });

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

  const { data: comprasConPagos } = await supabase
    .from('proveedor_compras')
    .select(`id, fecha, importe_total, proveedor_id, pago_total:proveedor_pagos(monto), proveedor:proveedores!inner(nombre)`)
    .order('fecha', { ascending: false });

  for (const c of (comprasConPagos ?? []) as any[]) {
    const importeTotal = Number(c.importe_total);
    const pagado = sumarPagos(c.pago_total);
    const st = calcularEstado(importeTotal, pagado);
    if (st === 'pendiente' || st === 'parcial') {
      alertas.push({
        id: `alerta-${++idCounter}`,
        tipo: st === 'pendiente' ? 'factura_pendiente' : 'saldo_pendiente',
        titulo: st === 'pendiente' ? 'Factura pendiente' : 'Pago parcial',
        descripcion: `${(c as any).proveedor?.nombre ?? '—'} — $${importeTotal.toLocaleString('es-AR')}`,
        proveedor_id: c.proveedor_id,
        proveedor_nombre: (c as any).proveedor?.nombre ?? '—',
        compra_id: c.id,
        compra_fecha: c.fecha,
        compra_importe: importeTotal,
        link_tab: 'compras',
        link_id: c.id,
      });
    }
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

import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { ProveedorDashboard, ProveedorDeuda, ProveedorDashboardProveedor } from '@/lib/supabase/types';
import { sumarPagos, calcularEstado } from './helpers';

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

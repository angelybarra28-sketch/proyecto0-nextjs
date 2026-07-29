import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { ProveedorAlerta } from '@/lib/supabase/types';
import { sumarPagos, calcularEstado } from './helpers';

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

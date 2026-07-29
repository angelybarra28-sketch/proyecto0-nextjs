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
import { appendDefinedParam } from './helpers';

// --- Proveedores CRUD ---

export async function fetchProveedores(params?: { estado?: string; search?: string }, signal?: AbortSignal): Promise<ProveedorRow[]> {
  const searchParams = new URLSearchParams();
  if (params?.estado) appendDefinedParam(searchParams, 'estado', params.estado);
  if (params?.search) appendDefinedParam(searchParams, 'search', params.search);
  const query = searchParams.toString();
  const response = await fetch(`/api/admin/proveedores${query ? `?${query}` : ''}`, { signal });
  if (!response.ok) throw new Error('No se pudieron cargar los proveedores');
  const payload = await response.json() as { proveedores: ProveedorRow[] };
  return payload.proveedores;
}

export async function createProveedor(input: ProveedorInsert): Promise<ProveedorRow> {
  const response = await fetch('/api/admin/proveedores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('No se pudo crear el proveedor');
  const payload = await response.json() as { proveedor: ProveedorRow };
  return payload.proveedor;
}

export async function updateProveedor(id: string, input: Partial<ProveedorInsert>): Promise<ProveedorRow> {
  const response = await fetch(`/api/admin/proveedores/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('No se pudo actualizar el proveedor');
  const payload = await response.json() as { proveedor: ProveedorRow };
  return payload.proveedor;
}

// --- Compras ---

export async function fetchCompras(params?: { proveedor_id?: string; estado?: string; date_from?: string; date_to?: string; solo_pendientes?: boolean; solo_pagadas?: boolean }, signal?: AbortSignal): Promise<ProveedorCompraRow[]> {
  const searchParams = new URLSearchParams();
  if (params?.proveedor_id) appendDefinedParam(searchParams, 'proveedor_id', params.proveedor_id);
  if (params?.estado) appendDefinedParam(searchParams, 'estado', params.estado);
  if (params?.date_from) appendDefinedParam(searchParams, 'date_from', params.date_from);
  if (params?.date_to) appendDefinedParam(searchParams, 'date_to', params.date_to);
  if (params?.solo_pendientes) searchParams.set('solo_pendientes', 'true');
  if (params?.solo_pagadas) searchParams.set('solo_pagadas', 'true');
  const query = searchParams.toString();
  const response = await fetch(`/api/admin/proveedores/compras${query ? `?${query}` : ''}`, { signal });
  if (!response.ok) throw new Error('No se pudieron cargar las compras');
  const payload = await response.json() as { compras: ProveedorCompraRow[] };
  return payload.compras;
}

export async function fetchCompraDetail(id: string, signal?: AbortSignal): Promise<{ compra: ProveedorCompraRow; items: ProveedorCompraItemRow[]; pagos: ProveedorPagoRow[]; adjuntos: ProveedorAdjuntoRow[] }> {
  const response = await fetch(`/api/admin/proveedores/compras/${id}`, { signal });
  if (!response.ok) throw new Error('No se pudo cargar la compra');
  const payload = await response.json() as { compra: ProveedorCompraRow; items: ProveedorCompraItemRow[]; pagos: ProveedorPagoRow[]; adjuntos: ProveedorAdjuntoRow[] };
  return payload;
}

export async function createCompra(input: ProveedorCompraInsert): Promise<ProveedorCompraRow> {
  const response = await fetch('/api/admin/proveedores/compras', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('No se pudo crear la compra');
  const payload = await response.json() as { compra: ProveedorCompraRow };
  return payload.compra;
}

export async function updateCompra(id: string, input: Partial<ProveedorCompraInsert>): Promise<ProveedorCompraRow> {
  const response = await fetch(`/api/admin/proveedores/compras/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('No se pudo actualizar la compra');
  const payload = await response.json() as { compra: ProveedorCompraRow };
  return payload.compra;
}

export async function createCompraItems(items: ProveedorCompraItemInsert[]): Promise<ProveedorCompraItemRow[]> {
  const response = await fetch('/api/admin/proveedores/compras/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error('No se pudieron guardar los items');
  const payload = await response.json() as { items: ProveedorCompraItemRow[] };
  return payload.items;
}

export async function deleteCompraItem(id: string): Promise<void> {
  const response = await fetch(`/api/admin/proveedores/compras/items/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('No se pudo eliminar el item');
}

// --- Pagos ---

export async function fetchPagos(params?: { proveedor_id?: string }, signal?: AbortSignal): Promise<ProveedorPagoRow[]> {
  const searchParams = new URLSearchParams();
  if (params?.proveedor_id) appendDefinedParam(searchParams, 'proveedor_id', params.proveedor_id);
  const query = searchParams.toString();
  const response = await fetch(`/api/admin/proveedores/pagos${query ? `?${query}` : ''}`, { signal });
  if (!response.ok) throw new Error('No se pudieron cargar los pagos');
  const payload = await response.json() as { pagos: ProveedorPagoRow[] };
  return payload.pagos;
}

export async function createPago(input: ProveedorPagoInsert): Promise<ProveedorPagoRow> {
  const response = await fetch('/api/admin/proveedores/pagos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const msg = body?.error?.message || 'No se pudo registrar el pago';
    throw new Error(msg);
  }
  const payload = await response.json() as { pago: ProveedorPagoRow };
  return payload.pago;
}

// --- Deletes ---

export async function deleteCompra(id: string): Promise<void> {
  const response = await fetch(`/api/admin/proveedores/compras/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('No se pudo eliminar la compra');
}

export async function deletePago(id: string): Promise<void> {
  const response = await fetch(`/api/admin/proveedores/pagos/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('No se pudo eliminar el pago');
}

// --- Adjuntos ---

export async function uploadProveedorAdjunto(compraId: string, file: File, tipo: string, pagoId?: string): Promise<ProveedorAdjuntoRow> {
  const formData = new FormData();
  formData.append('file', file);
  if (compraId) formData.append('compra_id', compraId);
  if (pagoId) formData.append('pago_id', pagoId);
  formData.append('tipo', tipo);
  const response = await fetch('/api/admin/proveedores/adjuntos', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('No se pudo subir el archivo');
  const payload = await response.json() as { adjunto: ProveedorAdjuntoRow };
  return payload.adjunto;
}

export async function deleteProveedorAdjunto(id: string): Promise<void> {
  const response = await fetch(`/api/admin/proveedores/adjuntos/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('No se pudo eliminar el archivo');
}

// --- Dashboard ---

export async function fetchProveedorDashboard(signal?: AbortSignal): Promise<ProveedorDashboard> {
  const response = await fetch('/api/admin/proveedores/dashboard', { signal });
  if (!response.ok) throw new Error('No se pudo cargar el dashboard');
  const payload = await response.json() as { dashboard: ProveedorDashboard };
  return payload.dashboard;
}

export async function fetchDeudas(signal?: AbortSignal): Promise<ProveedorDeuda[]> {
  const response = await fetch('/api/admin/proveedores/deudas', { signal });
  if (!response.ok) throw new Error('No se pudieron cargar las deudas');
  const payload = await response.json() as { deudas: ProveedorDeuda[] };
  return payload.deudas;
}

export async function fetchProveedorAlertas(signal?: AbortSignal): Promise<ProveedorAlerta[]> {
  const response = await fetch('/api/admin/proveedores/alertas', { signal });
  if (!response.ok) throw new Error('No se pudieron cargar las alertas');
  const payload = await response.json() as { alertas: ProveedorAlerta[] };
  return payload.alertas;
}

export async function fetchEstadisticasCompras(signal?: AbortSignal): Promise<{ compras_por_mes: { mes: string; total: number }[]; compras_por_proveedor: { proveedor: string; total: number }[]; evolucion_gasto: { mes: string; total: number; acumulado: number }[] }> {
  const response = await fetch('/api/admin/proveedores/estadisticas', { signal });
  if (!response.ok) throw new Error('No se pudieron cargar las estadísticas');
  const payload = await response.json();
  return payload;
}

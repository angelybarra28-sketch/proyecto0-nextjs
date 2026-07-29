import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { ProveedorRow, ProveedorInsert } from '@/lib/supabase/types';
import { PROVEEDORES_COLS } from './helpers';

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

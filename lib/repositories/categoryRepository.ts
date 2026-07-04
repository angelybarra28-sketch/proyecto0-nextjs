import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogCategoryRow } from '@/lib/adapters/catalogAdapter';

const categoryColumns = 'id, name, slug, description, parent_id, sort_order, is_active, created_at';

export type CategoryCreateInput = {
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type CategoryUpdateInput = Partial<CategoryCreateInput>;

export async function listActiveCategories(supabase: SupabaseClient): Promise<CatalogCategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select(categoryColumns)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as CatalogCategoryRow[];
}

export async function listAllCategories(supabase: SupabaseClient): Promise<CatalogCategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select(categoryColumns)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as CatalogCategoryRow[];
}

export async function getCategoryById(
  supabase: SupabaseClient,
  id: string
): Promise<CatalogCategoryRow | null> {
  const { data, error } = await supabase
    .from('categories')
    .select(categoryColumns)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as unknown as CatalogCategoryRow | null;
}

export async function getCategoryBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<CatalogCategoryRow | null> {
  const { data, error } = await supabase
    .from('categories')
    .select(categoryColumns)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as unknown as CatalogCategoryRow | null;
}

export async function createCategory(
  supabase: SupabaseClient,
  input: CategoryCreateInput
): Promise<CatalogCategoryRow> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      parent_id: input.parentId ?? null,
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true,
    })
    .select(categoryColumns)
    .single();

  if (error) {
    throw error;
  }

  return data as unknown as CatalogCategoryRow;
}

export async function updateCategory(
  supabase: SupabaseClient,
  id: string,
  input: CategoryUpdateInput
): Promise<CatalogCategoryRow> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) payload.name = input.name;
  if (input.slug !== undefined) payload.slug = input.slug;
  if (input.description !== undefined) payload.description = input.description;
  if (input.parentId !== undefined) payload.parent_id = input.parentId;
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder;
  if (input.isActive !== undefined) payload.is_active = input.isActive;

  const { data, error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', id)
    .select(categoryColumns)
    .single();

  if (error) {
    throw error;
  }

  return data as unknown as CatalogCategoryRow;
}

export async function deleteCategory(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

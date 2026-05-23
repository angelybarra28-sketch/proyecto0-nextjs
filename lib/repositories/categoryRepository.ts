import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogCategoryRow } from '@/lib/adapters/catalogAdapter';

const categoryColumns = 'id, name, slug, description, parent_id, sort_order, is_active';

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

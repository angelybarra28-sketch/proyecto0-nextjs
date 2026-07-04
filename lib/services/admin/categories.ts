import { getSupabaseAdminClient } from '@/lib/supabase/server';
import {
  listAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  type CategoryCreateInput,
  type CategoryUpdateInput,
} from '@/lib/repositories/categoryRepository';
import type { AdminPagination } from '@/lib/services/admin/types';

export type AdminCategoryItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string | null;
};

export type AdminCategoryPayload = {
  categories: AdminCategoryItem[];
  pagination: AdminPagination;
};

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

function validateCategoryPayload(payload: {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  parentId?: unknown;
  sortOrder?: unknown;
  isActive?: unknown;
}, requireBaseFields: boolean): CategoryCreateInput | CategoryUpdateInput {
  const name = payload.name === undefined ? undefined : normalizeText(payload.name);
  const slug = payload.slug === undefined ? undefined : normalizeText(payload.slug);

  if (requireBaseFields) {
    if (!name) throw new Error('El nombre es obligatorio');
    if (!slug) throw new Error('El slug es obligatorio');
  }

  return {
    name,
    slug,
    description: payload.description === undefined ? undefined : normalizeNullableText(payload.description),
    parentId: payload.parentId === undefined ? undefined : (payload.parentId ? String(payload.parentId) : null),
    sortOrder: payload.sortOrder === undefined ? undefined : Number(payload.sortOrder),
    isActive: payload.isActive === undefined ? undefined : Boolean(payload.isActive),
  };
}

function adaptCategory(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
}): AdminCategoryItem {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at ?? null,
  };
}

export async function getAdminCategories(): Promise<AdminCategoryPayload> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return { categories: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } };
  }

  const rows = await listAllCategories(supabase);

  return {
    categories: rows.map(adaptCategory),
    pagination: {
      page: 1,
      limit: 100,
      total: rows.length,
      totalPages: 1,
    },
  };
}

export async function createAdminCategory(payload: {
  name: unknown;
  slug: unknown;
  description?: unknown;
  parentId?: unknown;
  sortOrder?: unknown;
  isActive?: unknown;
}): Promise<AdminCategoryItem> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no está configurado');

  const input = validateCategoryPayload(payload, true) as CategoryCreateInput;
  const row = await createCategory(supabase, input);

  return adaptCategory(row);
}

export async function updateAdminCategory(
  id: string,
  payload: {
    name?: unknown;
    slug?: unknown;
    description?: unknown;
    parentId?: unknown;
    sortOrder?: unknown;
    isActive?: unknown;
  }
): Promise<AdminCategoryItem> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no está configurado');

  const input = validateCategoryPayload(payload, false) as CategoryUpdateInput;
  const row = await updateCategory(supabase, id, input);

  return adaptCategory(row);
}

export async function deleteAdminCategory(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no está configurado');

  const children = await listAllCategories(supabase);
  const hasChildren = children.some((c) => c.parent_id === id);

  if (hasChildren) {
    throw new Error('No se puede eliminar una categoría que tiene subcategorías');
  }

  await deleteCategory(supabase, id);
}

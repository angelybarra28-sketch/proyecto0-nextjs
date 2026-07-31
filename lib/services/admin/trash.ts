import { adaptAdminCatalogProduct, adaptTrashedProduct, type AdminCatalogProduct, type AdminTrashedProduct } from '@/lib/adapters/catalogAdapter';
import {
  countProductReferences,
  countTrashedProducts,
  getProductById,
  getTrashedProductById,
  hardDeleteProduct,
  listTrashedProducts,
  moveProductToTrash,
  restoreProduct,
  type ProductReferenceCounts,
} from '@/lib/repositories/productRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export type TrashedProductsPayload = {
  products: AdminTrashedProduct[];
  total: number;
};

export class ProductReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductReferenceError';
  }
}

export async function listAdminTrashedProducts(): Promise<TrashedProductsPayload> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const [rows, total] = await Promise.all([
    listTrashedProducts(supabase),
    countTrashedProducts(supabase),
  ]);

  const userIds = [...new Set(rows.map((row) => row.deleted_by).filter((id): id is string => Boolean(id)))];
  const namesById = new Map<string, string>();

  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);

    if (!error) {
      for (const profile of data ?? []) {
        namesById.set(profile.user_id, profile.full_name ?? '');
      }
    }
  }

  return {
    products: rows.map((row) => adaptTrashedProduct(row, namesById.get(row.deleted_by ?? '') ?? null)),
    total,
  };
}

export async function moveAdminProductToTrash(
  productId: string,
  deletedBy: string | null,
  deleteReason?: string | null
): Promise<AdminCatalogProduct> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const product = await getProductById(supabase, productId);

  if (!product) {
    throw new Error('Producto no encontrado');
  }

  await moveProductToTrash(supabase, productId, deletedBy, deleteReason ?? null);

  return adaptAdminCatalogProduct(product);
}

export async function restoreAdminProduct(productId: string): Promise<AdminCatalogProduct> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const product = await getTrashedProductById(supabase, productId);

  if (!product) {
    throw new Error('Producto no encontrado en la papelera');
  }

  await restoreProduct(supabase, productId);

  return adaptAdminCatalogProduct({
    ...product,
    deleted_at: null,
    deleted_by: null,
    delete_reason: null,
  });
}

export async function hardDeleteAdminProduct(
  productId: string
): Promise<{ id: string; name: string; slug: string }> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const product = await getTrashedProductById(supabase, productId);

  if (!product) {
    throw new Error('Producto no encontrado en la papelera');
  }

  const references: ProductReferenceCounts = await countProductReferences(supabase, productId, product.name);

  if (references.saleItems > 0 || references.creditItems > 0) {
    throw new ProductReferenceError(
      'Este producto tiene historial de ventas o cuentas de crédito y no puede eliminarse definitivamente. Deberá permanecer en la papelera.'
    );
  }

  await hardDeleteProduct(supabase, productId);

  return {
    id: productId,
    name: product.name,
    slug: product.slug,
  };
}

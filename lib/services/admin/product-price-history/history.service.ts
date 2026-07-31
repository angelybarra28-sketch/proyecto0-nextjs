import { getProductById } from '@/lib/repositories/productRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/services/admin/audit';
import type {
  PriceHistoryResponse,
  ProductPriceHistoryEntry,
  RecordProductPriceChangeInput,
} from './types';

type PriceHistoryRow = {
  id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
};

export async function recordProductPriceChange(input: RecordProductPriceChangeInput): Promise<boolean> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase.from('product_price_history').insert({
      product_id: input.productId,
      old_price: input.oldPrice,
      new_price: input.newPrice,
      changed_by: input.changedBy,
      reason: input.reason ?? null,
    });

    if (error) {
      console.error('Error recording product price history:', error);
      return false;
    }

    await logAdminAction({
      adminUserId: input.changedBy,
      action: 'product_price_changed',
      entity: 'product',
      entityId: input.productId,
      metadata: {
        productId: input.productId,
        oldPrice: input.oldPrice,
        newPrice: input.newPrice,
        reason: input.reason ?? null,
      },
    });

    return true;
  } catch (error) {
    console.error('Error recording product price history:', error);
    return false;
  }
}

export async function listProductPriceHistory(productId: string): Promise<PriceHistoryResponse> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const product = await getProductById(supabase, productId);

  if (!product) {
    throw new Error('Producto no encontrado');
  }

  const { data, error } = await supabase
    .from('product_price_history')
    .select('id, product_id, old_price, new_price, changed_by, reason, created_at')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as PriceHistoryRow[];

  const userIds = [...new Set(rows.map((row) => row.changed_by).filter((id): id is string => Boolean(id)))];
  const namesById = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);

    if (!profilesError) {
      for (const profile of profiles ?? []) {
        namesById.set(profile.user_id, profile.full_name ?? '');
      }
    }
  }

  const history: ProductPriceHistoryEntry[] = rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    oldPrice: Number(row.old_price),
    newPrice: Number(row.new_price),
    changedBy: row.changed_by,
    changedByName: row.changed_by ? (namesById.get(row.changed_by) ?? null) : null,
    reason: row.reason,
    createdAt: row.created_at,
  }));

  const oldest = rows[rows.length - 1];

  return {
    history,
    summary: {
      currentPrice: Number(product.price),
      firstPrice: oldest ? Number(oldest.old_price) : null,
      changeCount: rows.length,
      lastChangeAt: rows.length > 0 ? rows[0].created_at : null,
    },
  };
}

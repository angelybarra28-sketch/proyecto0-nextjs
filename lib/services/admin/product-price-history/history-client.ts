import type { PriceHistoryResponse } from './types';

export async function fetchProductPriceHistory(
  productId: string,
  signal?: AbortSignal
): Promise<PriceHistoryResponse> {
  const response = await fetch(`/api/admin/products/${productId}/price-history`, { signal });

  if (!response.ok) {
    throw new Error('No se pudo cargar el historial de precios');
  }

  return await response.json() as PriceHistoryResponse;
}

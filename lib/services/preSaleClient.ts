import type { CartItem } from '@/lib/cartContext';

interface PreSaleResult {
  persisted: boolean;
  saleId?: string;
  saleNumber?: string;
  error?: string;
}

export async function persistPreSale(
  fullName: string,
  phone: string,
  address: string,
  location: string,
  items: CartItem[]
): Promise<PreSaleResult> {
  try {
    const response = await fetch('/api/pre-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        phone,
        address,
        location,
        items: items.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
          installmentCount: item.installmentCount,
        })),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      console.error('[pre-sale] API error:', response.status, body);
      return { persisted: false, error: body.error };
    }

    return await response.json() as PreSaleResult;
  } catch (error) {
    console.error('[pre-sale] Network error:', error);
    return { persisted: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

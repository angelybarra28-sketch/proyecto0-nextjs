import type { CheckoutSaleInput, CheckoutSaleResult } from '@/lib/supabase/types';

export async function persistCheckoutSaleFromClient(
  input: CheckoutSaleInput
): Promise<CheckoutSaleResult> {
  try {
    const response = await fetch('/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return { persisted: false };
    }

    return await response.json() as CheckoutSaleResult;
  } catch (error) {
    console.error('Error persisting checkout sale:', error);
    return { persisted: false };
  }
}

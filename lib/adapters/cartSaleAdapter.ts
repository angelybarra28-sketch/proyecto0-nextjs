import type { CartItem } from '@/lib/cartContext';
import type { CheckoutSaleInput } from '@/lib/supabase/types';

interface CheckoutFormData {
  fullName: string;
  address: string;
  location: string;
  phone: string;
  paymentMethod: string;
}

export function createCheckoutSaleInput(
  formData: CheckoutFormData,
  items: CartItem[]
): CheckoutSaleInput {
  return {
    customer: {
      fullName: formData.fullName,
      phone: formData.phone || undefined,
      address: formData.address,
      city: formData.location,
    },
    paymentMethodRequested: formData.paymentMethod,
    items: items.map((item) => ({
      legacyProductId: item.id,
      name: item.name,
      price: item.price,
      originalPrice: item.originalPrice,
      quantity: item.quantity,
      imageUrl: item.imageUrl,
    })),
  };
}

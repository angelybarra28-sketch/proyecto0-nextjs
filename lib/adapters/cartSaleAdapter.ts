import type { CartItem } from '@/lib/cartContext';
import type { CheckoutSaleInput } from '@/lib/supabase/types';

interface CheckoutFormData {
  fullName: string;
  address: string;
  location: string;
  phone: string;
  email?: string;
  paymentMethod: string;
}

export function createCheckoutSaleInput(
  formData: CheckoutFormData,
  items: CartItem[],
  checkoutRequestId: string
): CheckoutSaleInput {
  return {
    checkoutRequestId,
    customer: {
      fullName: formData.fullName,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      address: formData.address,
      city: formData.location,
    },
    paymentMethodRequested: formData.paymentMethod,
    paymentPlanType: 'FULL_PAYMENT',
    installmentsCount: 1,
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

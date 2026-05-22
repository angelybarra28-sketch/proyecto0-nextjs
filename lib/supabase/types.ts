export type SaleStatus = 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';

export interface CustomerInsert {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
}

export interface CustomerRow extends CustomerInsert {
  id: string;
}

export interface SaleInsert {
  customer_id: string;
  sale_status: SaleStatus;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  item_count: number;
  payment_method_requested?: string | null;
  delivery_full_name?: string | null;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  delivery_city?: string | null;
  notes?: string | null;
}

export interface SaleRow extends SaleInsert {
  id: string;
  sale_number: string;
}

export interface SaleItemInsert {
  sale_id: string;
  product_id?: string | null;
  legacy_product_id?: number | null;
  product_name_snapshot: string;
  product_slug_snapshot?: string | null;
  category_name_snapshot?: string | null;
  unit_price_snapshot: number;
  quantity: number;
  line_subtotal: number;
  line_discount_amount: number;
  line_total: number;
  image_url_snapshot?: string | null;
}

export interface CheckoutSaleItemInput {
  legacyProductId: number;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  imageUrl?: string;
}

export interface CheckoutSaleInput {
  customer: {
    fullName: string;
    phone?: string;
    email?: string;
    address: string;
    city: string;
  };
  paymentMethodRequested?: string;
  items: CheckoutSaleItemInput[];
}

export interface CheckoutSaleResult {
  persisted: boolean;
  saleId?: string;
  saleNumber?: string;
}

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
  checkout_request_id: string;
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

export interface CheckoutSaleRpcItem {
  legacyProductId: number;
  name: string;
  slug: string | null;
  category: string | null;
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
  lineDiscountAmount: number;
  lineTotal: number;
  imageUrl: string | null;
}

export interface CheckoutSaleRpcInput {
  checkoutRequestId: string;
  customer: CheckoutSaleInput['customer'];
  paymentMethodRequested?: string;
  items: CheckoutSaleRpcItem[];
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
  checkoutRequestId: string;
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

export interface CheckoutSaleRpcRow {
  persisted: boolean;
  sale_id: string;
  sale_number: string;
  sale_status: SaleStatus;
}

export type CollectionStatus = 'PENDING' | 'PAID';

export interface SaleCustomerView {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
}

export interface SaleItemView {
  id: string;
  legacyProductId: number | null;
  name: string;
  slug: string | null;
  category: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  imageUrl: string | null;
}

export interface AdminSaleSummary {
  id: string;
  saleNumber: string;
  customerName: string;
  customerPhone: string | null;
  saleDate: string;
  total: number;
  itemCount: number;
  saleStatus: SaleStatus;
  collectionStatus: CollectionStatus;
}

export interface AdminSaleDetail extends AdminSaleSummary {
  subtotal: number;
  discountAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethodRequested: string | null;
  deliveryFullName: string | null;
  deliveryPhone: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: SaleCustomerView | null;
  items: SaleItemView[];
}

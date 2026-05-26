export type SaleStatus = 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';
export type PaymentPlanType = 'FULL_PAYMENT' | 'INSTALLMENTS';
export type InstallmentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'MERCADO_PAGO' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'VOIDED';
export type AllocationStatus = 'ACTIVE' | 'VOIDED';

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
  payment_plan_type: PaymentPlanType;
  installments_count: number;
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
  paymentPlanType: PaymentPlanType;
  installmentsCount: number;
  firstDueDate?: string;
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
  paymentPlanType?: PaymentPlanType;
  installmentsCount?: number;
  firstDueDate?: string;
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

export type CollectionStatus = 'PENDING' | 'UP_TO_DATE' | 'OVERDUE' | 'PAID';

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

export interface InstallmentView {
  id: string;
  saleId: string;
  installmentNumber: number;
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InstallmentStatus;
  overdueDays: number;
}

export interface AdminSaleSummary {
  id: string;
  saleNumber: string;
  customerName: string;
  customerPhone: string | null;
  saleDate: string;
  total: number;
  itemCount: number;
  paymentPlanType: PaymentPlanType;
  installmentsCount: number;
  saleStatus: SaleStatus;
  collectionStatus: CollectionStatus;
}

export interface PaymentAllocationView {
  id: string;
  paymentId: string;
  installmentId: string;
  amount: number;
  status: AllocationStatus;
}

export interface PaymentView {
  id: string;
  saleId: string;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paymentDate: string;
  notes: string | null;
  allocations: PaymentAllocationView[];
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
  installments: InstallmentView[];
  payments: PaymentView[];
}

export interface RegisterPaymentInput {
  saleId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  notes?: string;
}

export interface RegisterPaymentResult {
  paymentId: string;
  totalAllocated: number;
  salePaidAmount: number;
  saleRemainingAmount: number;
  collectionStatus: CollectionStatus;
}

export interface CollectionSummary {
  totalDebt: number;
  overdueDebt: number;
  overdueInstallments: number;
  overdueSales: number;
  customersWithDebt: number;
  collectedPercentage?: number;
  monthlyCollected?: number;
}

export interface AgingBucketMetric {
  bucket: '0-30' | '31-60' | '61-90' | '90+';
  amount: number;
  installmentsCount: number;
}

export interface DailySalesMetric {
  date: string;
  salesCount: number;
  revenue: number;
}

export interface MonthlyMetric {
  month: string;
  salesCount: number;
  revenue: number;
  collected: number;
}

export interface RankingMetric {
  label: string;
  quantity: number;
  amount: number;
}

export interface CustomerRankingMetric {
  customerId: string;
  customerName: string;
  salesCount: number;
  amount: number;
  lastPurchaseDate?: string | null;
}

export interface ProductHealthMetric {
  outOfStock: number;
  inactive: number;
}

export interface CustomerAnalyticsMetric {
  newThisMonth: number;
  withDebt: number;
  averagePurchaseFrequency: number;
}

export interface AdminDashboardStats {
  todaySalesCount?: number;
  todaySoldAmount?: number;
  currentMonthSalesCount: number;
  currentMonthSoldAmount: number;
  currentMonthCollectedAmount: number;
  monthlyGrowthPercentage?: number;
  averageTicket: number;
  collection: CollectionSummary;
  monthly: MonthlyMetric[];
  dailySales?: DailySalesMetric[];
  agingBuckets?: AgingBucketMetric[];
  topProducts: RankingMetric[];
  topCategories: RankingMetric[];
  topCustomers: CustomerRankingMetric[];
  customerAnalytics?: CustomerAnalyticsMetric;
  productHealth?: ProductHealthMetric;
}

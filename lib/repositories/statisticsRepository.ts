import type { SupabaseClient } from '@supabase/supabase-js';
import { getCollectionSummary } from '@/lib/repositories/saleRepository';
import type { AdminDashboardStats, CustomerRankingMetric, MonthlyMetric, RankingMetric } from '@/lib/supabase/types';

interface SaleStatsRow {
  id: string;
  customer_id: string;
  sale_date: string;
  total_amount: number | string;
  customers: { full_name: string } | { full_name: string }[] | null;
}

interface PaymentStatsRow {
  payment_date: string;
  amount: number | string;
  status: string;
}

interface SaleItemStatsRow {
  product_name_snapshot: string;
  category_name_snapshot: string | null;
  quantity: number;
  line_total: number | string;
}

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

function getMonthKey(date: string): string {
  return date.slice(0, 7);
}

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function getCustomerName(customer: SaleStatsRow['customers']): string {
  if (Array.isArray(customer)) {
    return customer[0]?.full_name ?? 'Cliente sin nombre';
  }

  return customer?.full_name ?? 'Cliente sin nombre';
}

function aggregateRanking(rows: SaleItemStatsRow[], key: 'product' | 'category', limit: number): RankingMetric[] {
  const grouped = new Map<string, RankingMetric>();

  rows.forEach((row) => {
    const label = key === 'product'
      ? row.product_name_snapshot
      : row.category_name_snapshot ?? 'Sin categoría';
    const current = grouped.get(label) ?? { label, quantity: 0, amount: 0 };
    current.quantity += row.quantity;
    current.amount += toNumber(row.line_total);
    grouped.set(label, current);
  });

  return Array.from(grouped.values())
    .sort((a, b) => b.quantity - a.quantity || b.amount - a.amount)
    .slice(0, limit);
}

function aggregateCustomers(rows: SaleStatsRow[], limit: number): CustomerRankingMetric[] {
  const grouped = new Map<string, CustomerRankingMetric>();

  rows.forEach((row) => {
    const current = grouped.get(row.customer_id) ?? {
      customerId: row.customer_id,
      customerName: getCustomerName(row.customers),
      salesCount: 0,
      amount: 0,
    };
    current.salesCount += 1;
    current.amount += toNumber(row.total_amount);
    grouped.set(row.customer_id, current);
  });

  return Array.from(grouped.values())
    .sort((a, b) => b.amount - a.amount || b.salesCount - a.salesCount)
    .slice(0, limit);
}

function aggregateMonthly(sales: SaleStatsRow[], payments: PaymentStatsRow[]): MonthlyMetric[] {
  const grouped = new Map<string, MonthlyMetric>();

  sales.forEach((sale) => {
    const month = getMonthKey(sale.sale_date);
    const current = grouped.get(month) ?? { month, salesCount: 0, revenue: 0, collected: 0 };
    current.salesCount += 1;
    current.revenue += toNumber(sale.total_amount);
    grouped.set(month, current);
  });

  payments.forEach((payment) => {
    const month = getMonthKey(payment.payment_date);
    const current = grouped.get(month) ?? { month, salesCount: 0, revenue: 0, collected: 0 };
    current.collected += toNumber(payment.amount);
    grouped.set(month, current);
  });

  return Array.from(grouped.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);
}

export async function getMonthlySales(supabase: SupabaseClient): Promise<SaleStatsRow[]> {
  const range = currentMonthRange();
  const { data, error } = await supabase
    .from('sales')
    .select('id, customer_id, sale_date, total_amount, customers (full_name)')
    .gte('sale_date', range.start)
    .lt('sale_date', range.end)
    .neq('sale_status', 'CANCELLED');

  if (error) throw error;
  return (data as unknown as SaleStatsRow[] | null) ?? [];
}

export async function getMonthlyRevenue(supabase: SupabaseClient): Promise<number> {
  const sales = await getMonthlySales(supabase);
  return sales.reduce((total, sale) => total + toNumber(sale.total_amount), 0);
}

export async function getTopSellingProducts(supabase: SupabaseClient, limit = 5): Promise<RankingMetric[]> {
  const { data, error } = await supabase
    .from('sale_items')
    .select('product_name_snapshot, category_name_snapshot, quantity, line_total')
    .limit(1000);

  if (error) throw error;
  return aggregateRanking((data as unknown as SaleItemStatsRow[] | null) ?? [], 'product', limit);
}

export async function getTopSellingCategories(supabase: SupabaseClient, limit = 5): Promise<RankingMetric[]> {
  const { data, error } = await supabase
    .from('sale_items')
    .select('product_name_snapshot, category_name_snapshot, quantity, line_total')
    .limit(1000);

  if (error) throw error;
  return aggregateRanking((data as unknown as SaleItemStatsRow[] | null) ?? [], 'category', limit);
}

export async function getCustomerMetrics(supabase: SupabaseClient, limit = 5): Promise<CustomerRankingMetric[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('id, customer_id, sale_date, total_amount, customers (full_name)')
    .neq('sale_status', 'CANCELLED')
    .limit(1000);

  if (error) throw error;
  return aggregateCustomers((data as unknown as SaleStatsRow[] | null) ?? [], limit);
}

export async function getCollectionMetrics(supabase: SupabaseClient) {
  return getCollectionSummary(supabase);
}

export async function getAdminDashboardStats(supabase: SupabaseClient): Promise<AdminDashboardStats> {
  const range = currentMonthRange();
  const [monthSales, collection, saleItemsResult, paymentsResult, allSalesResult] = await Promise.all([
    getMonthlySales(supabase),
    getCollectionMetrics(supabase),
    supabase
      .from('sale_items')
      .select('product_name_snapshot, category_name_snapshot, quantity, line_total')
      .limit(1000),
    supabase
      .from('payments')
      .select('payment_date, amount, status')
      .eq('status', 'CONFIRMED')
      .gte('payment_date', range.start)
      .lt('payment_date', range.end),
    supabase
      .from('sales')
      .select('id, customer_id, sale_date, total_amount, customers (full_name)')
      .neq('sale_status', 'CANCELLED')
      .limit(1000),
  ]);

  if (saleItemsResult.error) throw saleItemsResult.error;
  if (paymentsResult.error) throw paymentsResult.error;
  if (allSalesResult.error) throw allSalesResult.error;

  const saleItems = (saleItemsResult.data as unknown as SaleItemStatsRow[] | null) ?? [];
  const monthPayments = (paymentsResult.data as unknown as PaymentStatsRow[] | null) ?? [];
  const allSales = (allSalesResult.data as unknown as SaleStatsRow[] | null) ?? [];
  const currentMonthSoldAmount = monthSales.reduce((total, sale) => total + toNumber(sale.total_amount), 0);
  const currentMonthCollectedAmount = monthPayments.reduce((total, payment) => total + toNumber(payment.amount), 0);
  const averageTicket = monthSales.length > 0 ? currentMonthSoldAmount / monthSales.length : 0;

  return {
    currentMonthSalesCount: monthSales.length,
    currentMonthSoldAmount,
    currentMonthCollectedAmount,
    averageTicket,
    collection,
    monthly: aggregateMonthly(allSales, monthPayments),
    topProducts: aggregateRanking(saleItems, 'product', 5),
    topCategories: aggregateRanking(saleItems, 'category', 5),
    topCustomers: aggregateCustomers(allSales, 5),
  };
}

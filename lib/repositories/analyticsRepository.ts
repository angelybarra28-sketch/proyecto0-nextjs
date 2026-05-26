import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminDashboardStats,
  AgingBucketMetric,
  CustomerAnalyticsMetric,
  CustomerRankingMetric,
  DailySalesMetric,
  MonthlyMetric,
  ProductHealthMetric,
  RankingMetric,
} from '@/lib/supabase/types';

interface DashboardAnalyticsRpcRow {
  today_sales_count?: number | string;
  today_sold_amount?: number | string;
  current_month_sales_count?: number | string;
  current_month_sold_amount?: number | string;
  current_month_collected_amount?: number | string;
  previous_month_sold_amount?: number | string;
  average_ticket?: number | string;
  total_debt?: number | string;
  overdue_debt?: number | string;
  overdue_installments?: number | string;
  overdue_sales?: number | string;
  customers_with_debt?: number | string;
  collected_percentage?: number | string;
  monthly_collected?: number | string;
  monthly?: unknown;
  daily_sales?: unknown;
  aging_buckets?: unknown;
  top_products?: unknown;
  top_categories?: unknown;
  top_customers?: unknown;
  customer_analytics?: unknown;
  product_health?: unknown;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function toArray<TItem>(value: unknown, mapper: (item: Record<string, unknown>) => TItem): TItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map(mapper);
}

function mapRanking(value: unknown): RankingMetric[] {
  return toArray(value, (item) => ({
    label: typeof item.label === 'string' ? item.label : 'Sin datos',
    quantity: toNumber(item.quantity),
    amount: toNumber(item.amount),
  }));
}

function mapDashboardAnalytics(row: DashboardAnalyticsRpcRow): AdminDashboardStats {
  const currentMonthSoldAmount = toNumber(row.current_month_sold_amount);
  const previousMonthSoldAmount = toNumber(row.previous_month_sold_amount);
  const monthlyGrowthPercentage = previousMonthSoldAmount > 0
    ? ((currentMonthSoldAmount - previousMonthSoldAmount) / previousMonthSoldAmount) * 100
    : 0;

  return {
    todaySalesCount: toNumber(row.today_sales_count),
    todaySoldAmount: toNumber(row.today_sold_amount),
    currentMonthSalesCount: toNumber(row.current_month_sales_count),
    currentMonthSoldAmount,
    currentMonthCollectedAmount: toNumber(row.current_month_collected_amount),
    monthlyGrowthPercentage,
    averageTicket: toNumber(row.average_ticket),
    collection: {
      totalDebt: toNumber(row.total_debt),
      overdueDebt: toNumber(row.overdue_debt),
      overdueInstallments: toNumber(row.overdue_installments),
      overdueSales: toNumber(row.overdue_sales),
      customersWithDebt: toNumber(row.customers_with_debt),
      collectedPercentage: toNumber(row.collected_percentage),
      monthlyCollected: toNumber(row.monthly_collected),
    },
    monthly: toArray<MonthlyMetric>(row.monthly, (item) => ({
      month: typeof item.month === 'string' ? item.month : '',
      salesCount: toNumber(item.salesCount),
      revenue: toNumber(item.revenue),
      collected: toNumber(item.collected),
    })),
    dailySales: toArray<DailySalesMetric>(row.daily_sales, (item) => ({
      date: typeof item.date === 'string' ? item.date : '',
      salesCount: toNumber(item.salesCount),
      revenue: toNumber(item.revenue),
    })),
    agingBuckets: toArray<AgingBucketMetric>(row.aging_buckets, (item) => ({
      bucket: item.bucket === '31-60' || item.bucket === '61-90' || item.bucket === '90+' ? item.bucket : '0-30',
      amount: toNumber(item.amount),
      installmentsCount: toNumber(item.installmentsCount),
    })),
    topProducts: mapRanking(row.top_products),
    topCategories: mapRanking(row.top_categories),
    topCustomers: toArray<CustomerRankingMetric>(row.top_customers, (item) => ({
      customerId: typeof item.customerId === 'string' ? item.customerId : '',
      customerName: typeof item.customerName === 'string' ? item.customerName : 'Cliente sin nombre',
      salesCount: toNumber(item.salesCount),
      amount: toNumber(item.amount),
      lastPurchaseDate: typeof item.lastPurchaseDate === 'string' ? item.lastPurchaseDate : null,
    })),
    customerAnalytics: (() => {
      const value = row.customer_analytics;
      if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
      const item = value as Record<string, unknown>;
      return {
        newThisMonth: toNumber(item.newThisMonth),
        withDebt: toNumber(item.withDebt),
        averagePurchaseFrequency: toNumber(item.averagePurchaseFrequency),
      } satisfies CustomerAnalyticsMetric;
    })(),
    productHealth: (() => {
      const value = row.product_health;
      if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
      const item = value as Record<string, unknown>;
      return {
        outOfStock: toNumber(item.outOfStock),
        lowStock: toNumber(item.lowStock),
        inactive: toNumber(item.inactive),
      } satisfies ProductHealthMetric;
    })(),
  };
}

export async function getDashboardAnalytics(supabase: SupabaseClient): Promise<AdminDashboardStats> {
  const { data, error } = await supabase.rpc('get_admin_dashboard_analytics').single();

  if (error) {
    throw error;
  }

  return mapDashboardAnalytics(data as DashboardAnalyticsRpcRow);
}

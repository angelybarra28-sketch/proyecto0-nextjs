import type { MonthlyMetric } from './comunes';
import type { CreditDashboardMetrics } from './credito';

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
  lowStock: number;
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
  credit?: CreditDashboardMetrics;
}

export interface MonthlyRevenuePoint {
  month: string;
  monthKey: string;
  orderRevenue: number;
  subscriptionRevenue: number;
  totalRevenue: number;
  orderCount: number;
}

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  paidEarnings?: number;
  partialCollected?: number;
  balanceDue?: number;
  productsCount: number;
  dateRangeLabel: string;
  todayOrders?: number; // Count of today's orders
  monthlyRevenue?: MonthlyRevenuePoint[];
}

export interface DashboardQueryParams {
  fromDate?: string; // YYYY-MM-DD format
  toDate?: string; // YYYY-MM-DD format
}


export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  productsCount: number;
  dateRangeLabel: string;
  todayOrders?: number; // Count of today's orders
}

export interface DashboardQueryParams {
  fromDate?: string; // YYYY-MM-DD format
  toDate?: string; // YYYY-MM-DD format
}


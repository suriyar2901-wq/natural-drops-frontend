export type AccountStatus = 'PENDING' | 'ACTIVE' | 'DEACTIVATED';
export type SubscriptionStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Payment Pending';
export type PaymentStatus = 'SUCCESSFUL' | 'PENDING' | 'FAILED';
export type PlanType = 'MONTHLY' | 'YEARLY';
export type PaymentMethod = 'CASH' | 'UPI' | 'GATEWAY';

export interface SellerPayment {
  id: number;
  transactionCode: string;
  sellerId: number;
  sellerCode?: string;
  sellerName?: string;
  businessName?: string;
  plan?: PlanType;
  amount: number;
  planPriceSnapshot?: number;
  method?: PaymentMethod;
  status?: PaymentStatus;
  gatewayRef?: string;
  note?: string;
  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface SellerAdmin {
  id: number;
  sellerCode: string;
  companyCode?: string;
  ownerName: string;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  businessName: string;
  businessAddress: string;
  area: string;
  city: string;
  pincode: string;
  accountStatus: AccountStatus;
  deactivationReason?: string;
  adminNote?: string;
  createdAt?: string;
  createdBy?: string;
  subscriptionId?: number;
  plan?: PlanType;
  amount?: number;
  startDate?: string;
  expiryDate?: string;
  paymentStatus?: PaymentStatus;
  subscriptionStatus?: SubscriptionStatus;
  daysRemaining?: number;
  payments?: SellerPayment[];
}

export interface PlatformDashboard {
  period: string;
  totalSellers: number;
  activeSubscribers: number;
  revenueThisMonth: number;
  yetToReceive: number;
  revenueToday: number;
  revenueLastMonth: number;
  expectedRevenue: number;
  activeRate: string;
  activeSubscriptions: number;
  expiringSoon: number;
  expired: number;
  paymentPending: number;
  deactivatedAccounts: number;
  newSellers: number;
  renewed: number;
  notRenewed: number;
  renewalRate: string;
  totalBuyers: number;
  ordersToday: number;
  ordersThisMonth: number;
  activeSellersToday: number;
  recentPayments: SellerPayment[];
  attentionItems: string[];
}

export interface CreateSellerPayload {
  ownerName: string;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  businessName: string;
  businessAddress: string;
  area: string;
  city: string;
  pincode: string;
  plan: PlanType;
}

export interface UpdateSellerPayload extends CreateSellerPayload {
  changeNote?: string;
}

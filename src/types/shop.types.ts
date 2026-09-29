export interface ShopCustomer {
  id: number;
  sellerUserId: number;
  buyerUserId?: number | null;
  customerCode: string;
  name: string;
  mobile: string;
  house?: string | null;
  area?: string | null;
  city?: string | null;
  pin?: string | null;
  note?: string | null;
  money: number | string;
  emptyCans: number;
}

export interface LedgerEvent {
  id: number;
  customerId: number;
  kind: 'OPENING' | 'BILL' | 'RECEIPT';
  amount: number | string;
  method?: string | null;
  reference?: string | null;
  occurredAt: string;
  createdBy?: string | null;
}

export interface CanEvent {
  id: number;
  customerId: number;
  changeAmount: number;
  copy?: string | null;
  occurredAt: string;
}

export interface ShopProfile {
  id?: number;
  sellerUserId?: number;
  businessName?: string;
  address?: string;
  ownerName?: string;
  altMobile?: string;
  email?: string;
  qrData?: string;
}

export interface ShopCustomerPayload {
  name: string;
  mobile: string;
  house?: string;
  area?: string;
  city?: string;
  pin?: string;
  note?: string;
}

export interface BuyerAccountSummary {
  due: number | string;
  emptyCans: number;
  customer: ShopCustomer | null;
  ledger: LedgerEvent[];
  canEvents: CanEvent[];
  sellerQr?: string | null;
  sellerBusiness?: string | null;
  companyName?: string | null;
  companyCode?: string | null;
  sellerProfilePhoto?: string | null;
}

export interface SellerSubscriptionAccess {
  canWork: boolean;
  subscribed: boolean;
  showExpiryReminder: boolean;
  status: string;
  reminderMessage?: string;
  plan?: string;
  amount?: number | string;
  monthlyAmount?: number | string;
  yearlyAmount?: number | string;
  startDate?: string;
  expiryDate?: string;
  daysRemaining?: number;
  businessName?: string;
}

export const moneyValue = (value: number | string | null | undefined): number => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

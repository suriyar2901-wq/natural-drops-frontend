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
  canDeposit?: number | string | null;
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
  eventType?: string | null;
  quantity?: number | null;
  amount?: number | string | null;
  note?: string | null;
  copy?: string | null;
  occurredAt: string;
}

export interface CanStockSummary {
  totalStock: number;
  depositPerCan: number | string;
  damaged: number;
  missing: number;
  withCustomers: number;
  depositHeld: number | string;
  logs: Array<{ id: number; changeAmount: number; copy?: string | null; occurredAt: string }>;
}

export interface CanCollectionReport {
  date: string;
  returned: number;
  damaged: number;
  missing: number;
  replaced: number;
  depositCollected: number | string;
  rows: Array<{
    id: number;
    customerId: number;
    name: string;
    mobile: string;
    eventType: string;
    quantity: number;
    amount: number | string;
    copy?: string | null;
    note?: string | null;
    occurredAt: string;
  }>;
}

export const canEventType = (event: { eventType?: string | null; changeAmount?: number | null }) => {
  const type = String(event.eventType || '').trim().toUpperCase();
  if (type) return type;
  return (event.changeAmount || 0) < 0 ? 'RETURNED' : 'ISSUED';
};

export const canEventQuantity = (event: { quantity?: number | null; changeAmount?: number | null }) => {
  if (event.quantity != null) return Math.abs(event.quantity);
  return Math.abs(event.changeAmount || 0);
};

export const CAN_ENTRY_LABEL: Record<string, string> = {
  ISSUED: 'Issued',
  RETURNED: 'Returned',
  DAMAGED: 'Damaged can',
  MISSING: 'Missing can',
  REPLACEMENT: 'Can replacement',
  ADJUSTMENT: 'Can adjustment',
  DEPOSIT: 'Can deposit',
};

export interface ShopProfile {
  id?: number;
  sellerUserId?: number;
  businessName?: string;
  address?: string;
  ownerName?: string;
  altMobile?: string;
  email?: string;
  qrData?: string;
  openTime?: string | null;
  closeTime?: string | null;
  openDays?: string | null;
  leaveDates?: string | null;
  showHoursToBuyer?: boolean | null;
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
  shopOpenTime?: string | null;
  shopCloseTime?: string | null;
  shopOpenDays?: string | null;
  shopLeaveDates?: string | null;
  shopOpenNow?: boolean;
  shopNextOpenLabel?: string | null;
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

export const orderBillPending = (order: {
  status?: string;
  paymentStatus?: string | null;
  total?: number | string | null;
  finalBillAmount?: number | string | null;
}) => {
  if (order.status === 'canceled') return 0;
  const total = moneyValue(order.total);
  const paid = Math.min(total, Math.max(0, moneyValue(order.finalBillAmount)));
  if (order.paymentStatus === 'PAID') return 0;
  if (order.paymentStatus === 'PARTIALLY_PAID') return Math.max(0, total - paid);
  return total;
};

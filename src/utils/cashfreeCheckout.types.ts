export type CashfreeCheckoutParams = {
  paymentSessionId: string;
  cfOrderId: string;
  environment?: string;
};

export type CashfreeCheckoutResult = {
  status: 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'UNKNOWN';
  orderId?: string;
  message?: string;
};

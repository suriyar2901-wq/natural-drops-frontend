import { baseApi } from './baseApi';

export type PlatformPayment = {
  upiId: string;
  qrCodeImage: string;
  planMonthlyAmount: string;
  planYearlyAmount: string;
};

export type PaymentClaim = {
  id: number;
  kind: 'SUBSCRIPTION' | 'ORDER_BILL';
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  claimantUserId: number;
  sellerId?: number | null;
  sellerUserId?: number | null;
  orderId?: number | null;
  amount: number | string;
  method?: string;
  upiReference?: string | null;
  plan?: string | null;
  note?: string | null;
  createdAt?: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
};

/** Response from POST /payments/cashfree/orders (amount is set on the server). */
export type CashfreeCreateOrderResponse = {
  orderId: number;
  cfOrderId: string;
  paymentSessionId: string;
  amount: number | string;
  currency?: string;
  environment: string;
  status: string;
};

/** Response from GET /payments/cashfree/orders/{cfOrderId}/status */
export type CashfreeOrderStatusResponse = CashfreeCreateOrderResponse & {
  cfOrderStatus?: string | null;
  cfPaymentId?: string | null;
  paymentApplied: boolean;
  appliedAt?: string | null;
};

export const paymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformPayment: builder.query<PlatformPayment, void>({
      query: () => '/payments/platform',
      providesTags: ['Settings'],
    }),
    savePlatformPayment: builder.mutation<PlatformPayment, { upiId: string; qrCodeImage: string }>({
      query: (body) => ({
        url: '/payments/platform',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Settings'],
    }),
    claimSubscriptionPayment: builder.mutation<PaymentClaim, { plan: string; method?: string; upiReference?: string }>({
      query: (body) => ({
        url: '/payments/subscription/claim',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Shop', 'PlatformAdmin'],
    }),
    getMySubscriptionClaims: builder.query<PaymentClaim[], void>({
      query: () => '/payments/subscription/mine',
      providesTags: ['Shop', 'PlatformAdmin'],
    }),
    getPendingSubscriptionClaims: builder.query<PaymentClaim[], void>({
      query: () => '/payments/subscription/pending',
      providesTags: ['PlatformAdmin'],
    }),
    confirmSubscriptionClaim: builder.mutation<PaymentClaim, number>({
      query: (id) => ({
        url: `/payments/subscription/${id}/confirm`,
        method: 'POST',
      }),
      invalidatesTags: ['PlatformAdmin', 'Shop'],
    }),
    rejectSubscriptionClaim: builder.mutation<PaymentClaim, { id: number; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/payments/subscription/${id}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['PlatformAdmin', 'Shop'],
    }),
    claimOrderPayment: builder.mutation<PaymentClaim, { amount: string; method: string; orderId: number; upiReference?: string }>({
      query: (body) => ({
        url: '/payments/order/claim',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BuyerAccount', 'Shop', 'Order'],
    }),
    getMyOrderClaims: builder.query<PaymentClaim[], void>({
      query: () => '/payments/order/mine',
      providesTags: ['BuyerAccount', 'Order'],
    }),
    getPendingOrderClaims: builder.query<PaymentClaim[], void>({
      query: () => '/payments/order/pending',
      providesTags: ['Shop', 'Order'],
    }),
    confirmOrderClaim: builder.mutation<PaymentClaim, number>({
      query: (id) => ({
        url: `/payments/order/${id}/confirm`,
        method: 'POST',
      }),
      invalidatesTags: ['Shop', 'Order', 'BuyerAccount'],
    }),
    rejectOrderClaim: builder.mutation<PaymentClaim, { id: number; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/payments/order/${id}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Shop', 'Order', 'BuyerAccount'],
    }),
    createCashfreeOrder: builder.mutation<CashfreeCreateOrderResponse, { orderId: number }>({
      query: (body) => ({
        url: '/payments/cashfree/orders',
        method: 'POST',
        body,
      }),
    }),
    getCashfreeOrderStatus: builder.query<CashfreeOrderStatusResponse, string>({
      query: (cfOrderId) => `/payments/cashfree/orders/${encodeURIComponent(cfOrderId)}/status`,
    }),
  }),
});

export const {
  useGetPlatformPaymentQuery,
  useSavePlatformPaymentMutation,
  useClaimSubscriptionPaymentMutation,
  useGetMySubscriptionClaimsQuery,
  useGetPendingSubscriptionClaimsQuery,
  useConfirmSubscriptionClaimMutation,
  useRejectSubscriptionClaimMutation,
  useClaimOrderPaymentMutation,
  useGetMyOrderClaimsQuery,
  useGetPendingOrderClaimsQuery,
  useConfirmOrderClaimMutation,
  useRejectOrderClaimMutation,
  useCreateCashfreeOrderMutation,
  useLazyGetCashfreeOrderStatusQuery,
} = paymentApi;

import { baseApi } from './baseApi';
import { BuyerAccountSummary, ShopCustomer } from '../../types/shop.types';

export const buyerAccountApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBuyerAccountSummary: builder.query<BuyerAccountSummary, void>({
      query: () => '/buyer-account/summary',
      providesTags: ['BuyerAccount'],
    }),
    claimBuyerPayment: builder.mutation<ShopCustomer, { amount: string; method: string; orderId: number }>({
      query: (body) => ({
        url: '/buyer-account/payments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BuyerAccount', 'Shop', 'Order'],
    }),
    markCansReady: builder.mutation<void, { quantity: number }>({
      query: (body) => ({
        url: '/buyer-account/cans-ready',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetBuyerAccountSummaryQuery,
  useClaimBuyerPaymentMutation,
  useMarkCansReadyMutation,
} = buyerAccountApi;

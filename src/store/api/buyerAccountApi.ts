import { baseApi } from './baseApi';
import { BuyerAccountSummary, ShopCustomer } from '../../types/shop.types';

export const buyerAccountApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBuyerAccountSummary: builder.query<BuyerAccountSummary, void>({
      query: () => '/buyer-account/summary',
      providesTags: ['BuyerAccount'],
    }),
    claimBuyerPayment: builder.mutation<ShopCustomer, { amount: string; method: string }>({
      query: (body) => ({
        url: '/buyer-account/payments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BuyerAccount', 'Shop'],
    }),
  }),
});

export const {
  useGetBuyerAccountSummaryQuery,
  useClaimBuyerPaymentMutation,
} = buyerAccountApi;

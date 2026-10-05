import { baseApi } from './baseApi';
import {
  CreateSellerPayload,
  PlatformDashboard,
  SellerAdmin,
  SellerPayment,
  UpdateSellerPayload,
} from '../../types/platformAdmin.types';

export const platformAdminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformDashboard: builder.query<PlatformDashboard, { period?: string; fromDate?: string; toDate?: string } | void>({
      query: (args) => ({
        url: '/admin/dashboard',
        params: args || undefined,
      }),
      providesTags: ['PlatformAdmin'],
    }),
    getAdminSellers: builder.query<SellerAdmin[], void>({
      query: () => '/admin/sellers',
      providesTags: ['PlatformAdmin'],
    }),
    getAdminSeller: builder.query<SellerAdmin, number>({
      query: (id) => `/admin/sellers/${id}`,
      providesTags: ['PlatformAdmin'],
    }),
    createAdminSeller: builder.mutation<SellerAdmin, CreateSellerPayload>({
      query: (body) => ({
        url: '/admin/sellers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PlatformAdmin'],
    }),
    updateAdminSeller: builder.mutation<SellerAdmin, { id: number; body: UpdateSellerPayload }>({
      query: ({ id, body }) => ({
        url: `/admin/sellers/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PlatformAdmin'],
    }),
    deactivateAdminSeller: builder.mutation<SellerAdmin, { id: number; reason: string; adminNote?: string }>({
      query: ({ id, reason, adminNote }) => ({
        url: `/admin/sellers/${id}/deactivate`,
        method: 'POST',
        body: { reason, adminNote },
      }),
      invalidatesTags: ['PlatformAdmin'],
    }),
    reactivateAdminSeller: builder.mutation<SellerAdmin, { id: number; adminNote?: string }>({
      query: ({ id, adminNote }) => ({
        url: `/admin/sellers/${id}/reactivate`,
        method: 'POST',
        body: { adminNote },
      }),
      invalidatesTags: ['PlatformAdmin'],
    }),
    recordSellerPayment: builder.mutation<SellerAdmin, {
      id: number;
      method: string;
      receivedAmount: string;
      paidAt?: string;
      note?: string;
    }>({
      query: ({ id, ...body }) => ({
        url: `/admin/sellers/${id}/payments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PlatformAdmin'],
    }),
    getAdminSubscriptions: builder.query<SellerAdmin[], void>({
      query: () => '/admin/subscriptions',
      providesTags: ['PlatformAdmin'],
    }),
    renewAdminSubscription: builder.mutation<SellerAdmin, { sellerId: number; plan: string; paidAt?: string; note?: string }>({
      query: ({ sellerId, ...body }) => ({
        url: `/admin/subscriptions/${sellerId}/renew`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PlatformAdmin'],
    }),
    getAdminPayments: builder.query<SellerPayment[], void>({
      query: () => '/admin/payments',
      providesTags: ['PlatformAdmin'],
    }),
    getAdminPayment: builder.query<SellerPayment, number>({
      query: (id) => `/admin/payments/${id}`,
      providesTags: ['PlatformAdmin'],
    }),
  }),
});

export const {
  useGetPlatformDashboardQuery,
  useGetAdminSellersQuery,
  useGetAdminSellerQuery,
  useCreateAdminSellerMutation,
  useUpdateAdminSellerMutation,
  useDeactivateAdminSellerMutation,
  useReactivateAdminSellerMutation,
  useRecordSellerPaymentMutation,
  useGetAdminSubscriptionsQuery,
  useRenewAdminSubscriptionMutation,
  useGetAdminPaymentsQuery,
  useGetAdminPaymentQuery,
} = platformAdminApi;

import { baseApi } from './baseApi';
import { CanEvent, LedgerEvent, SellerSubscriptionAccess, ShopCustomer, ShopCustomerPayload, ShopProfile } from '../../types/shop.types';

export const shopApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCanLedger: builder.query<Array<{
      customerId: number;
      name: string;
      mobile: string;
      given: number;
      returned: number;
      toReturn: number;
    }>, void>({
      query: () => '/shop/can-ledger',
      providesTags: ['Shop'],
    }),
    getShopCustomers: builder.query<ShopCustomer[], void>({
      query: () => '/shop/customers',
      providesTags: ['Shop'],
    }),
    getShopCustomer: builder.query<ShopCustomer, number>({
      query: (id) => `/shop/customers/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Shop', id }],
    }),
    createShopCustomer: builder.mutation<ShopCustomer, ShopCustomerPayload>({
      query: (body) => ({
        url: '/shop/customers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Shop'],
    }),
    updateShopCustomer: builder.mutation<ShopCustomer, { id: number; body: ShopCustomerPayload }>({
      query: ({ id, body }) => ({
        url: `/shop/customers/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Shop'],
    }),
    getShopLedger: builder.query<LedgerEvent[], number>({
      query: (id) => `/shop/customers/${id}/ledger`,
      providesTags: (_result, _error, id) => [{ type: 'Shop', id }],
    }),
    recordShopPayment: builder.mutation<ShopCustomer, { id: number; amount: string; method: string }>({
      query: ({ id, ...body }) => ({
        url: `/shop/customers/${id}/payments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Shop', 'BuyerAccount'],
    }),
    getShopCanEvents: builder.query<CanEvent[], number>({
      query: (id) => `/shop/customers/${id}/cans`,
      providesTags: (_result, _error, id) => [{ type: 'Shop', id }],
    }),
    collectShopCans: builder.mutation<ShopCustomer, { id: number; quantity: number }>({
      query: ({ id, quantity }) => ({
        url: `/shop/customers/${id}/cans`,
        method: 'POST',
        body: { quantity },
      }),
      invalidatesTags: ['Shop', 'BuyerAccount'],
    }),
    createPhoneOrder: builder.mutation<any, {
      customerId: number;
      delivery: string;
      deliveryTime?: string;
      note?: string;
      items: { menuItemId: number; quantity: number }[];
    }>({
      query: (body) => ({
        url: '/shop/phone-orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Shop', 'Order', 'BuyerAccount'],
    }),
    getShopCompany: builder.query<{
      sellerId: number;
      companyName: string;
      companyCode: string;
      sellerCode: string;
      buyerCount: number;
      unreadMessages: number;
      profilePhoto?: string | null;
    }, void>({
      query: () => '/shop/company',
      providesTags: ['Shop'],
    }),
    getShopBuyers: builder.query<any[], void>({
      query: () => '/shop/buyers',
      providesTags: ['Shop'],
    }),
    createShopBuyer: builder.mutation<{
      user: any;
      username: string;
      companyName: string;
      companyCode: string;
      inviteLink: string;
      otp?: string;
      shareMessage: string;
      whatsappUrl: string;
      smsUrl: string;
      emailSent: boolean;
      sellerEmailSent: boolean;
    }, {
      fullName: string;
      username?: string;
      phone: string;
      email?: string;
      houseDoorNo?: string;
      streetArea?: string;
      city?: string;
      district?: string;
      state?: string;
      pincode?: string;
    }>({
      query: (body) => ({
        url: '/shop/buyers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Shop'],
    }),
    getShopInbox: builder.query<Array<{
      id: number;
      sellerId: number;
      buyerUserId?: number;
      title: string;
      message: string;
      isRead: boolean;
      createdAt: string;
    }>, void>({
      query: () => '/shop/inbox',
      providesTags: ['Shop'],
    }),
    markShopInboxRead: builder.mutation<void, number>({
      query: (id) => ({
        url: `/shop/inbox/${id}/read`,
        method: 'POST',
      }),
      invalidatesTags: ['Shop'],
    }),
    getSellerSubscription: builder.query<SellerSubscriptionAccess, void>({
      query: () => '/shop/subscription',
      providesTags: ['Shop', 'PlatformAdmin'],
    }),
    subscribeSeller: builder.mutation<SellerSubscriptionAccess, { plan: string; method: string }>({
      query: (body) => ({
        url: '/shop/subscription',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Shop', 'PlatformAdmin'],
    }),
    getShopProfile: builder.query<ShopProfile, void>({
      query: () => '/shop/profile',
      providesTags: ['Shop'],
    }),
    saveShopProfile: builder.mutation<ShopProfile, ShopProfile>({
      query: (body) => ({
        url: '/shop/profile',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Shop', 'BuyerAccount'],
    }),
  }),
});

export const {
  useGetCanLedgerQuery,
  useGetShopCustomersQuery,
  useGetShopCustomerQuery,
  useCreateShopCustomerMutation,
  useUpdateShopCustomerMutation,
  useGetShopLedgerQuery,
  useRecordShopPaymentMutation,
  useGetShopCanEventsQuery,
  useCollectShopCansMutation,
  useCreatePhoneOrderMutation,
  useGetShopCompanyQuery,
  useGetShopBuyersQuery,
  useCreateShopBuyerMutation,
  useGetShopInboxQuery,
  useMarkShopInboxReadMutation,
  useGetSellerSubscriptionQuery,
  useSubscribeSellerMutation,
  useGetShopProfileQuery,
  useSaveShopProfileMutation,
} = shopApi;

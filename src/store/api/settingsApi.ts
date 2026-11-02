import { baseApi } from './baseApi';

export type AppSettings = Record<string, string>;
export type SupportContacts = { phone: string; whatsapp: string; email: string };

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<AppSettings, void>({
      query: () => '/settings',
      transformResponse: (response: any) => {
        // baseApi already unwraps ApiResponse -> should be Map<string,string>
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          return response as AppSettings;
        }
        return (response?.data || {}) as AppSettings;
      },
      providesTags: ['Settings'],
    }),
    getSettingByKey: builder.query<string | null, string>({
      query: (key) => `/settings/${encodeURIComponent(key)}`,
      transformResponse: (response: any) => {
        if (typeof response === 'string' || response === null) return response;
        return response?.data ?? null;
      },
      providesTags: ['Settings'],
    }),

    getCustomerContactNumber: builder.query<string, void>({
      query: () => '/settings/customer-contact-number',
      transformResponse: (response: any) => {
        if (typeof response === 'string') return response;
        return (response?.data ?? response ?? '') as string;
      },
      providesTags: ['Settings'],
    }),

    updateCustomerContactNumber: builder.mutation<void, { phone: string }>({
      query: ({ phone }) => ({
        url: '/settings/customer-contact-number',
        method: 'PUT',
        body: { phone },
      }),
      invalidatesTags: ['Settings'],
    }),

    getSupportContacts: builder.query<SupportContacts, void>({
      query: () => '/settings/support-contacts',
      transformResponse: (response: any) => {
        const data = response?.phone !== undefined ? response : (response?.data || {});
        return {
          phone: String(data.phone || ''),
          whatsapp: String(data.whatsapp || ''),
          email: String(data.email || ''),
        };
      },
      providesTags: ['Settings'],
    }),

    getCustomerSupportEmail: builder.query<string, void>({
      query: () => '/settings/customer-support-email',
      transformResponse: (response: any) => {
        if (typeof response === 'string') return response;
        return (response?.data ?? response ?? '') as string;
      },
      providesTags: ['Settings'],
    }),

    updateCustomerSupportEmail: builder.mutation<void, { email: string }>({
      query: ({ email }) => ({
        url: '/settings/customer-support-email',
        method: 'PUT',
        body: { email },
      }),
      invalidatesTags: ['Settings'],
    }),

    updateSettings: builder.mutation<void, Record<string, string>>({
      query: (settings) => ({
        url: '/settings',
        method: 'PUT',
        body: settings,
      }),
      invalidatesTags: ['Settings'],
    }),

    deleteSetting: builder.mutation<void, string>({
      query: (key) => ({
        url: `/settings/${encodeURIComponent(key)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Settings'],
    }),

    getPricingFees: builder.query<{
      taxEnabled: string;
      taxRatePercent: string;
      platformFeeEnabled: string;
      platformFeeAmount: string;
    }, void>({
      query: () => '/pricing/fees',
      transformResponse: (response: any) => {
        const data = response?.taxEnabled !== undefined ? response : (response?.data || {});
        return {
          taxEnabled: String(data.taxEnabled ?? 'true'),
          taxRatePercent: String(data.taxRatePercent ?? '5'),
          platformFeeEnabled: String(data.platformFeeEnabled ?? 'false'),
          platformFeeAmount: String(data.platformFeeAmount ?? '0'),
        };
      },
      providesTags: ['Settings'],
    }),

    getPricingQuote: builder.query<Record<string, any>, { subtotal: number; latitude?: number; longitude?: number }>({
      query: ({ subtotal, latitude, longitude }) => {
        const params = new URLSearchParams();
        params.set('subtotal', String(subtotal || 0));
        if (latitude != null) params.set('latitude', String(latitude));
        if (longitude != null) params.set('longitude', String(longitude));
        return `/pricing/quote?${params.toString()}`;
      },
      transformResponse: (response: any) => (response?.total !== undefined ? response : (response?.data || {})),
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useGetSettingByKeyQuery,
  useGetCustomerContactNumberQuery,
  useUpdateCustomerContactNumberMutation,
  useGetCustomerSupportEmailQuery,
  useGetSupportContactsQuery,
  useUpdateCustomerSupportEmailMutation,
  useUpdateSettingsMutation,
  useDeleteSettingMutation,
  useGetPricingFeesQuery,
  useGetPricingQuoteQuery,
  useLazyGetPricingQuoteQuery,
} = settingsApi;



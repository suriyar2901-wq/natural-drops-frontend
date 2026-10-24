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
} = settingsApi;



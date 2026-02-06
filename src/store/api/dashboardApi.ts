import { baseApi } from './baseApi';
import { DashboardStats, DashboardQueryParams } from '../../types';

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<DashboardStats, DashboardQueryParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.fromDate) {
          queryParams.append('fromDate', params.fromDate);
          console.log('📤 Dashboard API: Adding fromDate:', params.fromDate);
        }
        if (params?.toDate) {
          queryParams.append('toDate', params.toDate);
          console.log('📤 Dashboard API: Adding toDate:', params.toDate);
        }
        const queryString = queryParams.toString();
        const url = `/dashboard${queryString ? `?${queryString}` : ''}`;
        console.log('📤 Dashboard API: Request URL:', url);
        return url;
      },
      transformResponse: (response: any) => {
        console.log('📥 Dashboard API: Raw response:', response);
        // baseApi already unwraps the response
        if (response && typeof response === 'object' && 'totalOrders' in response) {
          console.log('✅ Dashboard API: Response is valid DashboardStats');
          return response;
        }
        const data = response?.data || response;
        console.log('✅ Dashboard API: Returning data:', data);
        return data;
      },
      providesTags: ['Order'], // Invalidate when orders change
    }),
  }),
});

export const { useGetDashboardStatsQuery } = dashboardApi;


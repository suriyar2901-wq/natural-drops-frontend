import { baseApi } from './baseApi';
import { AdminNotification, BuyerNotification } from '../../types';

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all admin notifications
    getAllAdminNotifications: builder.query<AdminNotification[], void>({
      query: () => '/notifications/admin',
      transformResponse: (response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || [];
      },
      providesTags: ['Notification'],
    }),
    // Get unread admin notifications
    getUnreadAdminNotifications: builder.query<AdminNotification[], void>({
      query: () => '/notifications/admin/unread',
      transformResponse: (response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || [];
      },
      providesTags: ['Notification'],
    }),
    // Get unread notification count
    getUnreadAdminNotificationCount: builder.query<number, void>({
      query: () => '/notifications/admin/count',
      transformResponse: (response: any) => {
        // Response should be a number
        if (typeof response === 'number') {
          return response;
        }
        return response?.data || 0;
      },
      providesTags: ['Notification'],
    }),
    // Mark notification as read
    markAdminNotificationAsRead: builder.mutation<void, number>({
      query: (id) => ({
        url: `/notifications/admin/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notification'],
    }),
    // Clear all notifications
    clearAllAdminNotifications: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/admin',
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification'],
    }),
    // Buyer Notifications
    getBuyerNotifications: builder.query<BuyerNotification[], number>({
      query: (buyerId) => `/notifications/buyer/${buyerId}`,
      transformResponse: (response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || [];
      },
      providesTags: ['BuyerNotification'],
    }),
    getUnreadBuyerNotifications: builder.query<BuyerNotification[], number>({
      query: (buyerId) => `/notifications/buyer/${buyerId}/unread`,
      transformResponse: (response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || [];
      },
      providesTags: ['BuyerNotification'],
    }),
    getUnreadBuyerNotificationCount: builder.query<number, number>({
      query: (buyerId) => `/notifications/buyer/${buyerId}/count`,
      transformResponse: (response: any) => {
        if (typeof response === 'number') {
          return response;
        }
        return response?.data || 0;
      },
      providesTags: ['BuyerNotification'],
    }),
    markBuyerNotificationAsRead: builder.mutation<void, number>({
      query: (id) => ({
        url: `/notifications/buyer/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['BuyerNotification'],
    }),
  }),
});

export const {
  useGetAllAdminNotificationsQuery,
  useGetUnreadAdminNotificationsQuery,
  useGetUnreadAdminNotificationCountQuery,
  useMarkAdminNotificationAsReadMutation,
  useClearAllAdminNotificationsMutation,
  useLazyGetAllAdminNotificationsQuery,
  useLazyGetUnreadAdminNotificationCountQuery,
  // Buyer notifications
  useGetBuyerNotificationsQuery,
  useGetUnreadBuyerNotificationsQuery,
  useGetUnreadBuyerNotificationCountQuery,
  useMarkBuyerNotificationAsReadMutation,
} = notificationApi;


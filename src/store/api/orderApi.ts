import { baseApi } from './baseApi';
import { API_BASE_URL } from '../../utils/constants';
import { 
  Order, 
  CreateOrderRequest, 
  UpdateOrderStatusRequest, 
  ConfirmOrderRequest,
  ProcessOrderRequest,
  DeliverOrderRequest,
  CancelOrderRequest,
  SetOnTheWayRequest,
  UpdateOrderRequest,
  UpdateOrderBillRequest,
  OrderStatusHistory,
  OrderStatus,
  ApiResponse 
} from '../../types';

export const orderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createOrder: builder.mutation<Order, CreateOrderRequest>({
      query: (order) => ({
        url: '/orders',
        method: 'POST',
        body: order,
      }),
      invalidatesTags: ['Order', 'Notification', 'BuyerNotification'],
    }),
    getBuyerOrders: builder.query<Order[], number>({
      query: (buyerId) => `/orders/buyer/${buyerId}`,
      transformResponse: (response: any) => {
        // baseApi already unwraps the response, so check if it's already an array
        if (Array.isArray(response)) {
          return response;
        }
        // Fallback: if still wrapped, extract data
        return response?.data || [];
      },
      providesTags: (result, _error, buyerId) => 
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Order' as const, id })),
              { type: 'Order' as const, id: `buyer-${buyerId}` },
              'Order',
            ]
          : [{ type: 'Order' as const, id: `buyer-${buyerId}` }, 'Order'],
    }),
    getBuyerOrdersByStatus: builder.query<Order[], { buyerId: number; status: OrderStatus }>({
      query: ({ buyerId, status }) => `/orders/buyer/${buyerId}/status/${status}`,
      transformResponse: (response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || [];
      },
      providesTags: ['Order'],
    }),
    getAllOrders: builder.query<Order[], { status?: string; fromDate?: string; toDate?: string } | void>({
      query: (args) => {
        const status = (args as any)?.status;
        const fromDate = (args as any)?.fromDate;
        const toDate = (args as any)?.toDate;

        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (fromDate) params.set('fromDate', fromDate);
        if (toDate) params.set('toDate', toDate);

        const qs = params.toString();
        return qs ? `/orders?${qs}` : '/orders';
      },
      transformResponse: (response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || [];
      },
      providesTags: ['Order'],
    }),
    getOrdersByStatus: builder.query<Order[], OrderStatus>({
      query: (status) => `/orders/status/${status}`,
      transformResponse: (response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || [];
      },
      providesTags: ['Order'],
    }),
    getOrderById: builder.query<Order, number>({
      query: (id) => `/orders/${id}`,
      transformResponse: (response: any) => {
        // baseApi already unwraps, so response should be the Order object directly
        if (response && typeof response === 'object' && 'id' in response) {
          return response;
        }
        return response?.data || response;
      },
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),
    getOrderStatusHistory: builder.query<OrderStatusHistory[], number>({
      query: (orderId) => `/orders/${orderId}/history`,
      transformResponse: (response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || [];
      },
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),
    updateOrder: builder.mutation<Order, { id: number; data: UpdateOrderRequest }>({
      query: ({ id, data }) => ({
        url: `/orders/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Order', id },
        'Order',
        'Shop',
        'BuyerNotification',
      ],
    }),
    updateOrderStatus: builder.mutation<Order, { id: number; data: UpdateOrderStatusRequest }>({
      query: ({ id, data }) => {
        console.log('📤 updateOrderStatus API call:', { id, data, url: `/orders/${id}/status?status=${data.status}` });
        return {
          url: `/orders/${id}/status?status=${data.status}`,
          method: 'PUT',
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Order', id }, 
        'Order', 
        'BuyerNotification'
      ],
    }),
    confirmOrder: builder.mutation<Order, { id: number; data: ConfirmOrderRequest }>({
      query: ({ id, data }) => {
        const url = `/orders/${id}/confirm`;
        console.log('📤 confirmOrder API call:', { 
          id, 
          data, 
          url,
          method: 'PATCH',
          fullUrl: `${API_BASE_URL}${url}`
        });
        return {
          url,
          method: 'PATCH',
          body: data,
        };
      },
      transformResponse: (response: any) => {
        console.log('📥 confirmOrder raw response:', response);
        // baseApi already unwraps the ApiResponse wrapper
        // Response should be the Order object directly
        if (response && typeof response === 'object') {
          if ('id' in response) {
            // This is already the Order object
            console.log('✅ confirmOrder: Response is Order object');
            return response;
          }
          if ('data' in response && response.data && 'id' in response.data) {
            // Response still wrapped
            console.log('✅ confirmOrder: Unwrapping from data property');
            return response.data;
          }
        }
        console.warn('⚠️ confirmOrder: Unexpected response format', response);
        return response;
      },
      invalidatesTags: (_result, _error, { id }) => {
        // Invalidate all order-related queries to ensure buyer app gets updates
        const tags: any[] = [
          { type: 'Order', id }, 
          'Order', 
          'Menu',
          'Shop',
          'BuyerNotification'
        ];
        // If we have the order result, also invalidate buyer-specific queries
        if (_result && 'buyerId' in _result) {
          const buyerId = (_result as any).buyerId;
          tags.push({ type: 'Order', id: `buyer-${buyerId}` });
          // Also invalidate all orders for this buyer
          tags.push('Order');
        }
        console.log('🔄 Invalidating tags after confirmOrder:', tags);
        return tags;
      },
    }),
    processOrder: builder.mutation<Order, { id: number; data: ProcessOrderRequest }>({
      query: ({ id, data }) => ({
        url: `/orders/${id}/process`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Order', id }, 'Order'],
    }),
    setOnTheWay: builder.mutation<Order, { id: number; data: SetOnTheWayRequest }>({
      query: ({ id, data }) => {
        console.log('📤 setOnTheWay API call:', { id, data, url: `/orders/${id}/on-the-way` });
        return {
          url: `/orders/${id}/on-the-way`,
          method: 'PUT',
          body: data,
        };
      },
      transformResponse: (response: any) => {
        console.log('📥 setOnTheWay response:', response);
        if (response && typeof response === 'object' && 'id' in response) {
          return response;
        }
        return response?.data || response;
      },
      invalidatesTags: (_result, _error, { id }) => {
        const tags: any[] = [
          { type: 'Order', id }, 
          'Order',
          'BuyerNotification'
        ];
        if (_result && 'buyerId' in _result) {
          const buyerId = (_result as any).buyerId;
          tags.push({ type: 'Order', id: `buyer-${buyerId}` });
        }
        console.log('🔄 Invalidating tags after setOnTheWay:', tags);
        return tags;
      },
    }),
    deliverOrder: builder.mutation<Order, { id: number; data: DeliverOrderRequest }>({
      query: ({ id, data }) => {
        console.log('📤 deliverOrder API call:', { id, data, url: `/orders/${id}/deliver` });
        return {
          url: `/orders/${id}/deliver`,
          method: 'PUT',
          body: data,
        };
      },
      transformResponse: (response: any) => {
        console.log('📥 deliverOrder response:', response);
        if (response && typeof response === 'object' && 'id' in response) {
          return response;
        }
        return response?.data || response;
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Order', id }, 
        'Order',
        'BuyerNotification'
      ],
    }),
    cancelOrder: builder.mutation<Order, { id: number; data: CancelOrderRequest }>({
      query: ({ id, data }) => {
        const url = `/orders/${id}/cancel`;
        console.log('📤 cancelOrder API call:', { 
          id, 
          data, 
          url,
          method: 'PATCH',
          fullUrl: `${API_BASE_URL}${url}`
        });
        return {
          url,
          method: 'PATCH',
          body: data,
        };
      },
      transformResponse: (response: any) => {
        console.log('📥 cancelOrder raw response:', response);
        // baseApi already unwraps the ApiResponse wrapper
        // Response should be the Order object directly
        if (response && typeof response === 'object') {
          if ('id' in response) {
            // This is already the Order object
            console.log('✅ cancelOrder: Response is Order object');
            return response;
          }
          if ('data' in response && response.data && 'id' in response.data) {
            // Response still wrapped
            console.log('✅ cancelOrder: Unwrapping from data property');
            return response.data;
          }
        }
        console.warn('⚠️ cancelOrder: Unexpected response format', response);
        return response;
      },
      invalidatesTags: (_result, _error, { id }) => {
        // Invalidate all order-related queries to ensure buyer app gets updates
        const tags: any[] = [
          { type: 'Order', id }, 
          'Order', 
          'Menu',
          'Shop',
          'BuyerNotification'
        ];
        // If we have the order result, also invalidate buyer-specific queries
        if (_result && 'buyerId' in _result) {
          const buyerId = (_result as any).buyerId;
          tags.push({ type: 'Order', id: `buyer-${buyerId}` });
          // Also invalidate all orders for this buyer
          tags.push('Order');
        }
        console.log('🔄 Invalidating tags after cancelOrder:', tags);
        return tags;
      },
    }),
    deleteOrder: builder.mutation<void, number>({
      query: (id) => ({
        url: `/orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Order'],
    }),
    updateOrderBill: builder.mutation<Order, { id: number; data: UpdateOrderBillRequest }>({
      query: ({ id, data }) => {
        console.log('📤 updateOrderBill API call:', { id, data, url: `/orders/${id}/bill` });
        return {
          url: `/orders/${id}/bill`,
          method: 'PUT',
          body: data,
        };
      },
      transformResponse: (response: any) => {
        console.log('📥 updateOrderBill response:', response);
        if (response && typeof response === 'object' && 'id' in response) {
          return response;
        }
        return response?.data || response;
      },
      invalidatesTags: (_result, _error, { id }) => {
        const tags: any[] = [
          { type: 'Order', id }, 
          'Order',
          'BuyerNotification'
        ];
        if (_result && 'buyerId' in _result) {
          const buyerId = (_result as any).buyerId;
          tags.push({ type: 'Order', id: `buyer-${buyerId}` });
        }
        console.log('🔄 Invalidating tags after updateOrderBill:', tags);
        return tags;
      },
    }),

    getBuyerRegularOrder: builder.query<any, void>({
      query: () => '/buyer/regular-order',
      transformResponse: (response: any) => response?.data ?? response ?? null,
      providesTags: ['BuyerRegularOrder'],
    }),
    saveBuyerRegularOrder: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({
        url: '/buyer/regular-order',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['BuyerRegularOrder'],
    }),
    pauseBuyerRegularOrder: builder.mutation<any, void>({
      query: () => ({
        url: '/buyer/regular-order/pause',
        method: 'POST',
      }),
      invalidatesTags: ['BuyerRegularOrder'],
    }),
    resumeBuyerRegularOrder: builder.mutation<any, void>({
      query: () => ({
        url: '/buyer/regular-order/resume',
        method: 'POST',
      }),
      invalidatesTags: ['BuyerRegularOrder'],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetBuyerOrdersQuery,
  useGetBuyerOrdersByStatusQuery,
  useGetAllOrdersQuery,
  useGetOrdersByStatusQuery,
  useGetOrderByIdQuery,
  useGetOrderStatusHistoryQuery,
  useUpdateOrderMutation,
  useUpdateOrderStatusMutation,
  useConfirmOrderMutation,
  useProcessOrderMutation,
  useSetOnTheWayMutation,
  useDeliverOrderMutation,
  useCancelOrderMutation,
  useDeleteOrderMutation,
  useUpdateOrderBillMutation,
  useGetBuyerRegularOrderQuery,
  useSaveBuyerRegularOrderMutation,
  usePauseBuyerRegularOrderMutation,
  useResumeBuyerRegularOrderMutation,
} = orderApi;


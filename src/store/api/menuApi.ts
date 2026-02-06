import { baseApi } from './baseApi';
import { 
  MenuItem, 
  CreateMenuItemRequest, 
  UpdateMenuItemRequest, 
  UpdateStockRequest,
  ProductImage,
  AddProductImageRequest,
  ProductVideo,
  AddProductVideoRequest,
  ApiResponse 
} from '../../types';

export const menuApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMenuItems: builder.query<MenuItem[], void>({
      query: () => '/menu',
      transformResponse: (response: any) => {
        // Check if response is already unwrapped (array) or still wrapped (object with data)
        if (Array.isArray(response)) {
          return response;
        }
        
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        
        return [];
      },
      providesTags: ['Menu'],
    }),
    getMenuItemById: builder.query<MenuItem, number>({
      query: (id) => `/menu/${id}`,
      transformResponse: (response: any) => {
        // baseApi already unwraps the response, so response is already the MenuItem object
        // But handle both cases: unwrapped (direct MenuItem) or wrapped (ApiResponse<MenuItem>)
        if (response && typeof response === 'object' && 'data' in response && response.data !== undefined) {
          // Still wrapped, unwrap it
          return response.data;
        }
        // Already unwrapped, return as is
        return response;
      },
      providesTags: (_result, _error, id) => [{ type: 'Menu', id }],
    }),
    getLowStockItems: builder.query<MenuItem[], void>({
      query: () => '/menu/low-stock',
      transformResponse: (response: ApiResponse<MenuItem[]>) => response.data || [],
      providesTags: ['Menu'],
    }),
    createMenuItem: builder.mutation<MenuItem, CreateMenuItemRequest>({
      query: (menuItem) => ({
        url: '/menu',
        method: 'POST',
        body: menuItem,
      }),
      invalidatesTags: ['Menu'],
    }),
    updateMenuItem: builder.mutation<MenuItem, { id: number; data: UpdateMenuItemRequest }>({
      query: ({ id, data }) => ({
        url: `/menu/${id}`,
        method: 'PUT',
        body: data,
      }),
      // Invalidate both the specific item and the entire menu list to force refresh
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Menu', id }, 
        'Menu',
      ],
    }),
    updateStock: builder.mutation<MenuItem, { id: number; data: UpdateStockRequest }>({
      query: ({ id, data }) => ({
        url: `/menu/${id}/stock`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Menu', id }, 'Menu'],
    }),
    deleteMenuItem: builder.mutation<void, number>({
      query: (id) => ({
        url: `/menu/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Menu'],
    }),
    getProductImages: builder.query<ProductImage[], number>({
      query: (menuItemId) => `/menu/${menuItemId}/images`,
      transformResponse: (response: ApiResponse<ProductImage[]>) => response.data || [],
      providesTags: (_result, _error, id) => [{ type: 'Menu', id }],
    }),
    addProductImage: builder.mutation<ProductImage, { menuItemId: number; data: AddProductImageRequest }>({
      query: ({ menuItemId, data }) => ({
        url: `/menu/${menuItemId}/images`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { menuItemId }) => [{ type: 'Menu', id: menuItemId }, 'Menu'],
    }),
    deleteProductImage: builder.mutation<void, { menuItemId: number; imageId: number }>({
      query: ({ menuItemId, imageId }) => ({
        url: `/menu/${menuItemId}/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { menuItemId }) => [{ type: 'Menu', id: menuItemId }, 'Menu'],
    }),
    getProductVideos: builder.query<ProductVideo[], number>({
      query: (menuItemId) => `/menu/${menuItemId}/videos`,
      transformResponse: (response: ApiResponse<ProductVideo[]>) => response.data || [],
      providesTags: (_result, _error, id) => [{ type: 'Menu', id }],
    }),
    addProductVideo: builder.mutation<ProductVideo, { menuItemId: number; data: AddProductVideoRequest }>({
      query: ({ menuItemId, data }) => ({
        url: `/menu/${menuItemId}/videos`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { menuItemId }) => [{ type: 'Menu', id: menuItemId }, 'Menu'],
    }),
    deleteProductVideo: builder.mutation<void, { menuItemId: number; videoId: number }>({
      query: ({ menuItemId, videoId }) => ({
        url: `/menu/${menuItemId}/videos/${videoId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { menuItemId }) => [{ type: 'Menu', id: menuItemId }, 'Menu'],
    }),
  }),
});

export const {
  useGetMenuItemsQuery,
  useGetMenuItemByIdQuery,
  useGetLowStockItemsQuery,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useUpdateStockMutation,
  useDeleteMenuItemMutation,
  useGetProductImagesQuery,
  useAddProductImageMutation,
  useDeleteProductImageMutation,
  useGetProductVideosQuery,
  useAddProductVideoMutation,
  useDeleteProductVideoMutation,
} = menuApi;


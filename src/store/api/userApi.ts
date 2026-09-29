import { baseApi } from './baseApi';
import { User, UpdateUserRequest, ApiResponse } from '../../types';

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllUsers: builder.query<User[], void>({
      query: () => '/users',
      transformResponse: (response: any) => {
        // Handle different response formats
        if (Array.isArray(response)) {
          return response;
        }
        
        if (response && response.data) {
          return Array.isArray(response.data) ? response.data : [];
        }
        
        return [];
      },
      providesTags: ['User'],
    }),
    getUserById: builder.query<User, number>({
      query: (id) => `/users/${id}`,
      transformResponse: (response: ApiResponse<User>) => response.data!,
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),
    updateUser: builder.mutation<User, { id: number; data: UpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: any) => {
        // Handle both wrapped and unwrapped responses
        // baseApi already unwraps, but ensure we handle edge cases
        if (response && response.data) {
          return response.data;
        }
        return response;
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'User', id }, 'User', 'Auth'],
    }),
    updateOwnProfile: builder.mutation<User, UpdateUserRequest>({
      query: (data) => ({
        url: '/users/me',
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: any) => {
        if (response && response.data) {
          return response.data;
        }
        return response;
      },
      invalidatesTags: ['User', 'Auth'],
    }),
    deleteUser: builder.mutation<void, number>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
    activateUser: builder.mutation<User, number>({
      query: (id) => ({
        url: `/users/${id}/activate`,
        method: 'PUT',
      }),
      transformResponse: (response: any) => {
        if (response && response.data) {
          return response.data;
        }
        return response;
      },
      invalidatesTags: (_result, _error, id) => [{ type: 'User', id }, 'User'],
    }),
    deactivateUser: builder.mutation<User, number>({
      query: (id) => ({
        url: `/users/${id}/deactivate`,
        method: 'PUT',
      }),
      transformResponse: (response: any) => {
        if (response && response.data) {
          return response.data;
        }
        return response;
      },
      invalidatesTags: (_result, _error, id) => [{ type: 'User', id }, 'User'],
    }),
  }),
});

export const {
  useGetAllUsersQuery,
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useUpdateOwnProfileMutation,
  useDeleteUserMutation,
  useActivateUserMutation,
  useDeactivateUserMutation,
} = userApi;


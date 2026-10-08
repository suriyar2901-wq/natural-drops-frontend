import { baseApi } from './baseApi';
import { LoginRequest, RegisterRequest, User } from '../../types';

// Login response with tokens
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  role: string;
}

// Refresh token response
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// AuthResponse now just contains the user since we unwrap the backend response
export interface AuthResponse {
  user: User;
  message?: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      transformResponse: (response: LoginResponse) => response,
      invalidatesTags: ['Auth'],
    }),
    refreshToken: builder.mutation<RefreshTokenResponse, { refreshToken: string }>({
      query: (data) => ({
        url: '/auth/refresh-token',
        method: 'POST',
        body: { refreshToken: data.refreshToken },
      }),
      transformResponse: (response: RefreshTokenResponse) => response,
    }),
    register: builder.mutation<User, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      transformResponse: (response: User) => response,
    }),
    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/current',
      providesTags: ['Auth'],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      transformResponse: () => {
        // baseApi already unwraps the response, so just return void
        return undefined;
      },
      invalidatesTags: ['Auth'],
    }),
    changePassword: builder.mutation<void, { oldPassword: string; newPassword: string; confirmPassword: string }>({
      query: (data) => ({
        url: '/users/change-password',
        method: 'POST',
        body: data,
      }),
      // Only invalidate Auth tag after successful password change
      // This won't trigger automatic queries - it just marks cache as stale
      invalidatesTags: ['Auth'],
    }),
    forgotPassword: builder.mutation<void, { username: string }>({
      query: (data) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),
    resetPassword: builder.mutation<void, { token?: string; otp?: string; newPassword: string; confirmPassword: string }>({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetCurrentUserQuery,
  useLogoutMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useRefreshTokenMutation,
} = authApi;



import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { API_BASE_URL } from '../../utils/constants';
import { storageService } from '../../services/storage.service';

// Backend response wrapper type
interface BackendResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Custom base query that unwraps the backend response
// Uses JWT tokens for authentication with automatic refresh on 401
const customBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const baseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: async (headers) => {
      // Include access token in Authorization header
      const token = await storageService.getAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  });

  try {
    const result = await baseQuery(args, api, extraOptions);
    
    // Handle HTTP error status codes (4xx, 5xx)
    if (result.error) {
      const error = result.error as any;
      
      // Handle 401 Unauthorized - try to refresh token
      if (error.status === 401) {
        // Skip refresh for auth endpoints to avoid infinite loop
        const url = typeof args === 'string' ? args : args.url;
        if (url && (url.includes('/auth/login') || url.includes('/auth/refresh-token'))) {
          const errorData = error.data as any;
          const errorMessage = errorData?.message
            || (typeof errorData === 'string' ? errorData : '')
            || 'Invalid username or password';
          return {
            ...result,
            error: {
              ...error,
              data: {
                message: errorMessage,
                status: error.status,
              },
            },
          };
        }
        
        try {
          // Attempt to refresh the token
          const refreshToken = await storageService.getRefreshToken();
          if (!refreshToken) {
            // No refresh token, clear auth and return error
            await storageService.clearAuth();
            return result;
          }
          
          // Call refresh token endpoint
          const refreshResult = await baseQuery(
            {
              url: '/auth/refresh-token',
              method: 'POST',
              body: { refreshToken },
            },
            api,
            extraOptions
          );
          
          if (refreshResult.data && !refreshResult.error) {
            // The response is already unwrapped by our custom baseQuery
            const refreshData = refreshResult.data as any;
            const newAccessToken = refreshData.accessToken;
            const newRefreshToken = refreshData.refreshToken;
            
            // Save new tokens
            if (newAccessToken) {
              await storageService.setAuthToken(newAccessToken);
            }
            if (newRefreshToken) {
              await storageService.setRefreshToken(newRefreshToken);
            }
            
            // Retry the original request with new access token
            // Update headers with new token
            const retryResult = await baseQuery(args, api, extraOptions);
            return retryResult;
          } else {
            // Refresh failed, clear auth and return original error
            await storageService.clearAuth();
            return result;
          }
        } catch (refreshError) {
          // Refresh failed, clear auth and return original error
          await storageService.clearAuth();
          return result;
        }
      }
      
      // Handle 403 Forbidden - Check for inactive account
      if (error.status === 403) {
        const errorMessage = (error.data as any)?.message || error.error || 'Access denied';
        const isInactiveError = errorMessage.toLowerCase().includes('account is inactive') ||
                                errorMessage.toLowerCase().includes('inactive') ||
                                errorMessage.toLowerCase().includes('deactivated');
        
        if (isInactiveError) {
          const { storageService } = require('../../services/storage.service');
          const storedUser = await storageService.getUserData();
          if (storedUser?.role === 'seller') {
            const { navigationRef } = require('../../navigation/navigationRef');
            if (navigationRef.isReady()) {
              navigationRef.navigate('AccountInactive' as never);
            }
          }
        }
      }
      
      // Check for HTTP error status codes
      if (error.status && typeof error.status === 'number' && error.status >= 400) {
        // Try to extract error message from response body
        let errorMessage = 'An error occurred';
        if (error.data) {
          const errorData = error.data as any;
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData.success === false && errorData.message) {
            errorMessage = errorData.message;
          }
        }
        
        return {
          ...result,
          error: {
            ...error,
            status: error.status,
            data: {
              message: errorMessage,
              status: error.status,
            },
          },
        };
      }
      
      // Check for network errors
      if (error.status === 'FETCH_ERROR' || error.status === 'PARSING_ERROR') {
        // Enhance error message for connection refused
        if (error.error?.message?.includes('Failed to fetch') || 
            error.error?.message?.includes('ERR_CONNECTION_REFUSED') ||
            error.error?.message?.includes('NetworkError')) {
          return {
            ...result,
            error: {
              ...error,
              data: {
                message: `Cannot connect to server at ${API_BASE_URL}. Please ensure the backend server is running on port 8080.`,
                code: 'CONNECTION_REFUSED',
              },
            },
          };
        }
      }
    }
    
    // Unwrap the backend response format only for successful responses
    if (result.data && !result.error) {
      const backendResponse = result.data as BackendResponse<any>;
      if (backendResponse.success !== undefined) {
        // Check if backend returned success=false (should be treated as error)
        if (backendResponse.success === false) {
          return {
            ...result,
            error: {
              status: 'CUSTOM_ERROR',
              data: {
                message: backendResponse.message || 'An error occurred',
                status: 400, // Treat as bad request
              },
            },
            data: undefined,
          };
        }
        // This is a wrapped successful response, unwrap it
        result.data = backendResponse.data;
      }
    }
    
    return result;
  } catch (error: any) {
    // Handle connection errors
    if (error?.message?.includes('Failed to fetch') || 
        error?.message?.includes('ERR_CONNECTION_REFUSED') ||
        error?.name === 'TypeError') {
      return {
        error: {
          status: 'FETCH_ERROR',
          data: {
            message: `Cannot connect to server at ${API_BASE_URL}. Please ensure the backend server is running on port 8080.`,
            code: 'CONNECTION_REFUSED',
          },
        },
      } as any;
    }
    throw error;
  }
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: customBaseQuery,
  tagTypes: ['Auth', 'User', 'Menu', 'Order', 'Notification', 'BuyerNotification', 'Settings', 'PlatformAdmin', 'Shop', 'BuyerAccount'],
  endpoints: () => ({}),
});



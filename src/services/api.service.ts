import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_BASE_URL, API_TIMEOUT, ERROR_MESSAGES } from '../utils/constants';
import { storageService } from './storage.service';
import { ApiResponse, ApiError } from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // ✅ AUTHENTICATION ENABLED - Auth tokens required for API calls
    const DISABLE_AUTH = false; // Set to true to disable authentication
    
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        if (!DISABLE_AUTH) {
          const token = await storageService.getAuthToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse>) => {
        const apiError: ApiError = {
          message: ERROR_MESSAGES.UNKNOWN_ERROR,
          status: error.response?.status,
        };

        if (error.response) {
          // Server responded with error
          switch (error.response.status) {
            case 401:
              apiError.message = ERROR_MESSAGES.UNAUTHORIZED;
              if (!DISABLE_AUTH) {
                await storageService.clearAuth();
              }
              // Navigate to login (handled by navigation service)
              break;
            case 403:
              // Check if it's an inactive account error
              const errorMessage = error.response.data?.message || ERROR_MESSAGES.UNKNOWN_ERROR;
              const isInactiveError = errorMessage.toLowerCase().includes('account is inactive') ||
                                     errorMessage.toLowerCase().includes('inactive') ||
                                     errorMessage.toLowerCase().includes('deactivated');
              
              if (isInactiveError) {
                // Account is inactive - redirect to inactive screen
                const { navigationRef } = require('../navigation/navigationRef');
                if (navigationRef.isReady()) {
                  navigationRef.navigate('AccountInactive' as never);
                }
              }
              apiError.message = errorMessage;
              break;
            case 404:
              apiError.message = ERROR_MESSAGES.NOT_FOUND;
              break;
            case 400:
              apiError.message = error.response.data?.message || ERROR_MESSAGES.VALIDATION_ERROR;
              break;
            case 500:
              apiError.message = ERROR_MESSAGES.SERVER_ERROR;
              break;
            default:
              apiError.message = error.response.data?.message || ERROR_MESSAGES.UNKNOWN_ERROR;
          }
        } else if (error.request) {
          // Request made but no response
          apiError.message = ERROR_MESSAGES.NETWORK_ERROR;
        }

        return Promise.reject(apiError);
      }
    );
  }

  // Generic request methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.api.get(url, config);
    return response.data.data || (response.data as any);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.api.post(url, data, config);
    return response.data.data || (response.data as any);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.api.put(url, data, config);
    return response.data.data || (response.data as any);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.api.delete(url, config);
    return response.data.data || (response.data as any);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.api.patch(url, data, config);
    return response.data.data || (response.data as any);
  }

  // Upload file
  async uploadFile<T>(url: string, file: FormData, onProgress?: (progress: number) => void): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.api.post(url, file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data.data || (response.data as any);
  }

  // Set auth token
  setAuthToken(token: string) {
    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Clear auth token
  clearAuthToken() {
    delete this.api.defaults.headers.common['Authorization'];
  }

  // Get base URL for debugging
  getBaseUrl() {
    return API_BASE_URL;
  }

  // Get axios instance for debugging
  getInstance() {
    return this.api;
  }
}

export const apiService = new ApiService();


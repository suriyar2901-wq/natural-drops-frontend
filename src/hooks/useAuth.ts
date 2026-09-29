import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { setCredentials, logout as logoutAction, setLoading } from '../store/slices/authSlice';
import { clearCart } from '../store/slices/cartSlice';
import { storageService } from '../services/storage.service';
import { apiService } from '../services/api.service';
import { useLoginMutation, useRegisterMutation, useLogoutMutation, LoginResponse } from '../store/api/authApi';
import { baseApi } from '../store/api/baseApi';
import { LoginRequest, RegisterRequest, User, UserRole } from '../types';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((state: RootState) => state.auth);
  
  const [loginMutation, { isLoading: isLoggingIn }] = useLoginMutation();
  const [registerMutation, { isLoading: isRegistering }] = useRegisterMutation();
  const [logoutMutation] = useLogoutMutation();

  const login = async (credentials: LoginRequest) => {
    try {
      console.log('🔐 Login attempt started with:', { username: credentials.username });
      console.log('📡 API Base URL:', apiService.getBaseUrl());
      
      const loginResponse: LoginResponse = await loginMutation(credentials).unwrap();
      console.log('✅ Login response received:', { 
        hasAccessToken: !!loginResponse.accessToken,
        hasRefreshToken: !!loginResponse.refreshToken,
        user: loginResponse.user 
      });
      
      // Save tokens to storage
      if (loginResponse.accessToken) {
        await storageService.setAuthToken(loginResponse.accessToken);
        apiService.setAuthToken(loginResponse.accessToken);
      }
      if (loginResponse.refreshToken) {
        await storageService.setRefreshToken(loginResponse.refreshToken);
      }
      
      // CRITICAL: Clear old cached user data first to ensure fresh status
      await storageService.removeUserData();
      
      // Save fresh user data to storage (with latest isActive status from backend)
      await storageService.setUserData(loginResponse.user);
      console.log('💾 Tokens and user data saved to storage');
      console.log('👤 User status from backend:', {
        username: loginResponse.user.username,
        role: loginResponse.user.role,
        isActive: loginResponse.user.isActive,
        status: loginResponse.user.status,
      });
      
      // Update Redux state with user and access token
      dispatch(setCredentials({ user: loginResponse.user, token: loginResponse.accessToken }));
      console.log('🏪 Redux state updated');
      
      return { success: true, user: loginResponse.user };
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        data: error.data,
        status: error.status,
        code: error.data?.code,
      });
      
      // Handle connection errors with better messages
      if (error.status === 'FETCH_ERROR' || error.data?.code === 'CONNECTION_REFUSED') {
        return { 
          success: false, 
          error: error.data?.message || 'Cannot connect to server. Please ensure the backend server is running on port 8080.',
          isAccountStatusError: false,
        };
      }

      if (error.status === 401) {
        return {
          success: false,
          error: error.data?.message || 'Invalid username or password',
          isAccountStatusError: false,
          errorCode: 'INVALID_CREDENTIALS',
        };
      }
      
      // Check if it's an account status error (403 Forbidden with account status message)
      const errorMessage = error.data?.message || error.message || 'Login failed';
      const isInactiveError = error.status === 403 && (
        errorMessage.toLowerCase().includes('account is inactive') ||
        errorMessage.toLowerCase().includes('inactive') ||
        errorMessage.toLowerCase().includes('deactivated')
      );
      const isAccountStatusError = error.status === 403 && (
        errorMessage.includes('pending admin approval') ||
        errorMessage.includes('account access is restricted') ||
        errorMessage.includes('account is inactive') ||
        errorMessage.includes('inactive') ||
        errorMessage.includes('contact Customer Service') ||
        errorMessage.includes('contact customer support')
      );
      
      return { 
        success: false, 
        error: errorMessage,
        isAccountStatusError,
        errorCode: isInactiveError ? 'INACTIVE' : (isAccountStatusError ? 'ACCOUNT_STATUS' : undefined),
      };
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const user = await registerMutation(userData).unwrap();
      return { success: true, user };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, error: error.data?.message || error.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    console.log('🚪 useAuth.logout() called');
    try {
      // Step 1: Call backend logout API
      try {
        console.log('🔄 Calling logout mutation...');
        console.log('📡 Logout mutation type:', typeof logoutMutation);
        
        // RTK Query mutations: for void mutations, call with undefined
        // The mutation returns an object with unwrap() method
        console.log('📡 Invoking logoutMutation(undefined)...');
        const mutationResult = logoutMutation(undefined);
        console.log('📡 Mutation result type:', typeof mutationResult);
        console.log('📡 Mutation result:', mutationResult);
        console.log('📡 Has unwrap:', typeof mutationResult?.unwrap === 'function');
        
        if (mutationResult && typeof mutationResult.unwrap === 'function') {
          console.log('📡 Awaiting mutation unwrap...');
          const result = await mutationResult.unwrap();
          console.log('✅ Logout API call successful, result:', result);
        } else {
          console.warn('⚠️ Mutation result does not have unwrap method');
          console.warn('⚠️ Mutation result:', JSON.stringify(mutationResult, null, 2));
        }
      } catch (apiError: any) {
        // Continue with local logout even if API call fails
        // Log error for debugging but don't block logout
        console.error('❌ Logout API call failed:', apiError);
        console.error('❌ Error details:', {
          status: apiError?.status,
          statusCode: apiError?.statusCode,
          data: apiError?.data,
          message: apiError?.message,
          error: apiError?.error,
        });
      }
      
      // Step 2: Clear all storage (always do this, even if API fails)
      try {
        await storageService.clearAuth(); // This clears both access and refresh tokens
        await storageService.removeCartData();
        apiService.clearAuthToken();
      } catch (storageError) {
        console.error('Error clearing storage:', storageError);
        // Continue anyway
      }
      
      // Step 3: Clear Redux state (always do this)
      try {
        dispatch(logoutAction());
        dispatch(clearCart());
      } catch (reduxError) {
        console.error('Error clearing Redux state:', reduxError);
        // Continue anyway
      }
      
      // Step 4: Reset RTK Query cache to clear all API data
      try {
        dispatch(baseApi.util.resetApiState());
      } catch (cacheError) {
        console.error('Error clearing RTK Query cache:', cacheError);
        // Continue anyway
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Logout failed:', error);
      
      // Still try to clear local state even if something went wrong
      try {
        await storageService.clearAuth(); // This clears both access and refresh tokens
        await storageService.removeCartData();
        apiService.clearAuthToken();
        dispatch(logoutAction());
        dispatch(clearCart());
        dispatch(baseApi.util.resetApiState());
      } catch (e) {
        console.error('Failed to clear state on error:', e);
      }
      
      return { 
        success: false, 
        error: error?.message || 'Logout failed. Please try again.' 
      };
    }
  };

  const checkAuth = async () => {
    try {
      dispatch(setLoading(true));
      
      const userData = await storageService.getUserData();
      const accessToken = await storageService.getAuthToken();
      const refreshToken = await storageService.getRefreshToken();
      
      if (userData && accessToken) {
        // CRITICAL: Check if user account is active
        // Admin always has full access regardless of isActive status
        // Only Seller and Buyer accounts are subject to isActive check
        // Handle undefined/null as ACTIVE for backward compatibility, only false means inactive
        const isActiveValue = userData.isActive;
        // Treat undefined, null, or true as active. Only explicit false means inactive.
        const isActiveBoolean = isActiveValue !== false;
        const isInactive = (userData.role === 'seller' || userData.role === 'buyer') && !isActiveBoolean;
        
        if (isInactive) {
          // User is inactive (Seller/Buyer only) - clear auth and redirect to inactive screen
          console.log('⚠️ User account is inactive on app startup:', {
            username: userData.username,
            role: userData.role,
            isActive: userData.isActive,
            isActiveValue,
            isActiveBoolean,
          });
          await storageService.clearAuth();
          dispatch(setLoading(false));
          
          // Navigate to inactive screen
          const { navigationRef } = require('../navigation/navigationRef');
          if (navigationRef.isReady()) {
            navigationRef.navigate('AccountInactive' as never);
          }
          return;
        }
        
        // Admin always proceeds, active Seller/Buyer proceed
        console.log('✅ User account is active on app startup:', {
          username: userData.username,
          role: userData.role,
          isActive: userData.isActive,
        });
        apiService.setAuthToken(accessToken);
        dispatch(setCredentials({ user: userData, token: accessToken }));
      } else if (userData && refreshToken) {
        // If we have refresh token but no access token, try to refresh
        // This will be handled by the baseApi interceptor on next API call
        dispatch(setCredentials({ user: userData, token: undefined }));
      } else {
        // No tokens or user data, clear everything
        await storageService.clearAuth();
        dispatch(setLoading(false));
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      await storageService.clearAuth();
      dispatch(setLoading(false));
    }
  };

  const isBuyer = (): boolean => {
    return auth.user?.role === UserRole.BUYER;
  };

  const isAdmin = (): boolean => {
    return auth.user?.role === UserRole.ADMIN || auth.user?.role === UserRole.SELLER;
  };

  const isStrictAdmin = (): boolean => {
    return auth.user?.role === UserRole.ADMIN;
  };

  const isSeller = (): boolean => {
    return auth.user?.role === UserRole.SELLER;
  };

  return {
    user: auth.user,
    token: auth.token,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading || isLoggingIn || isRegistering,
    login,
    register,
    logout,
    checkAuth,
    isBuyer,
    isAdmin,
    isStrictAdmin,
    isSeller,
  };
};


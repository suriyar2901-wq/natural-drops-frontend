// API Configuration
// Auto-detect platform: Use localhost for web, network IP for mobile
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Environment variable support (preferred for Vercel/Render)
// Expo uses EXPO_PUBLIC_ prefix to expose variables to client code.
const ENV_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// Fallback if Expo host cannot be detected (update when your LAN IP changes)
const MOBILE_API_IP = '192.168.30.159';

/** LAN IP from Expo Go / Metro (e.g. 192.168.x.x:8081). Null for tunnel / localhost. */
const getExpoLanHost = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } }).manifest2?.extra
      ?.expoGo?.debuggerHost ||
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost ||
    '';
  if (!hostUri || typeof hostUri !== 'string') return null;
  const host = hostUri.split(':')[0]?.trim();
  if (!host || host === '127.0.0.1' || host === 'localhost') return null;
  // Tunnel URLs cannot reach a laptop-only Spring Boot on :8080
  if (host.includes('exp.direct') || host.includes('exp.host') || host.includes('ngrok')) {
    return null;
  }
  return host;
};

const getApiBaseUrl = () => {
  // Prefer environment variable (Render/Vercel/production)
  if (ENV_API_BASE_URL && ENV_API_BASE_URL.trim().length > 0) {
    return ENV_API_BASE_URL.trim();
  }

  // For web browser testing (localhost)
  if (Platform.OS === 'web') {
    return 'http://localhost:8080/api';
  }

  // Prefer same LAN host Expo Metro uses (works with `expo start --host lan`)
  const lanHost = getExpoLanHost();
  return `http://${lanHost || MOBILE_API_IP}:8080/api`;
};

export const API_BASE_URL = getApiBaseUrl();
export const API_TIMEOUT = 30000;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  REFRESH_TOKEN: '@refresh_token',
  USER_DATA: '@user_data',
  CART_DATA: '@cart_data',
  SETTINGS: '@settings',
  THEME: '@theme',
  REMEMBER_ME: '@remember_me',
};

// App Configuration
export const APP_CONFIG = {
  appName: 'Natural Drops',
  appVersion: '1.0.0',
  supportEmail: 'support@naturaldrops.com',
  supportPhone: '+91 1234567890',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
};

// Order Status Colors
export const ORDER_STATUS_COLORS = {
  PENDING: '#FF9800',
  CONFIRMED: '#2196F3',
  PROCESSING: '#9C27B0',
  OUT_FOR_DELIVERY: '#FF5722',
  DELIVERED: '#4CAF50',
  CANCELLED: '#F44336',
};

// Payment Methods
export const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', icon: 'qr-code' },
  { id: 'card', label: 'Credit/Debit Card', icon: 'credit-card' },
  { id: 'cod', label: 'Cash on Delivery', icon: 'money' },
];

// Categories
export const CATEGORIES = [
  { id: 'WATER', label: 'Water', icon: 'water' },
  { id: 'BEVERAGES', label: 'Beverages', icon: 'local-drink' },
];

// Roles
export const ROLES = {
  BUYER: 'BUYER',
  ADMIN: 'ADMIN',
  SELLER: 'SELLER',
};

// Validation Rules
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 50,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 30,
  PHONE_LENGTH: 10,
  MIN_ORDER_AMOUNT: 50,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'Session expired. Please login again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'Resource not found.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  REGISTER_SUCCESS: 'Registration successful!',
  ORDER_PLACED: 'Order placed successfully!',
  ORDER_UPDATED: 'Order updated successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  ITEM_ADDED: 'Item added to cart!',
  ITEM_REMOVED: 'Item removed from cart!',
};

// Notification Types
export const NOTIFICATION_TYPES = {
  ORDER: 'ORDER',
  PAYMENT: 'PAYMENT',
  SYSTEM: 'SYSTEM',
  PROMOTIONAL: 'PROMOTIONAL',
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY hh:mm A',
  API: 'YYYY-MM-DD',
};


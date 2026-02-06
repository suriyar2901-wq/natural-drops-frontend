/**
 * Toast Notification Utility
 * Cross-platform toast messages for React Native
 * Uses react-native-toast-message if available, falls back to Alert
 */

import { Platform, Alert } from 'react-native';

// Try to import react-native-toast-message, but don't fail if it's not installed
let Toast: any = null;
try {
  Toast = require('react-native-toast-message').default;
} catch (e) {
  // react-native-toast-message not installed, will use Alert fallback
}

export interface ToastOptions {
  duration?: number;
  position?: 'top' | 'bottom' | 'center';
}

/**
 * Show a toast message
 * Uses react-native-toast-message if available, otherwise falls back to Alert
 */
export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (Toast) {
    // Use react-native-toast-message if available
    Toast.show({
      type: type,
      text1: type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info',
      text2: message,
      position: 'top',
      visibilityTime: 4000,
    });
  } else {
    // Fallback to Alert if react-native-toast-message is not available
    Alert.alert(
      type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info',
      message,
      [{ text: 'OK' }]
    );
  }
};

export const showSuccessToast = (message: string) => {
  showToast(message, 'success');
};

export const showErrorToast = (message: string) => {
  showToast(message, 'error');
};

export const showInfoToast = (message: string) => {
  showToast(message, 'info');
};


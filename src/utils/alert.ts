import { Alert, Platform } from 'react-native';

/**
 * Wrapper for Alert.alert that suppresses React Native Web accessibility warnings
 * The aria-hidden warning is a known issue with React Native Web's Alert implementation
 * and doesn't affect functionality. This is a framework-level issue that we can't fix directly.
 */
export const showAlert = (
  title: string,
  message?: string,
  buttons?: Array<{
    text?: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>,
  options?: {
    cancelable?: boolean;
    onDismiss?: () => void;
  }
) => {
  // Suppress the specific aria-hidden warning on web
  if (Platform.OS === 'web') {
    const originalWarn = console.warn;
    
    // Temporarily suppress only the specific aria-hidden warning
    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      // Only suppress the exact warning we're seeing
      if (
        message.includes('Blocked aria-hidden') &&
        message.includes('descendant retained focus') &&
        message.includes('The focus must not be hidden')
      ) {
        return; // Suppress this specific warning
      }
      // Allow all other warnings through
      originalWarn.apply(console, args);
    };
    
    // Show the alert
    Alert.alert(title, message, buttons, options);
    
    // Restore console after alert is shown
    setTimeout(() => {
      console.warn = originalWarn;
    }, 500);
  } else {
    // On native platforms, use Alert normally
    Alert.alert(title, message, buttons, options);
  }
};

/**
 * Show a success alert
 */
export const showSuccessAlert = (message: string, onPress?: () => void) => {
  showAlert('Success', message, [{ text: 'OK', onPress }]);
};

/**
 * Show an error alert
 */
export const showErrorAlert = (message: string, onPress?: () => void) => {
  showAlert('Error', message, [{ text: 'OK', onPress }]);
};

/**
 * Show a confirmation alert
 * Uses window.confirm for web platform to ensure callbacks work properly
 */
export const showConfirmAlert = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  console.log('🔔 showConfirmAlert called:', { title, message, platform: Platform.OS });
  
  // For web, use window.confirm as Alert.alert onPress callbacks don't work reliably
  if (Platform.OS === 'web') {
    const fullMessage = `${title}\n\n${message}`;
    const confirmed = (window as any).confirm(fullMessage);
    if (confirmed) {
      console.log('🔔 Web confirm: User confirmed');
      onConfirm();
    } else {
      console.log('🔔 Web confirm: User cancelled');
      if (onCancel) onCancel();
    }
    return;
  }
  
  // For native platforms, use Alert.alert
  showAlert(
    title,
    message,
    [
      { 
        text: 'Cancel', 
        style: 'cancel', 
        onPress: () => {
          console.log('🔔 Alert: Cancel button pressed');
          if (onCancel) onCancel();
        }
      },
      { 
        text: 'Confirm', 
        onPress: () => {
          console.log('🔔 Alert: Confirm button pressed');
          onConfirm();
        }
      },
    ]
  );
};


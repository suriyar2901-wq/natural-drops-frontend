import { Alert, Platform } from 'react-native';
import { showAppDialog } from '../components/common/AppDialog';

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
  if (Platform.OS === 'web') {
    showAppDialog(title, message, buttons);
    return;
  }
  Alert.alert(title, message, buttons, options);
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
 * Show a confirmation alert inside the app.
 */
export const showConfirmAlert = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
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


import React from 'react';
import { Alert, Platform, StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import { AppNavigator } from './src/navigation';
import { ErrorBoundary, Loading } from './src/components/common';
import { AppDialogHost, showAppDialog } from './src/components/common/AppDialog';
import { colors } from './src/theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

if (Platform.OS === 'web') {
  Alert.alert = ((title: string, message?: string, buttons?: Array<{ text?: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>) => {
    showAppDialog(String(title || 'Message'), message, buttons);
  }) as typeof Alert.alert;

  // Keep the app full screen so Login and other pages stay visible.
  // Long screens scroll inside their own area instead of collapsing the page.
  if (typeof document !== 'undefined') {
    const style = document.getElementById('app-phone-scroll') || document.createElement('style');
    style.id = 'app-phone-scroll';
    style.textContent = `
      html, body, #root {
        height: 100% !important;
        min-height: 100% !important;
      }
      body {
        overflow: hidden !important;
      }
      #root {
        display: flex;
        flex: 1 1 auto;
        min-height: 0;
      }
      #root > div {
        flex: 1 1 auto;
        min-height: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
    `;
    if (!style.parentNode) {
      document.head.appendChild(style);
    }
  }
}

// Try to import Toast component, but don't fail if not installed
let Toast: any = null;
try {
  Toast = require('react-native-toast-message').default;
} catch (e) {
  // react-native-toast-message not installed, will use Alert fallback
}

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, height: '100%' }}>
        <Provider store={store}>
          <PersistGate loading={<Loading fullScreen />} persistor={persistor}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
            <AppNavigator />
            <AppDialogHost />
            {Toast && <Toast />}
          </PersistGate>
        </Provider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

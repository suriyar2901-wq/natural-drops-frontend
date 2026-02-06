import React from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import { AppNavigator } from './src/navigation';
import { ErrorBoundary, Loading } from './src/components/common';
import { colors } from './src/theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <PersistGate loading={<Loading fullScreen />} persistor={persistor}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
            <AppNavigator />
            {Toast && <Toast />}
          </PersistGate>
        </Provider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

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
    const font = document.getElementById('neo-space-grotesk') || document.createElement('link');
    font.id = 'neo-space-grotesk';
    font.setAttribute('rel', 'stylesheet');
    font.setAttribute('href', 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
    if (!font.parentNode) {
      document.head.appendChild(font);
    }
    style.textContent = `
      html, body, #root, button, input, textarea {
        font-family: "Space Grotesk", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      html, body, #root {
        height: 100% !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow: hidden !important;
        background: #F4F5F6;
      }
      button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible, [role="button"]:focus-visible {
        outline: 2px solid #0232AA;
        outline-offset: 2px;
      }
      @media (prefers-reduced-motion: reduce) {
        html * {
          animation-duration: 0.01ms !important;
          transition-duration: 0.01ms !important;
        }
      }
      #root, #root > div {
        display: flex !important;
        flex: 1 1 auto !important;
        flex-direction: column !important;
        min-height: 0 !important;
        min-width: 0 !important;
        height: 100% !important;
        max-width: 100% !important;
      }
    `;
    const calmScrollbars = () => {
      Array.from(document.styleSheets).forEach((sheet) => {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch (_error) {
          return;
        }
        Array.from(rules).forEach((rule) => {
          if (!(rule instanceof CSSStyleRule)) return;
          if ((rule.style.transform || '').includes('translateZ')) {
            rule.style.setProperty('transform', 'none');
          }
        });
      });
    };
    calmScrollbars();
    window.setTimeout(calmScrollbars, 400);
    window.setTimeout(calmScrollbars, 1500);
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

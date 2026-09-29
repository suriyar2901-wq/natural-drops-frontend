import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, Modal, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { Button, Input, CustomerServiceModal } from '../../components/common';
import { useAuth } from '../../hooks';
import { validators } from '../../utils/validators';

// Natural Drops logo for login screen
// Using require() for React Native compatibility (works on both web and native)
const logoAsset = require('../../../assets/logo.png');

/**
 * Extract valid image URL from require() result for web platform
 * 
 * WHY THIS FUNCTION EXISTS:
 * React Native Web's require() for images can return different formats:
 * - A string URL (direct) - most common case
 * - An object with .default property (ES6 module)
 * - An object with .uri property (React Native asset)
 * - An object with .src property (some bundlers)
 * 
 * The <img src> attribute REQUIRES a string URL, not an object.
 * This function safely extracts the string URL from any of these formats.
 * 
 * This ensures:
 * 1. No "Object" passed to img src (which causes loading errors)
 * 2. Proper fallback handling if URL extraction fails
 * 3. Works with different bundler configurations (Webpack, Metro, etc.)
 */
const getLogoUrl = (): string => {
  if (Platform.OS !== 'web') {
    // For native platforms, return as-is (React Native Image component handles it)
    return logoAsset as any;
  }

  // Case 1: Already a string (most common on web)
  if (typeof logoAsset === 'string') {
    // Validate it's a valid URL format
    if (logoAsset.startsWith('http') || logoAsset.startsWith('/') || logoAsset.startsWith('data:')) {
      return logoAsset;
    }
    // Even if it doesn't start with http, return it (might be relative path)
    return logoAsset;
  }

  // Case 2: Object with properties (ES6 module or React Native asset)
  if (typeof logoAsset === 'object' && logoAsset !== null) {
    // Try .default first (ES6 module default export)
    if ((logoAsset as any).default) {
      const defaultVal = (logoAsset as any).default;
      if (typeof defaultVal === 'string') {
        return defaultVal;
      }
      // If default is also an object, try to extract from it
      if (typeof defaultVal === 'object' && defaultVal !== null) {
        const nestedUrl = defaultVal.uri || defaultVal.src || defaultVal.default;
        if (typeof nestedUrl === 'string') {
          return nestedUrl;
        }
      }
    }
    
    // Try .uri (React Native asset format)
    if ((logoAsset as any).uri && typeof (logoAsset as any).uri === 'string') {
      return (logoAsset as any).uri;
    }
    
    // Try .src (some bundler formats)
    if ((logoAsset as any).src && typeof (logoAsset as any).src === 'string') {
      return (logoAsset as any).src;
    }
    
    // Try accessing as array (some bundlers return [url])
    if (Array.isArray(logoAsset) && logoAsset.length > 0 && typeof logoAsset[0] === 'string') {
      return logoAsset[0];
    }
  }

  // Fallback: Convert to string (last resort - may not work but prevents crash)
  console.warn('⚠️ [LoginScreen] Could not extract logo URL from require() result');
  console.warn('   Logo asset type:', typeof logoAsset);
  console.warn('   Logo asset:', logoAsset);
  const fallback = String(logoAsset);
  // If the string conversion results in "[object Object]", it's not useful
  if (fallback === '[object Object]') {
    console.error('❌ [LoginScreen] Logo asset could not be converted to URL string');
    return ''; // Return empty string to trigger fallback text
  }
  return fallback;
};

export const LoginScreen = ({ navigation }: any) => {
  // IMMEDIATE LOG - This will definitely show when component renders
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔵 [LoginScreen] Component function called - RENDERING');
  console.log('═══════════════════════════════════════════════════════');
  
  // Get logo URL - always a string for web, asset reference for native
  const logoSource = Platform.OS === 'web' ? getLogoUrl() : logoAsset;
  
  // State for image loading error (for fallback text)
  const [logoError, setLogoError] = useState(false);
  
  if (Platform.OS === 'web') {
    console.log('🖼️ [LoginScreen] Web platform - Logo source type:', typeof logoSource);
    console.log('🖼️ [LoginScreen] Web platform - Logo source:', logoSource);
    // Validate logo source is a string
    if (typeof logoSource !== 'string') {
      console.warn('⚠️ [LoginScreen] Logo source is not a string:', logoSource);
    }
  }
  
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [localLoading, setLocalLoading] = useState(false);
  const [showCustomerServiceModal, setShowCustomerServiceModal] = useState(false);
  const [accountStatusMessage, setAccountStatusMessage] = useState('');
  const [errorPopup, setErrorPopup] = useState<{ title: string; message: string } | null>(null);

  const showErrorPopup = (title: string, message: string) => {
    setErrorPopup({ title, message });
  };

  // CSS styles for logo wrapper - injected for web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'login-logo-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .login-logo-wrapper {
            width: 100%;
            height: 160px;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .login-logo-wrapper img {
            max-width: 120px;
            max-height: 120px;
            width: auto;
            height: auto;
            object-fit: contain;
          }

          @media (max-width: 768px) {
            .login-logo-wrapper {
              height: 120px;
            }

            .login-logo-wrapper img {
              max-width: 100px;
              max-height: 100px;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Debug: Log component render state - Use multiple console methods
  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔄 [LoginScreen] useEffect triggered - Component mounted/updated');
    console.log('   isLoading (from hook):', isLoading);
    console.log('   localLoading (local state):', localLoading);
    console.log('   Platform:', Platform.OS);
    console.log('   Timestamp:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════════');
    
    // Also use console.info and console.warn to ensure visibility
    console.info('ℹ️ [LoginScreen] Component state:', { isLoading, localLoading, platform: Platform.OS });
  }, [isLoading, localLoading]);
  
  // Log on every render (not just when dependencies change) - Use table for better visibility
  if (__DEV__) {
    console.table({
      'Component': 'LoginScreen',
      'Username': username ? `${username.substring(0, 3)}***` : '(empty)',
      'Password Length': password.length,
      'Has Errors': Object.keys(errors).length > 0,
      'Local Loading': localLoading,
      'Hook Loading': isLoading,
      'Platform': Platform.OS,
    });
  }
  
  // Override stuck loading state - use local state instead
  const actualLoading = localLoading;

  const validate = () => {
    console.log('🔍 [LoginScreen] Starting validation...');
    const newErrors: { username?: string; password?: string } = {};

    if (!validators.required(username)) {
      console.log('   ❌ Username validation failed');
      newErrors.username = 'Username is required';
    } else {
      console.log('   ✅ Username validation passed');
    }

    if (!validators.required(password)) {
      console.log('   ❌ Password required validation failed');
      newErrors.password = 'Password is required';
    } else {
      console.log('   ✅ Password validation passed');
    }

    const isValid = Object.keys(newErrors).length === 0;
    console.log('🔍 [LoginScreen] Validation result:', isValid ? '✅ PASSED' : '❌ FAILED');
    console.log('   Errors:', newErrors);
    
    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎯 [LoginScreen] ===== LOGIN BUTTON PRESSED =====');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 [LoginScreen] Form data:', { 
      username, 
      passwordLength: password.length,
      passwordMasked: '***' 
    });
    console.log('📝 [LoginScreen] Current errors:', errors);
    console.log('📝 [LoginScreen] Timestamp:', new Date().toISOString());
    
    // Use multiple console methods
    console.info('ℹ️ [LoginScreen] Login attempt started');
    console.warn('⚠️ [LoginScreen] This is a login attempt - watch for errors');
    
    if (!validate()) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ [LoginScreen] VALIDATION FAILED');
      console.error('   Validation errors:', errors);
      console.error('═══════════════════════════════════════════════════════');
      showErrorPopup('Login Failed', 'Please enter your username and password.');
      return;
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ [LoginScreen] Validation passed, initiating login request...');
    console.log('═══════════════════════════════════════════════════════');
    setLocalLoading(true);
    
    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log('📡 [LoginScreen] Calling login API...');
      console.log('   API endpoint: /api/auth/login');
      console.log('   Username:', username);
      console.log('   Timestamp:', new Date().toISOString());
      console.log('═══════════════════════════════════════════════════════');
      
      const result = await login({ username, password });
      
      console.log('═══════════════════════════════════════════════════════');
      console.log('📊 [LoginScreen] Login API response received');
      console.log('   Success:', result.success);
      console.log('   Has user:', !!result.user);
      console.log('   Error:', result.error || 'None');
      console.log('   Error code:', result.errorCode || 'None');
      console.log('   Is account status error:', result.isAccountStatusError || false);
      console.log('   Full result:', JSON.stringify(result, null, 2));
      console.log('═══════════════════════════════════════════════════════');
      
      if (result.success && result.user) {
        console.log('✅ [LoginScreen] Login successful');
        console.log('👤 [LoginScreen] User account details:', {
          id: result.user.id,
          username: result.user.username,
          role: result.user.role,
          email: result.user.email || 'N/A',
          isActive: result.user.isActive,
          isActiveType: typeof result.user.isActive,
          status: result.user.status || 'N/A',
        });
        
        // CRITICAL: Check if user is active before allowing access
        // Admin always has full access regardless of isActive status
        // Only Seller and Buyer accounts are subject to isActive check
        // Handle undefined/null as ACTIVE for backward compatibility, only false means inactive
        const isActiveValue = result.user.isActive;
        // Treat undefined, null, or true as active. Only explicit false means inactive.
        const isActiveBoolean = isActiveValue !== false;
        const isInactive = result.user.role === 'seller' && !isActiveBoolean;
        
        if (isInactive) {
          // User is inactive (Seller/Buyer only) - redirect to inactive screen
          console.log('⚠️ [LoginScreen] User account is INACTIVE');
          console.log('   Account status details:', {
            isActiveValue,
            isActiveBoolean,
            role: result.user.role,
            isInactive,
          });
          console.log('   Redirecting to AccountInactive screen...');
          navigation.replace('AccountInactive');
          return;
        }
        
        // Admin always proceeds, active Seller/Buyer proceed
        console.log('✅ [LoginScreen] User account is ACTIVE, proceeding to app');
        console.log('   Navigation target:', result.user.role === 'seller' || result.user.role === 'admin' ? 'AdminApp' : 'BuyerApp');
        // Navigate based on role after successful login
        if (result.user.role === 'seller' || result.user.role === 'admin') {
          navigation.replace('AdminApp');
        } else {
          navigation.replace('BuyerApp');
        }
      } else {
        console.log('❌ [LoginScreen] Login failed');
        console.log('   Error message:', result.error);
        console.log('   Error code:', result.errorCode || 'None');
        console.log('   Is account status error:', result.isAccountStatusError || false);
        
        // Check if it's an inactive/deactivated account error - redirect to inactive screen
        // This handles accounts that are DEACTIVE (isActive = false)
        if (result.isAccountStatusError && result.errorCode === 'INACTIVE') {
          console.log('⚠️ [LoginScreen] Account is DEACTIVE (isActive = false)');
          console.log('   Redirecting to AccountInactive screen...');
          navigation.replace('AccountInactive');
          return;
        }
        
        // Check if it's an account status error (pending/rejected/blocked)
        // These show customer service modal with contact options
        if (result.isAccountStatusError) {
          console.log('⚠️ [LoginScreen] Account status error detected');
          console.log('   Showing customer service modal');
          setAccountStatusMessage(result.error || 'Your account access is restricted.');
          setShowCustomerServiceModal(true);
        } else {
          const isInvalidCredentials = result.errorCode === 'INVALID_CREDENTIALS'
            || (result.error || '').toLowerCase().includes('invalid username')
            || (result.error || '').toLowerCase().includes('invalid password');
          const errorMessage = isInvalidCredentials
            ? 'Invalid username or password. Please check your details and try again.'
            : (result.error || 'Please check your credentials');
          const title = errorMessage.includes('connect to server') || errorMessage.includes('backend server')
            ? 'Connection Error'
            : 'Login Failed';
          showErrorPopup(title, errorMessage);
        }
      }
    } catch (error: any) {
      console.error('❌ [LoginScreen] Login exception occurred');
      console.error('   Error type:', error?.constructor?.name || 'Unknown');
      console.error('   Error message:', error?.message || 'No error message');
      console.error('   Error stack:', error?.stack || 'No stack trace');
      console.error('   Full error object:', error);
      showErrorPopup('Login Error', 'An unexpected error occurred. Please try again.');
    } finally {
      console.log('🏁 [LoginScreen] Login process completed, resetting loading state');
      setLocalLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          {Platform.OS === 'web' ? (
            // @ts-ignore - React Native Web supports HTML elements
            <div className="login-logo-wrapper">
              {!logoError && typeof logoSource === 'string' ? (
                // @ts-ignore - React Native Web supports HTML elements
                <img 
                  src={logoSource} 
                  alt="Natural Drops Logo"
                  style={{
                    maxWidth: '120px',
                    maxHeight: '120px',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                  }}
                  onError={(e: any) => {
                    console.error('❌ [LoginScreen] Logo image failed to load');
                    console.error('   Error:', e);
                    console.error('   Logo source type:', typeof logoSource);
                    console.error('   Logo source:', logoSource);
                    console.error('   Logo source length:', logoSource?.length);
                    setLogoError(true);
                  }}
                  onLoad={() => {
                    console.log('✅ [LoginScreen] Logo image loaded successfully');
                    console.log('   Logo source:', logoSource);
                    setLogoError(false);
                  }}
                />
              ) : (
                // Fallback: Show text if image fails to load
                <Text style={styles.logoFallbackText}>Natural Drops</Text>
              )}
            </div>
          ) : (
            <View 
              style={styles.logoWrapper} 
              accessibilityLabel="Natural Drops Logo"
            >
              <Image 
                source={logoAsset} 
                style={styles.logoImage} 
                resizeMode="contain"
                accessibilityLabel="Natural Drops Logo"
                onError={(error: any) => {
                  console.error('❌ [LoginScreen] Logo image failed to load (native)');
                  console.error('   Error:', error);
                  console.error('   Logo source:', logoAsset);
                }}
                onLoad={() => {
                  console.log('✅ [LoginScreen] Logo image loaded successfully (native)');
                  console.log('   Logo source:', logoAsset);
                }}
              />
            </View>
          )}
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to your account</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            autoCapitalize="none"
            error={errors.username}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            showPasswordToggle
            error={errors.password}
          />

          <Button
            title="Forgot Password?"
            onPress={() => navigation.navigate('ForgotPassword')}
            variant="text"
            fullWidth
            style={styles.forgotPasswordButton}
          />

          <Button
            title="Login"
            onPress={() => {
              console.log('🔘 Button clicked! isLoading:', isLoading, 'actualLoading:', actualLoading);
              handleLogin();
            }}
            loading={actualLoading}
            fullWidth
            style={styles.loginButton}
          />
          
          <View style={styles.serverInfo}>
            <Text style={styles.serverInfoText}>
              💡 Make sure the backend server is running on port 8080
            </Text>
          </View>

          <Button
            title="Don't have an account? Register"
            onPress={() => navigation.navigate('Register')}
            variant="text"
            fullWidth
          />
        </View>
      </ScrollView>

      <CustomerServiceModal
        visible={showCustomerServiceModal}
        message={accountStatusMessage}
        onClose={() => setShowCustomerServiceModal(false)}
      />

      <Modal
        visible={!!errorPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorPopup(null)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>{errorPopup?.title || 'Login Failed'}</Text>
            <Text style={styles.popupMessage}>
              {errorPopup?.message || 'Invalid username or password. Please try again.'}
            </Text>
            <TouchableOpacity
              style={styles.popupButton}
              onPress={() => setErrorPopup(null)}
            >
              <Text style={styles.popupButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoWrapper: {
    // Logo with text is wider, so adjust dimensions
    width: 280,
    height: 200,
    marginBottom: spacing.lg,
    backgroundColor: 'transparent', // Transparent background to show logo clearly
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible', // Allow logo to display fully
    alignSelf: 'center', // Center horizontally
    // Responsive sizing for smaller screens
    ...Platform.select({
      web: {
        width: '100%',
        height: 160,
        maxWidth: '100%',
        minHeight: 160,
      },
      default: {
        // Mobile: scale down on very small screens
        maxWidth: 280,
        maxHeight: 200,
        minWidth: 180,
        minHeight: 130,
      },
    }),
  },
  logoWrapperWeb: {
    width: '100%',
    height: 160,
    marginBottom: spacing.lg,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    // Ensure image maintains aspect ratio and fits perfectly inside container
    // Note: resizeMode is set as a prop on Image component, not in style
    ...Platform.select({
      web: {
        maxWidth: 120,
        maxHeight: 120,
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
      } as any,
    }),
  } as any, // Type assertion for web-specific styles (objectFit, display)
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  companyName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  logoFallbackText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  loginButton: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  serverInfo: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: spacing.sm,
    alignItems: 'center',
  },
  serverInfoText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  popupCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    width: '100%',
    maxWidth: 400,
    padding: spacing.lg,
  },
  popupTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  popupMessage: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  popupButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  popupButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});


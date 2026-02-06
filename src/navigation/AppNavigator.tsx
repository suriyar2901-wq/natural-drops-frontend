import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, Linking } from 'react-native';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ChangePasswordScreen } from '../screens/auth/ChangePasswordScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { AccountInactiveScreen } from '../screens/auth/AccountInactiveScreen';

// Buyer Screens
import { HomeScreen } from '../screens/buyer/HomeScreen';
import { CartScreen } from '../screens/buyer/CartScreen';
import { OrdersScreen } from '../screens/buyer/OrdersScreen';
import { ProfileScreen } from '../screens/buyer/ProfileScreen';
import { QRScannerScreen } from '../screens/buyer/QRScannerScreen';
import { OrderDetailScreen } from '../screens/common/OrderDetailScreen';
import { ProductDetailScreen } from '../screens/common/ProductDetailScreen';

// Admin Screens
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { OrderManagementScreen } from '../screens/admin/OrderManagementScreen';
import { MenuManagementScreen } from '../screens/admin/MenuManagementScreen';
import { UserManagementScreen } from '../screens/admin/UserManagementScreen';
import { AppSettingsScreen } from '../screens/admin/AppSettingsScreen';

import { colors, spacing, typography } from '../theme';
import { useAuth } from '../hooks';
import { useGetUnreadAdminNotificationCountQuery } from '../store/api/notificationApi';
import { useGetCustomerContactNumberQuery } from '../store/api/settingsApi';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

import { navigationRef } from './navigationRef';

// Amazon-like App Structure
// Roles: Admin, Seller, Buyer
// - Admin: Full access to dashboard, orders, products, users
// - Seller: Can manage products and orders
// - Buyer: Can shop and place orders

// Header Right Component with Username and Logout
const HeaderRight = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const { data: customerPhone } = useGetCustomerContactNumberQuery();

  const performLogout = async () => {
    console.log('performLogout called');
    try {
      // Step 1: Call logout function (which calls API and clears state)
      console.log('Calling logout function...');
      const logoutResult = await logout();
      console.log('Logout result:', logoutResult);
      
      // Step 2: Wait a moment for state to clear, then navigate
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Step 3: Navigate to Login screen
      console.log('Navigating to login screen...');
      navigateToLogin(navigation);
      
      // Show error message if logout had issues (but still navigate)
      if (!logoutResult.success) {
        // Use setTimeout to show alert after navigation
        setTimeout(() => {
          Alert.alert(
            'Logout Warning',
            logoutResult.error || 'Logout completed with warnings. You have been logged out locally.',
          );
        }, 500);
      }
    } catch (error: any) {
      console.error('Logout error:', error);
      
      // Even if logout fails, navigate to login
      await new Promise(resolve => setTimeout(resolve, 200));
      navigateToLogin(navigation);
      
      // Use setTimeout to show alert after navigation
      setTimeout(() => {
        Alert.alert(
          'Logout Error',
          'An error occurred during logout. You have been logged out locally.',
        );
      }, 500);
    }
  };

  const handleLogout = () => {
    console.log('Logout button clicked');
    
    // For web, use window.confirm as Alert.alert onPress callbacks don't work reliably
    if (Platform.OS === 'web') {
      console.log('Web platform detected, using window.confirm');
      const confirmed = (window as any).confirm('Are you sure you want to logout?');
      if (confirmed) {
        console.log('Logout confirmed by user (web), starting logout process');
        performLogout();
      } else {
        console.log('Logout cancelled by user (web)');
      }
      return;
    }
    
    // For native platforms, use Alert.alert
    try {
      console.log('Showing logout confirmation alert (native)...');
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              console.log('Logout cancelled by user');
            },
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: () => {
              console.log('Logout confirmed by user, starting logout process');
              performLogout();
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error showing logout alert:', error);
      // If alert fails, try to logout directly
      console.log('Alert failed, calling performLogout directly...');
      performLogout();
    }
  };

  const navigateToLogin = (nav: any) => {
    // Method 1: Use navigationRef (most reliable - has access to root Stack Navigator)
    if (navigationRef && navigationRef.isReady()) {
      try {
        navigationRef.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
        return;
      } catch (e) {
        console.error('Navigation ref dispatch failed:', e);
      }
    }
    
    // Method 2: Use navigation prop to get parent Stack Navigator
    if (nav) {
      try {
        // Get parent navigator (Stack Navigator that contains the Tab Navigator)
        const parentNav = nav.getParent();
        
        if (parentNav && parentNav.dispatch) {
          parentNav.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          );
          return;
        }
        
        // Try to navigate up to root
        let rootNav = nav;
        let depth = 0;
        while (rootNav && rootNav.getParent && rootNav.getParent() && depth < 5) {
          rootNav = rootNav.getParent();
          depth++;
        }
        
        if (rootNav && rootNav.dispatch) {
          rootNav.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          );
          return;
        }
      } catch (e) {
        console.error('Parent navigator method failed:', e);
      }
    }
    
    console.error('All navigation methods failed');
  };

  return (
    <View style={styles.headerRight}>
      <Text style={styles.username}>{user?.username || 'User'}</Text>
      <TouchableOpacity
        onPress={async () => {
          try {
            const phone = (customerPhone || '').trim();
            if (!phone) {
              Alert.alert('Info', 'Customer support number is not available. Please try again later.');
              return;
            }
            const telUrl = `tel:${phone}`;
            if (Platform.OS === 'web') {
              (window as any).location.href = telUrl;
              return;
            }
            const canOpen = await Linking.canOpenURL(telUrl);
            if (!canOpen) {
              Alert.alert('Info', 'Customer support number is not available. Please try again later.');
              return;
            }
            await Linking.openURL(telUrl);
          } catch (e) {
            Alert.alert('Info', 'Customer support number is not available. Please try again later.');
          }
        }}
        style={styles.phoneButton}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.phoneIcon}>📞</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={() => {
          console.log('TouchableOpacity onPress triggered');
          handleLogout();
        }}
        style={styles.logoutButton}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        disabled={false}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

// Buyer Tab Navigator
const BuyerTabs = ({ navigation }: any) => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.white,
      headerRight: () => <HeaderRight navigation={navigation} />,
    }}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Shop', tabBarLabel: 'Shop' }} />
    <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: 'My Orders', tabBarLabel: 'My Orders' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
  </Tab.Navigator>
);

// Admin Tab Navigator
const AdminTabs = ({ navigation }: any) => {
  const { isStrictAdmin } = useAuth();
  // Get notification count for badge
  const { data: unreadCount = 0 } = useGetUnreadAdminNotificationCountQuery(
    undefined
  );

  return (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.white,
      headerRight: () => <HeaderRight navigation={navigation} />,
    }}
  >
    <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen 
        name="OrderManagement" 
        component={OrderManagementScreen} 
        options={{ 
          title: 'Orders',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }} 
      />
    <Tab.Screen name="MenuManagement" component={MenuManagementScreen} options={{ title: 'Products' }} />
    {/* Users tab - Only visible for ADMIN role, not for SELLER */}
    {isStrictAdmin() && (
      <Tab.Screen 
        name="UserManagement" 
        component={UserManagementScreen} 
        options={{ title: 'Users' }} 
      />
    )}
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
      <Tab.Screen
        name="AppSettings"
        component={AppSettingsScreen}
        options={{
          title: 'App Settings',
          tabBarButton: () => null,
        }}
      />
  </Tab.Navigator>
);
};

// Main App Navigator - Start with Login Page
export const AppNavigator = () => {
  return (
    <NavigationContainer
      ref={navigationRef}
      linking={{
        // Keep this minimal; web will use the current origin automatically.
        prefixes: ['/', 'http://localhost:8081', 'http://localhost:19006'],
        config: {
          screens: {
            Login: 'Login',
            Register: 'Register',
            ForgotPassword: 'ForgotPassword',
            ResetPassword: 'ResetPassword',
            AccountInactive: 'AccountInactive',
            ProductDetail: 'product/:productId',
            SellerProductDetail: 'seller/product/:productId',
            AdminProductDetail: 'admin/product/:productId',
          },
        },
      }}
      onReady={() => {
        console.log('✅ NavigationContainer is ready');
      }}
    >
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
        }}
      >
        {/* Authentication Screens - Start here */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ title: 'Login' }}
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
          options={{ title: 'Register' }}
        />
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPasswordScreen} 
          options={{ title: 'Forgot Password' }}
        />
        <Stack.Screen 
          name="ResetPassword" 
          component={ResetPasswordScreen} 
          options={{ title: 'Reset Password' }}
        />
        <Stack.Screen 
          name="ChangePassword" 
          component={ChangePasswordScreen} 
          options={{ title: 'Change Password' }}
        />
        <Stack.Screen 
          name="AccountInactive" 
          component={AccountInactiveScreen} 
          options={{ 
            title: 'Account Inactive',
            headerShown: false,
          }}
        />
        
        {/* Admin App Screens - After login (Admin, Seller roles) */}
        <Stack.Screen 
          name="AdminApp" 
          component={AdminTabs} 
          options={{ headerShown: false }}
        />
        
        {/* Buyer App Screens - After login (Buyer role) */}
        <Stack.Screen 
          name="BuyerApp" 
          component={BuyerTabs} 
          options={{ headerShown: false }}
        />

        {/* Buyer Cart (not a bottom tab) */}
        <Stack.Screen
          name="Cart"
          component={CartScreen}
          options={{ title: 'Cart' }}
        />

        {/* Buyer PDP */}
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{ title: 'Product' }}
        />
        <Stack.Screen
          name="SellerProductDetail"
          component={ProductDetailScreen}
          options={{ title: 'Product' }}
        />
        <Stack.Screen
          name="AdminProductDetail"
          component={ProductDetailScreen}
          options={{ title: 'Product' }}
        />
        
        {/* Additional Buyer Screens */}
        <Stack.Screen
          name="OrderDetail"
          component={OrderDetailScreen}
          options={{ title: 'Order Details' }}
        />
        <Stack.Screen
          name="QRScanner"
          component={QRScannerScreen}
          options={{ title: 'Scan QR Code' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  username: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginRight: spacing.sm,
  },
  phoneButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  phoneIcon: {
    fontSize: 16,
    color: colors.white,
  },
  logoutButton: {
    backgroundColor: colors.error, // Red background
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    ...(Platform.OS === 'web' && { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' } as any),
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold, // Make it bold
  },
});


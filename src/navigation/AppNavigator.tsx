import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBrand } from '../components/common';
import { useGetShopCompanyQuery } from '../store/api/shopApi';
import { useGetBuyerAccountSummaryQuery } from '../store/api/buyerAccountApi';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICON_SIZE = 22;

const tabIcon =
  (outline: IonName, filled: IonName) =>
  ({ color, focused }: { color: string; size: number; focused: boolean }) =>
    (
      <View style={styles.tabIconBox}>
        <Ionicons
          name={focused ? filled : outline}
          size={TAB_ICON_SIZE}
          color={color}
          style={styles.tabIconGlyph}
        />
      </View>
    );

const hiddenTabOptions = {
  tabBarButton: () => null,
  tabBarItemStyle: {
    display: 'none' as const,
    width: 0,
    maxWidth: 0,
    flex: 0,
    overflow: 'hidden' as const,
  },
};

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
import { BuyerPaymentsScreen } from '../screens/buyer/BuyerPaymentsScreen';
import { BuyerEmptyCansScreen } from '../screens/buyer/BuyerEmptyCansScreen';
import { ShopCustomersScreen } from '../screens/shop/ShopCustomersScreen';
import { AddShopCustomerScreen } from '../screens/shop/AddShopCustomerScreen';
import { ShopCustomerDetailScreen } from '../screens/shop/ShopCustomerDetailScreen';
import { RecordShopPaymentScreen } from '../screens/shop/RecordShopPaymentScreen';
import { ShopEmptyCansScreen } from '../screens/shop/ShopEmptyCansScreen';
import { IssuedCansScreen } from '../screens/shop/IssuedCansScreen';
import { PhoneOrderScreen } from '../screens/shop/PhoneOrderScreen';
import { ShopProfileScreen } from '../screens/shop/ShopProfileScreen';
import { ShopBuyersScreen } from '../screens/shop/ShopBuyersScreen';
import { OrderDetailScreen } from '../screens/common/OrderDetailScreen';
import { ProductDetailScreen } from '../screens/common/ProductDetailScreen';

// Admin Screens
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { OrderManagementScreen } from '../screens/admin/OrderManagementScreen';
import { MenuManagementScreen } from '../screens/admin/MenuManagementScreen';
import { UserManagementScreen } from '../screens/admin/UserManagementScreen';
import { AppSettingsScreen } from '../screens/admin/AppSettingsScreen';
import { SellerListScreen } from '../screens/admin/SellerListScreen';
import { AddSellerScreen } from '../screens/admin/AddSellerScreen';
import { SellerDetailScreen } from '../screens/admin/SellerDetailScreen';
import { EditSellerScreen } from '../screens/admin/EditSellerScreen';
import { ActivatePaymentScreen } from '../screens/admin/ActivatePaymentScreen';
import { SubscriptionListScreen } from '../screens/admin/SubscriptionListScreen';
import { PaymentListScreen } from '../screens/admin/PaymentListScreen';

import { colors, spacing, typography } from '../theme';
import { SellerSubscriptionGate } from '../components/common/SellerSubscriptionGate';
import { useAuth } from '../hooks';
import { useGetUnreadAdminNotificationCountQuery, useGetUnreadBuyerNotificationCountQuery } from '../store/api/notificationApi';
import { NotificationHistoryScreen } from '../screens/common/NotificationHistoryScreen';
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
  const { user, logout, isBuyer } = useAuth();
  const buyer = isBuyer();
  const { data: buyerUnread = 0 } = useGetUnreadBuyerNotificationCountQuery(user?.id || 0, { skip: !user?.id || !buyer });
  const { data: sellerUnread = 0 } = useGetUnreadAdminNotificationCountQuery(undefined, { skip: !user || buyer });
  const unread = buyer ? buyerUnread : sellerUnread;
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
        onPress={() => navigation.getParent()?.navigate('NotificationHistory') || navigation.navigate('NotificationHistory')}
        style={styles.phoneButton}
        activeOpacity={0.7}
      >
        <Text style={styles.phoneIcon}>🔔</Text>
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>
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
const BuyerTabs = ({ navigation }: any) => {
  const { data: account } = useGetBuyerAccountSummaryQuery();
  const shopName = account?.companyName || account?.sellerBusiness;
  const shopPhoto = account?.sellerProfilePhoto;
  const shopBrand = <HeaderBrand name={shopName} photo={shopPhoto} light />;

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
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        title: 'Shop',
        tabBarLabel: 'Shop',
        tabBarIcon: tabIcon('storefront-outline', 'storefront'),
        headerTitle: () => shopBrand,
      }}
    />
    <Tab.Screen
      name="Orders"
      component={OrdersScreen}
      options={{
        title: 'My Orders',
        tabBarLabel: 'My Orders',
        tabBarIcon: tabIcon('receipt-outline', 'receipt'),
        headerLeft: () => <View style={styles.headerBrandWrap}>{shopBrand}</View>,
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        title: 'Profile',
        tabBarLabel: 'Profile',
        tabBarIcon: tabIcon('person-outline', 'person'),
        headerLeft: () => <View style={styles.headerBrandWrap}>{shopBrand}</View>,
      }}
    />
  </Tab.Navigator>
  );
};

// Admin Tab Navigator
const AdminTabs = ({ navigation }: any) => {
  const { user, isStrictAdmin, isSeller } = useAuth();
  const { data: shopCompany } = useGetShopCompanyQuery(undefined, { skip: !isSeller() });
  const sellerBrand = (
    <HeaderBrand
      name={shopCompany?.companyName}
      photo={shopCompany?.profilePhoto || user?.profilePhoto}
      light
    />
  );
  // Get notification count for badge
  const { data: unreadCount = 0 } = useGetUnreadAdminNotificationCountQuery(
    undefined
  );

  return (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarLabelPosition: 'below-icon',
      tabBarItemStyle: styles.adminTabItem,
      tabBarLabelStyle: styles.adminTabLabel,
      tabBarIconStyle: styles.adminTabIcon,
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.white,
      headerRight: () => <HeaderRight navigation={navigation} />,
    }}
  >
    <Tab.Screen
      name="Dashboard"
      component={AdminDashboardScreen}
      options={{
        tabBarIcon: tabIcon('grid-outline', 'grid'),
        headerTitle: () => isSeller() ? sellerBrand : <Text style={styles.headerTitleText}>Dashboard</Text>,
      }}
    />
      <Tab.Screen 
        name="OrderManagement" 
        component={OrderManagementScreen} 
        options={{ 
          title: 'Orders',
          tabBarIcon: tabIcon('receipt-outline', 'receipt'),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          headerLeft: () => isSeller() ? <View style={styles.headerBrandWrap}>{sellerBrand}</View> : undefined,
        }} 
      />
    <Tab.Screen
      name="MenuManagement"
      component={MenuManagementScreen}
      options={{
        title: 'Products',
        tabBarIcon: tabIcon('cube-outline', 'cube'),
        headerLeft: () => isSeller() ? <View style={styles.headerBrandWrap}>{sellerBrand}</View> : undefined,
      }}
    />
    {/* Users tab - Only visible for ADMIN role, not for SELLER */}
    {isStrictAdmin() && (
      <Tab.Screen 
        name="UserManagement" 
        component={UserManagementScreen} 
        options={{ title: 'Users', tabBarIcon: tabIcon('people-outline', 'people') }} 
      />
    )}
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        title: 'Profile',
        tabBarLabel: 'Profile',
        tabBarIcon: tabIcon('person-outline', 'person'),
        headerLeft: () => isSeller() ? <View style={styles.headerBrandWrap}>{sellerBrand}</View> : undefined,
      }}
    />
      {isStrictAdmin() && (
        <>
          <Tab.Screen
            name="AppSettings"
            component={AppSettingsScreen}
            options={{ title: 'App Settings', ...hiddenTabOptions }}
          />
          <Tab.Screen name="SellerList" component={SellerListScreen} options={{ title: 'Sellers', ...hiddenTabOptions }} />
          <Tab.Screen name="AddSeller" component={AddSellerScreen} options={{ title: 'Add Seller', ...hiddenTabOptions }} />
          <Tab.Screen name="SellerDetail" component={SellerDetailScreen} options={{ title: 'Seller Details', ...hiddenTabOptions }} />
          <Tab.Screen name="EditSeller" component={EditSellerScreen} options={{ title: 'Edit Seller', ...hiddenTabOptions }} />
          <Tab.Screen name="ActivatePayment" component={ActivatePaymentScreen} options={{ title: 'Payment Activation', ...hiddenTabOptions }} />
          <Tab.Screen name="SubscriptionList" component={SubscriptionListScreen} options={{ title: 'Subscriptions', ...hiddenTabOptions }} />
          <Tab.Screen name="PaymentList" component={PaymentListScreen} options={{ title: 'Payments', ...hiddenTabOptions }} />
        </>
      )}
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
      <>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          gestureEnabled: Platform.OS !== 'web',
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
        <Stack.Screen
          name="NotificationHistory"
          component={NotificationHistoryScreen}
          options={{ title: 'Notification History' }}
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
        <Stack.Screen
          name="ShopCustomers"
          component={ShopCustomersScreen}
          options={{ title: 'Shop Customers' }}
        />
        <Stack.Screen
          name="AddShopCustomer"
          component={AddShopCustomerScreen}
          options={{ title: 'Customer' }}
        />
        <Stack.Screen
          name="ShopCustomerDetail"
          component={ShopCustomerDetailScreen}
          options={{ title: 'Customer Details' }}
        />
        <Stack.Screen
          name="RecordShopPayment"
          component={RecordShopPaymentScreen}
          options={{ title: 'Record Payment' }}
        />
        <Stack.Screen
          name="ShopEmptyCans"
          component={ShopEmptyCansScreen}
          options={{ title: 'Empty Cans' }}
        />
        <Stack.Screen
          name="IssuedCans"
          component={IssuedCansScreen}
          options={{ title: '20 Litre Cans' }}
        />
        <Stack.Screen
          name="PhoneOrder"
          component={PhoneOrderScreen}
          options={{ title: 'Phone Order' }}
        />
        <Stack.Screen
          name="ShopProfile"
          component={ShopProfileScreen}
          options={{ title: 'Shop Profile' }}
        />
        <Stack.Screen
          name="ShopBuyers"
          component={ShopBuyersScreen}
          options={{ title: 'My Buyers' }}
        />
        <Stack.Screen
          name="BuyerPayments"
          component={BuyerPaymentsScreen}
          options={{ title: 'My Payments' }}
        />
        <Stack.Screen
          name="BuyerEmptyCans"
          component={BuyerEmptyCansScreen}
          options={{ title: 'My Empty Cans' }}
        />
      </Stack.Navigator>
      <SellerSubscriptionGate />
      </>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabIconBox: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconGlyph: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
    lineHeight: TAB_ICON_SIZE,
    textAlign: 'center',
  },
  adminTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    minWidth: 0,
  },
  adminTabIcon: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
    marginTop: 4,
  },
  adminTabLabel: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
    marginTop: 2,
    width: '100%',
  },
  headerBrandWrap: {
    marginLeft: spacing.md,
  },
  headerTitleText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
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
    position: 'relative',
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
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


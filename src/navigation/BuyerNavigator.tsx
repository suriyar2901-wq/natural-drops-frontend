import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from '../screens/buyer/HomeScreen';
import { CartScreen } from '../screens/buyer/CartScreen';
import { OrdersScreen } from '../screens/buyer/OrdersScreen';
import { ProfileScreen } from '../screens/buyer/ProfileScreen';
import { QRScannerScreen } from '../screens/buyer/QRScannerScreen';
import { BuyerStackParamList } from '../types';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator<BuyerStackParamList>();

const BuyerTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
      }}
    >
      <Tab.Screen
        name="BuyerHome"
        component={HomeScreen}
        options={{
          title: 'Shop',
          tabBarLabel: 'Shop',
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: 'My Orders',
          tabBarLabel: 'My Orders',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export const BuyerNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
      }}
    >
      <Stack.Screen
        name="BuyerTabs"
        component={BuyerTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Cart' }} />
      <Stack.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{ title: 'Scan QR Code' }}
      />
    </Stack.Navigator>
  );
};


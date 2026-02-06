import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { MenuManagementScreen } from '../screens/admin/MenuManagementScreen';
import { OrderManagementScreen } from '../screens/admin/OrderManagementScreen';
import { UserManagementScreen } from '../screens/admin/UserManagementScreen';
import { AdminStackParamList } from '../types';
import { colors } from '../theme';

const Stack = createStackNavigator<AdminStackParamList>();

export const AdminNavigator = () => {
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
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen
        name="MenuManagement"
        component={MenuManagementScreen}
        options={{ title: 'Manage Products' }}
      />
      <Stack.Screen
        name="OrderManagement"
        component={OrderManagementScreen}
        options={{ title: 'Manage Orders' }}
      />
      <Stack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{ title: 'Manage Users' }}
      />
    </Stack.Navigator>
  );
};


import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { useAuth } from '../../hooks';
import { useGetUnreadAdminNotificationCountQuery } from '../../store/api/notificationApi';

type Action = {
  label: string;
  onPress: () => void;
  badge?: number;
};

export const MoreScreen = ({ navigation }: any) => {
  const { isStrictAdmin, isSeller } = useAuth();
  const { data: unreadCount = 0 } = useGetUnreadAdminNotificationCountQuery();

  const openParent = (screen: string) => {
    navigation.getParent()?.navigate(screen) || navigation.navigate(screen);
  };

  const actions: Action[] = [
    {
      label: '📦 Manage Orders',
      onPress: () => navigation.navigate('OrderManagement'),
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  if (isStrictAdmin()) {
    actions.push(
      { label: '🛒 Manage Products', onPress: () => navigation.navigate('MenuManagement') },
      { label: '👥 Manage Users', onPress: () => navigation.navigate('UserManagement') },
      { label: '⚙️ App Settings', onPress: () => navigation.navigate('AppSettings') },
      { label: '🏪 Manage Sellers', onPress: () => navigation.navigate('SellerList') },
      { label: '🔁 Subscriptions', onPress: () => navigation.navigate('SubscriptionList') },
      { label: '💳 Subscription Payments', onPress: () => navigation.navigate('PaymentList') },
    );
  }

  if (isSeller()) {
    actions.push(
      { label: '👤 Profile', onPress: () => navigation.navigate('Profile') },
      { label: '🧴 20 Litre Cans', onPress: () => openParent('IssuedCans') },
      { label: '🧑‍🤝‍🧑 My Buyers', onPress: () => openParent('ShopBuyers') },
      { label: '🧾 Shop Profile / QR', onPress: () => openParent('ShopProfile') },
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>More</Text>
      {actions.map((action) => (
        <TouchableOpacity key={action.label} style={styles.actionButton} onPress={action.onPress}>
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>{action.label}</Text>
            {!!action.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{action.badge}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
});

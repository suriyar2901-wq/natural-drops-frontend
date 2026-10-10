import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, spacing, typography } from '../../theme';
import { useAuth } from '../../hooks';

type Action = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
};

export const MoreScreen = ({ navigation }: any) => {
  const { isStrictAdmin, isSeller } = useAuth();

  const openParent = (screen: string, params?: object) => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate(screen, params);
      return;
    }
    navigation.navigate(screen, params);
  };

  const actions: Action[] = [];

  if (isStrictAdmin()) {
    actions.push(
      { label: 'Manage Products', icon: 'cube-outline', onPress: () => navigation.navigate('MenuManagement') },
      { label: 'Manage Users', icon: 'people-outline', onPress: () => navigation.navigate('UserManagement') },
      { label: 'App Settings', icon: 'settings-outline', onPress: () => navigation.navigate('AppSettings') },
      { label: 'Manage Sellers', icon: 'storefront-outline', onPress: () => navigation.navigate('SellerList') },
      { label: 'Subscriptions', icon: 'repeat-outline', onPress: () => navigation.navigate('SubscriptionList') },
      { label: 'Subscription Payments', icon: 'card-outline', onPress: () => navigation.navigate('PaymentList') },
    );
  }

  if (isSeller()) {
    actions.push(
      { label: 'Profile', icon: 'person-outline', onPress: () => navigation.navigate('Profile') },
      { label: 'Water can management', icon: 'water-outline', onPress: () => openParent('IssuedCans') },
      { label: 'Daily can collection', icon: 'calendar-outline', onPress: () => openParent('CanCollectionReport') },
      { label: 'Shop Profile / QR', icon: 'qr-code-outline', onPress: () => openParent('ShopProfile') },
      { label: 'Map', icon: 'map-outline', onPress: () => openParent('SellerMap', { mode: 'navigation' }) },
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>More</Text>
      {actions.map((action) => (
        <TouchableOpacity key={action.label} style={styles.actionButton} onPress={action.onPress}>
          <View style={styles.actionRow}>
            <View style={styles.actionMain}>
              <View style={styles.iconWrap}>
                <Ionicons name={action.icon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.actionText}>{action.label}</Text>
            </View>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.space12,
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.space12,
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

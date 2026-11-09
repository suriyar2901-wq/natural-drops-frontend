import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { Button } from './Button';
import { Card } from './Card';
import { colors, spacing, typography } from '../../theme';
import { useAuth } from '../../hooks';
import { useGetSellerSubscriptionQuery } from '../../store/api/shopApi';
import { formatCurrency } from '../../utils/formatters';
import { moneyValue } from '../../types/shop.types';
import { navigationRef } from '../../navigation/navigationRef';

/** Hide gate while seller is on the pay / waiting screen so Cashfree modal can open. */
const isOnSubscriptionPayRoute = (routeName?: string | null) =>
  routeName === 'SellerSubscriptionPay';

export const SellerSubscriptionGate = () => {
  const { isSeller, isAuthenticated, logout } = useAuth();
  const navigation = useNavigation<any>();
  const currentRouteName = useNavigationState((state) => {
    if (!state) return null;
    let route: any = state.routes[state.index];
    while (route?.state?.index != null && route.state.routes) {
      route = route.state.routes[route.state.index];
    }
    return route?.name as string | undefined;
  });
  const sellerAuthed = isAuthenticated && isSeller();
  const { data, isLoading, refetch } = useGetSellerSubscriptionQuery(undefined, {
    skip: !sellerAuthed,
    refetchOnMountOrArgChange: true,
  });
  const [plan, setPlan] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const blocked = !!(sellerAuthed && !isLoading && data && !data.canWork);
  const onPayScreen = isOnSubscriptionPayRoute(currentRouteName);

  useEffect(() => {
    if (!blocked) return undefined;
    const timer = setInterval(() => {
      refetch();
    }, 8000);
    return () => clearInterval(timer);
  }, [blocked, refetch]);

  // Pay screen owns the flow (Cashfree / waiting). Keep gate hidden so gateway is not covered.
  if (!sellerAuthed || !blocked || !data || onPayScreen) {
    return null;
  }

  const amount = plan === 'YEARLY' ? moneyValue(data.yearlyAmount) : moneyValue(data.monthlyAmount);

  const openPay = (payMethod: 'ONLINE' | 'CASH') => {
    const params = { plan, payMethod, autoStart: true };
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('SellerSubscriptionPay', params);
    } else {
      navigation.navigate('SellerSubscriptionPay', params);
    }
  };

  const handleLogout = async () => {
    await logout();
    if (navigationRef.isReady()) {
      navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
    } else {
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
    }
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <Card style={styles.card}>
          <Text style={styles.title}>Subscribe to continue</Text>
          <Text style={styles.copy}>
            {data.reminderMessage || 'Subscribe to activate your seller account. You can use the app only after a successful subscription.'}
          </Text>
          {!!data.expiryDate && data.status === 'Expired' && (
            <Text style={styles.meta}>Expired on {data.expiryDate}</Text>
          )}

          <Text style={styles.label}>Plan</Text>
          <View style={styles.row}>
            <Choice label={`Monthly ${formatCurrency(moneyValue(data.monthlyAmount))}`} active={plan === 'MONTHLY'} onPress={() => setPlan('MONTHLY')} />
            <Choice label={`Yearly ${formatCurrency(moneyValue(data.yearlyAmount))}`} active={plan === 'YEARLY'} onPress={() => setPlan('YEARLY')} />
          </View>

          <Text style={styles.pay}>Pay {formatCurrency(amount)}</Text>
          <Button title="Pay online (Cashfree)" onPress={() => openPay('ONLINE')} />
          <Button
            title="Paid by hand cash — request admin"
            variant="outline"
            onPress={() => openPay('CASH')}
            style={styles.secondary}
          />
          <Button title="Logout" variant="outline" onPress={handleLogout} style={styles.logout} />
        </Card>
      </View>
    </Modal>
  );
};

const Choice = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity style={[styles.choice, active && styles.choiceActive]} onPress={onPress}>
    <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: { padding: spacing.lg },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  copy: { color: colors.textSecondary, marginBottom: spacing.sm },
  meta: { color: colors.error, marginBottom: spacing.md },
  label: { marginTop: spacing.md, marginBottom: spacing.xs, color: colors.textSecondary },
  row: { gap: spacing.sm },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
    backgroundColor: colors.white,
  },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.textPrimary },
  choiceTextActive: { color: colors.white, fontWeight: typography.fontWeight.semibold },
  pay: {
    marginVertical: spacing.md,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  secondary: { marginTop: spacing.sm },
  logout: { marginTop: spacing.sm },
});

import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { Button } from './Button';
import { Card } from './Card';
import { colors, spacing, typography } from '../../theme';
import { useAuth } from '../../hooks';
import { useGetSellerSubscriptionQuery, useSubscribeSellerMutation } from '../../store/api/shopApi';
import { formatCurrency } from '../../utils/formatters';
import { moneyValue } from '../../types/shop.types';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { navigationRef } from '../../navigation/navigationRef';

export const SellerSubscriptionGate = () => {
  const { isSeller, isAuthenticated, logout } = useAuth();
  const navigation = useNavigation();
  const { data, isLoading } = useGetSellerSubscriptionQuery(undefined, {
    skip: !isAuthenticated || !isSeller(),
  });
  const [subscribe, { isLoading: saving }] = useSubscribeSellerMutation();
  const [plan, setPlan] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [method, setMethod] = useState<'UPI' | 'CASH'>('UPI');

  if (!isAuthenticated || !isSeller()) {
    return null;
  }

  const blocked = !isLoading && data && !data.canWork;
  if (!blocked) {
    return null;
  }

  const amount = plan === 'YEARLY' ? moneyValue(data.yearlyAmount) : moneyValue(data.monthlyAmount);

  const handleSubscribe = async () => {
    try {
      await subscribe({ plan, method }).unwrap();
      showSuccessToast('Subscription activated. You can continue selling.');
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not subscribe. Update your profile mobile and try again.');
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
            {data.reminderMessage || 'Seller accounts work only after a successful subscription.'}
          </Text>
          {!!data.expiryDate && data.status === 'Expired' && (
            <Text style={styles.meta}>Expired on {data.expiryDate}</Text>
          )}

          <Text style={styles.label}>Plan</Text>
          <View style={styles.row}>
            <Choice label={`Monthly ${formatCurrency(moneyValue(data.monthlyAmount))}`} active={plan === 'MONTHLY'} onPress={() => setPlan('MONTHLY')} />
            <Choice label={`Yearly ${formatCurrency(moneyValue(data.yearlyAmount))}`} active={plan === 'YEARLY'} onPress={() => setPlan('YEARLY')} />
          </View>

          <Text style={styles.label}>Payment method</Text>
          <View style={styles.row}>
            <Choice label="UPI" active={method === 'UPI'} onPress={() => setMethod('UPI')} />
            <Choice label="Cash" active={method === 'CASH'} onPress={() => setMethod('CASH')} />
          </View>

          <Text style={styles.pay}>Pay {formatCurrency(amount)}</Text>
          <Button title={saving ? 'Activating…' : 'Subscribe now'} onPress={handleSubscribe} />
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
  logout: { marginTop: spacing.sm },
});

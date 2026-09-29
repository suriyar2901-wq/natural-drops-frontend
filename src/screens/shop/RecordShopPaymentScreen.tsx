import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetShopCustomerQuery, useRecordShopPaymentMutation } from '../../store/api/shopApi';
import { formatCurrency } from '../../utils/formatters';
import { moneyValue } from '../../types/shop.types';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

const METHODS = ['CASH', 'UPI', 'GATEWAY'];

export const RecordShopPaymentScreen = ({ navigation, route }: any) => {
  const customerId = route?.params?.customerId as number;
  const { data: customer, isLoading } = useGetShopCustomerQuery(customerId, { skip: !customerId });
  const [recordPayment, { isLoading: saving }] = useRecordShopPaymentMutation();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');

  if (isLoading || !customer) {
    return <Loading fullScreen message="Loading customer..." />;
  }

  const due = moneyValue(customer.money);

  const save = async () => {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      showErrorToast('Enter a valid amount');
      return;
    }
    if (parsed > due) {
      showErrorToast(`Amount cannot exceed ${formatCurrency(due)}`);
      return;
    }
    try {
      await recordPayment({ id: customerId, amount: String(parsed), method }).unwrap();
      showSuccessToast('Payment recorded');
      navigation.goBack();
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not record payment');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Record Payment</Text>
      <Card style={styles.card}>
        <Text style={styles.name}>{customer.name}</Text>
        <Text style={styles.meta}>Outstanding {formatCurrency(due)}</Text>
        <Input label="Amount" value={amount} keyboardType="decimal-pad" onChangeText={setAmount} />
        <Text style={styles.label}>Method</Text>
        <View style={styles.row}>
          {METHODS.map((item) => (
            <TouchableOpacity key={item} style={[styles.chip, method === item && styles.chipActive]} onPress={() => setMethod(item)}>
              <Text style={[styles.chipText, method === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button title={saving ? 'Saving…' : 'Save Payment'} onPress={save} />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.md },
  card: { padding: spacing.md },
  name: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginBottom: spacing.md },
  label: { marginTop: spacing.sm, marginBottom: spacing.xs, color: colors.textSecondary },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  chip: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary },
  chipTextActive: { color: colors.white, fontWeight: typography.fontWeight.semibold },
});

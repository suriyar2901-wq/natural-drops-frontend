import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useClaimBuyerPaymentMutation, useGetBuyerAccountSummaryQuery } from '../../store/api/buyerAccountApi';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { moneyValue } from '../../types/shop.types';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

const METHODS = ['UPI', 'CASH'];

export const BuyerPaymentsScreen = () => {
  const { data, isLoading, refetch } = useGetBuyerAccountSummaryQuery();
  const [claimPayment, { isLoading: saving }] = useClaimBuyerPaymentMutation();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI');

  if (isLoading) {
    return <Loading fullScreen message="Loading payments..." />;
  }

  const due = moneyValue(data?.due);
  const ledger = data?.ledger || [];

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
      await claimPayment({ amount: String(parsed), method }).unwrap();
      showSuccessToast('Payment recorded');
      setAmount('');
      refetch();
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not record payment');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Payments</Text>
      <Card style={styles.card}>
        <Text style={styles.stat}>{formatCurrency(due)}</Text>
        <Text style={styles.meta}>{data?.sellerBusiness || 'Natural Drops'} outstanding</Text>
        {!data?.customer && (
          <Text style={styles.meta}>No shop account is linked yet. Ask the seller to add your mobile as a customer.</Text>
        )}
        {!!data?.sellerQr && data.sellerQr.startsWith('data:image') && (
          <Image source={{ uri: data.sellerQr }} style={styles.qr} resizeMode="contain" />
        )}
        {!!data?.sellerQr && !data.sellerQr.startsWith('data:image') && (
          <Text style={styles.qrText}>{data.sellerQr}</Text>
        )}
        <Input label="Pay amount" value={amount} keyboardType="decimal-pad" onChangeText={setAmount} />
        <View style={styles.row}>
          {METHODS.map((item) => (
            <TouchableOpacity key={item} style={[styles.chip, method === item && styles.chipActive]} onPress={() => setMethod(item)}>
              <Text style={[styles.chipText, method === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button title={saving ? 'Saving…' : 'Record Payment'} onPress={save} />
      </Card>

      {ledger.map((event) => (
        <Card key={event.id} style={styles.rowCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.name}>{event.kind}</Text>
            <Text style={styles.name}>{formatCurrency(moneyValue(event.amount))}</Text>
          </View>
          <Text style={styles.meta}>{event.method || '—'} • {formatDateTime(event.occurredAt)}</Text>
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.md },
  card: { padding: spacing.md, marginBottom: spacing.md },
  stat: { fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.sm },
  qr: { width: 180, height: 180, alignSelf: 'center', marginVertical: spacing.md },
  qrText: { textAlign: 'center', color: colors.primary, marginVertical: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  chip: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary },
  chipTextActive: { color: colors.white, fontWeight: typography.fontWeight.semibold },
  rowCard: { padding: spacing.md, marginBottom: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
});

import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useClaimBuyerPaymentMutation, useGetBuyerAccountSummaryQuery } from '../../store/api/buyerAccountApi';
import { useGetBuyerOrdersQuery } from '../../store/api/orderApi';
import { useAuth } from '../../hooks';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { moneyValue, orderBillPending } from '../../types/shop.types';
import { Order } from '../../types';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

const orderSplit = (order: Order) => {
  const total = Number(order.total) || 0;
  const billed = order.finalBillAmount == null ? 0 : Number(order.finalBillAmount);
  if (order.paymentStatus === 'PAID') {
    return { total, paid: billed > 0 ? billed : total, balance: 0 };
  }
  if (order.paymentStatus === 'PARTIALLY_PAID') {
    const paid = Math.min(total, Math.max(0, billed));
    return { total, paid, balance: orderBillPending(order) };
  }
  return { total, paid: 0, balance: total };
};

const METHODS = ['UPI', 'CASH'];

export const BuyerPaymentsScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { data, isLoading, refetch } = useGetBuyerAccountSummaryQuery();
  const { data: orders = [], isLoading: ordersLoading } = useGetBuyerOrdersQuery(user?.id || 0, { skip: !user?.id });
  const [claimPayment, { isLoading: saving }] = useClaimBuyerPaymentMutation();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI');

  if (isLoading || ordersLoading) {
    return <Loading fullScreen message="Loading payments..." />;
  }

  const ledger = data?.ledger || [];
  const orderBills = (orders as Order[])
    .filter((order) => order.status !== 'canceled')
    .slice()
    .sort((left, right) => right.id - left.id);
  const orderDue = orderBills.reduce((sum, order) => sum + orderSplit(order).balance, 0);
  const due = orderBills.length > 0 ? orderDue : moneyValue(data?.due);
  const payable = moneyValue(data?.due);

  const save = async () => {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      showErrorToast('Enter a valid amount');
      return;
    }
    if (parsed > payable) {
      showErrorToast(`Amount cannot exceed ${formatCurrency(payable)}`);
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

      {orderBills.map((order) => {
        const split = orderSplit(order);
        return (
          <TouchableOpacity
            key={order.id}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('OrderDetail', { order })}
          >
            <Card style={styles.rowCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>Order #{order.id}</Text>
                <Text style={styles.name}>{order.paymentStatus === 'PAID' ? 'Paid' : order.paymentStatus === 'PARTIALLY_PAID' ? 'Partial' : 'Unpaid'}</Text>
              </View>
              <Text style={styles.meta}>Bill {formatCurrency(split.total)} · Paid {formatCurrency(split.paid)}</Text>
              <Text style={styles.balance}>Balance {formatCurrency(split.balance)}</Text>
            </Card>
          </TouchableOpacity>
        );
      })}

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
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, flexWrap: 'wrap' },
  name: { flexShrink: 1, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  balance: { marginTop: 2, color: colors.warning, fontWeight: typography.fontWeight.bold },
});

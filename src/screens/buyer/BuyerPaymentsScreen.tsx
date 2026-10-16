import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'qrcode';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetBuyerAccountSummaryQuery } from '../../store/api/buyerAccountApi';
import { useClaimOrderPaymentMutation, useGetMyOrderClaimsQuery } from '../../store/api/paymentApi';
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
  const [claimPayment, { isLoading: saving }] = useClaimOrderPaymentMutation();
  const { data: claims = [], refetch: refetchClaims } = useGetMyOrderClaimsQuery();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI');
  const [upiReference, setUpiReference] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [billTab, setBillTab] = useState<'unpaid' | 'paid'>('unpaid');
  const [generatedQr, setGeneratedQr] = useState('');
  const uploadedQr = data?.sellerQr && data.sellerQr.startsWith('data:image') ? data.sellerQr : '';
  const upiId = (data?.sellerUpi || '').trim();
  const pendingByOrder = new Map(
    claims.filter((claim) => claim.status === 'PENDING' && claim.orderId != null).map((claim) => [claim.orderId!, claim])
  );

  useEffect(() => {
    if (uploadedQr || !upiId) {
      setGeneratedQr('');
      return undefined;
    }
    let active = true;
    const parsed = Number(amount);
    const payAmount = parsed > 0 ? parsed.toFixed(2) : '';
    const note = selectedOrderId ? `Order ${selectedOrderId}` : 'Natural Drops bill';
    const payload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(data?.sellerBusiness || data?.companyName || 'Shop')}${payAmount ? `&am=${payAmount}` : ''}&cu=INR&tn=${encodeURIComponent(note)}`;
    QRCode.toDataURL(payload, {
      width: 280,
      margin: 1,
      color: { dark: '#0232AA', light: '#FFFFFF' },
    }).then((image) => {
      if (active) setGeneratedQr(image);
    }).catch(() => {
      if (active) setGeneratedQr('');
    });
    return () => {
      active = false;
    };
  }, [uploadedQr, upiId, data?.sellerBusiness, data?.companyName, selectedOrderId, amount]);

  if (isLoading || ordersLoading) {
    return <Loading fullScreen message="Loading payments..." />;
  }

  const ledger = data?.ledger || [];
  const orderBills = (orders as Order[])
    .filter((order) => order.status !== 'canceled')
    .slice()
    .sort((left, right) => right.id - left.id);
  const unpaidBills = orderBills.filter((order) => orderSplit(order).balance > 0);
  const paidBills = orderBills.filter((order) => orderSplit(order).balance <= 0);
  const orderDue = unpaidBills.reduce((sum, order) => sum + orderSplit(order).balance, 0);
  const paidTotal = paidBills.reduce((sum, order) => sum + orderSplit(order).paid, 0);
  const due = orderBills.length > 0 ? orderDue : moneyValue(data?.due);
  const selected = unpaidBills.find((order) => order.id === selectedOrderId) || null;
  const selectedBalance = selected ? orderSplit(selected).balance : 0;
  const waitingSelected = selected ? pendingByOrder.get(selected.id) : undefined;
  const typed = amount.trim();
  const suggestions = unpaidBills.filter((order) => {
    if (!typed) return true;
    const split = orderSplit(order);
    return String(order.id).includes(typed)
      || split.balance.toFixed(2).includes(typed)
      || formatCurrency(split.balance).toLowerCase().includes(typed.toLowerCase());
  }).slice(0, 6);

  const chooseBill = (order: Order) => {
    setSelectedOrderId(order.id);
    setAmount(orderSplit(order).balance.toFixed(2));
    setBillTab('unpaid');
  };

  const save = async () => {
    const parsed = Number(amount);
    if (!selected) {
      showErrorToast('Select the unpaid bill you are paying');
      return;
    }
    if (waitingSelected) {
      showErrorToast('This bill is already waiting for the seller to confirm');
      return;
    }
    if (!parsed || parsed <= 0) {
      showErrorToast('Enter a valid amount');
      return;
    }
    if (parsed > selectedBalance + 0.001) {
      showErrorToast(`Amount cannot exceed ${formatCurrency(selectedBalance)} for order #${selected.id}`);
      return;
    }
    try {
      await claimPayment({
        amount: parsed.toFixed(2),
        method,
        orderId: selected.id,
        upiReference: upiReference.trim() || undefined,
      }).unwrap();
      showSuccessToast(`Payment sent. Seller will confirm order #${selected.id}`);
      setAmount('');
      setUpiReference('');
      setSelectedOrderId(null);
      refetch();
      refetchClaims();
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not submit payment');
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
        <Text style={styles.payLabel}>UPI ID</Text>
        <Text selectable style={styles.upiId}>{upiId || 'Seller has not added a UPI ID yet'}</Text>
        {(uploadedQr || generatedQr) ? (
          <Image source={{ uri: uploadedQr || generatedQr }} style={styles.qr} resizeMode="contain" />
        ) : (
          <Text style={styles.meta}>Ask the seller to add a UPI ID or payment QR in Shop Profile.</Text>
        )}
        <Text style={styles.meta}>Scan this code in any UPI app, then tap I paid. The bill stays waiting until the seller confirms.</Text>
        <Input
          label="Pay amount"
          value={amount}
          keyboardType="decimal-pad"
          onChangeText={(value) => {
            setAmount(value);
            if (selected && Number(value) > orderSplit(selected).balance + 0.001) {
              setSelectedOrderId(null);
            }
          }}
        />
        <Text style={styles.payLabel}>Unpaid bill</Text>
        {selected ? (
          <Text style={styles.selectedBill}>
            Paying order #{selected.id} · Balance {formatCurrency(selectedBalance)}
            {waitingSelected ? ' · Waiting for seller' : ''}
          </Text>
        ) : (
          <Text style={styles.meta}>Select the unpaid bill this payment is for.</Text>
        )}
        {suggestions.length > 0 ? suggestions.map((order) => {
          const split = orderSplit(order);
          const active = order.id === selectedOrderId;
          const waiting = pendingByOrder.has(order.id);
          return (
            <TouchableOpacity key={order.id} activeOpacity={0.8} onPress={() => chooseBill(order)}>
              <View style={[styles.suggest, active && styles.suggestActive]}>
                <Text style={[styles.name, active && styles.suggestTextOn]}>Order #{order.id}{waiting ? ' · Waiting' : ''}</Text>
                <Text style={[styles.meta, active && styles.suggestTextOn]}>Balance {formatCurrency(split.balance)}</Text>
              </View>
            </TouchableOpacity>
          );
        }) : (
          <Text style={styles.meta}>No unpaid bill matches this amount.</Text>
        )}
        <View style={styles.row}>
          {METHODS.map((item) => (
            <TouchableOpacity key={item} style={[styles.chip, method === item && styles.chipActive]} onPress={() => setMethod(item)}>
              <Text style={[styles.chipText, method === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Input
          label="UPI reference (optional)"
          value={upiReference}
          onChangeText={setUpiReference}
          placeholder="Transaction / UTR number"
          autoCapitalize="characters"
        />
        <Button
          title={saving ? 'Submitting…' : waitingSelected ? 'Waiting for seller' : 'I paid this bill'}
          onPress={save}
          disabled={saving || !!waitingSelected}
        />
      </Card>

      <View style={styles.categories}>
        <TouchableOpacity
          style={[styles.category, billTab === 'unpaid' && styles.categoryUnpaid]}
          onPress={() => setBillTab('unpaid')}
        >
          <Text style={[styles.categoryLabel, billTab === 'unpaid' && styles.categoryLabelOn]}>Unpaid</Text>
          <Text style={[styles.categoryValue, billTab === 'unpaid' && styles.categoryLabelOn]}>{formatCurrency(orderDue)}</Text>
          <Text style={[styles.categoryCount, billTab === 'unpaid' && styles.categoryLabelOn]}>{unpaidBills.length} bill{unpaidBills.length === 1 ? '' : 's'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.category, billTab === 'paid' && styles.categoryPaid]}
          onPress={() => setBillTab('paid')}
        >
          <Text style={[styles.categoryLabel, billTab === 'paid' && styles.categoryLabelOn]}>Paid</Text>
          <Text style={[styles.categoryValue, billTab === 'paid' && styles.categoryLabelOn]}>{formatCurrency(paidTotal)}</Text>
          <Text style={[styles.categoryCount, billTab === 'paid' && styles.categoryLabelOn]}>{paidBills.length} bill{paidBills.length === 1 ? '' : 's'}</Text>
        </TouchableOpacity>
      </View>

      {(billTab === 'unpaid' ? unpaidBills : paidBills).map((order) => {
        const split = orderSplit(order);
        const active = order.id === selectedOrderId;
        return (
          <TouchableOpacity
            key={order.id}
            activeOpacity={0.7}
            onPress={() => {
              if (billTab === 'unpaid') chooseBill(order);
              else navigation.navigate('OrderDetail', { order });
            }}
          >
            <Card style={[styles.rowCard, active && styles.rowCardActive]}>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>Order #{order.id}</Text>
                <Text style={styles.name}>
                  {billTab === 'paid'
                    ? 'Paid'
                    : pendingByOrder.has(order.id)
                      ? 'Waiting'
                      : split.paid > 0
                        ? 'Partial'
                        : 'Unpaid'}
                </Text>
              </View>
              <Text style={styles.meta}>Bill {formatCurrency(split.total)} · Paid {formatCurrency(split.paid)}</Text>
              {billTab === 'unpaid' && <Text style={styles.balance}>Balance {formatCurrency(split.balance)}</Text>}
            </Card>
          </TouchableOpacity>
        );
      })}
      {(billTab === 'unpaid' ? unpaidBills : paidBills).length === 0 && (
        <Text style={styles.meta}>{billTab === 'unpaid' ? 'No unpaid bills.' : 'No paid bills yet.'}</Text>
      )}

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
  payLabel: { marginTop: spacing.sm, color: colors.textSecondary, fontWeight: typography.fontWeight.semibold },
  upiId: { color: colors.primary, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginTop: 4 },
  qr: { width: 180, height: 180, alignSelf: 'center', marginVertical: spacing.md },
  selectedBill: { color: colors.primary, fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm },
  suggest: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.white,
  },
  suggestActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  suggestTextOn: { color: colors.white },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  category: {
    flex: 1,
    minWidth: 140,
    minHeight: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md,
    justifyContent: 'center',
  },
  categoryUnpaid: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryPaid: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryLabel: { color: colors.textSecondary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg },
  categoryValue: { color: colors.textPrimary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize['2xl'], marginTop: 4 },
  categoryCount: { color: colors.textSecondary, marginTop: 2 },
  categoryLabelOn: { color: colors.white },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, marginTop: spacing.sm },
  chip: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary },
  chipTextActive: { color: colors.white, fontWeight: typography.fontWeight.semibold },
  rowCard: { padding: spacing.md, marginBottom: spacing.sm },
  rowCardActive: { borderWidth: 2, borderColor: colors.primary },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, flexWrap: 'wrap' },
  name: { flexShrink: 1, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  balance: { marginTop: 2, color: colors.warning, fontWeight: typography.fontWeight.bold },
});

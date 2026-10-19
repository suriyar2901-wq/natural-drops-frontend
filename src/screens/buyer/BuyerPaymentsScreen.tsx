import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
import { buildUpiPayUrl, extractUpiReference, openUpiPayment } from '../../utils/upiPayment';

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

export const BuyerPaymentsScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { data, isLoading, refetch } = useGetBuyerAccountSummaryQuery();
  const { data: orders = [], isLoading: ordersLoading } = useGetBuyerOrdersQuery(user?.id || 0, { skip: !user?.id });
  const [claimPayment, { isLoading: saving }] = useClaimOrderPaymentMutation();
  const { data: claims = [], refetch: refetchClaims } = useGetMyOrderClaimsQuery();
  const [amount, setAmount] = useState('');
  const [upiReference, setUpiReference] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [billTab, setBillTab] = useState<'unpaid' | 'paid'>('unpaid');
  const [generatedQr, setGeneratedQr] = useState('');
  const [openingUpi, setOpeningUpi] = useState(false);
  const [awaitingReturn, setAwaitingReturn] = useState(false);
  const refInput = useRef<TextInput>(null);
  const uploadedQr = data?.sellerQr && data.sellerQr.startsWith('data:image') ? data.sellerQr : '';
  const upiId = (data?.sellerUpi || '').trim();
  const payeeName = data?.sellerBusiness || data?.companyName || 'Shop';
  const pendingByOrder = new Map(
    claims.filter((claim) => claim.status === 'PENDING' && claim.orderId != null).map((claim) => [claim.orderId!, claim])
  );

  const unpaidBills = (orders as Order[])
    .filter((order) => order.status !== 'canceled')
    .slice()
    .sort((left, right) => right.id - left.id)
    .filter((order) => orderSplit(order).balance > 0);
  const paidBills = (orders as Order[])
    .filter((order) => order.status !== 'canceled')
    .filter((order) => orderSplit(order).balance <= 0)
    .sort((left, right) => right.id - left.id);
  const orderDue = unpaidBills.reduce((sum, order) => sum + orderSplit(order).balance, 0);
  const paidTotal = paidBills.reduce((sum, order) => sum + orderSplit(order).paid, 0);
  const due = unpaidBills.length > 0 || paidBills.length > 0 ? orderDue : moneyValue(data?.due);
  const selected = unpaidBills.find((order) => order.id === selectedOrderId) || null;
  const selectedBalance = selected ? orderSplit(selected).balance : 0;
  const waitingSelected = selected ? pendingByOrder.get(selected.id) : undefined;
  const payAmount = Number(amount);

  useEffect(() => {
    if (!upiId || !(payAmount > 0) || !selectedOrderId) {
      if (uploadedQr) {
        setGeneratedQr('');
        return undefined;
      }
      setGeneratedQr('');
      return undefined;
    }
    let active = true;
    const payload = buildUpiPayUrl({
      upiId,
      payeeName,
      amount: payAmount,
      note: `Order ${selectedOrderId}`,
    });
    QRCode.toDataURL(payload, {
      width: 280,
      margin: 1,
      color: { dark: '#0232AA', light: '#FFFFFF' },
    })
      .then((image) => {
        if (active) setGeneratedQr(image);
      })
      .catch(() => {
        if (active) setGeneratedQr('');
      });
    return () => {
      active = false;
    };
  }, [uploadedQr, upiId, payeeName, selectedOrderId, payAmount]);

  useEffect(() => {
    if (!awaitingReturn) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setAwaitingReturn(false);
      showSuccessToast('Enter the UPI transaction / UTR number from GPay, then tap I paid this bill');
      setTimeout(() => refInput.current?.focus(), 300);
      tryPasteUtr();
    });
    return () => sub.remove();
  }, [awaitingReturn]);

  const tryPasteUtr = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        const text = await navigator.clipboard.readText();
        const found = extractUpiReference(text);
        if (found) setUpiReference(found);
      } catch {
        // clipboard permission may be denied
      }
    }
  };

  const chooseBill = (order: Order) => {
    setSelectedOrderId(order.id);
    setAmount(orderSplit(order).balance.toFixed(2));
    setBillTab('unpaid');
    setUpiReference('');
  };

  const openGpay = async () => {
    if (!selected) {
      showErrorToast('Select the unpaid bill you are paying');
      return;
    }
    if (waitingSelected) {
      showErrorToast('This bill is already waiting for the seller to confirm');
      return;
    }
    if (!upiId) {
      showErrorToast('Seller has not added a UPI ID yet');
      return;
    }
    if (!(payAmount > 0)) {
      showErrorToast('Enter a valid amount');
      return;
    }
    if (payAmount > selectedBalance + 0.001) {
      showErrorToast(`Amount cannot exceed ${formatCurrency(selectedBalance)} for order #${selected.id}`);
      return;
    }
    setOpeningUpi(true);
    try {
      await openUpiPayment({
        upiId,
        payeeName,
        amount: payAmount,
        note: `Order ${selected.id}`,
      });
      setAwaitingReturn(true);
      showSuccessToast('Complete payment in GPay, then come back with the transaction number');
    } catch (error: any) {
      showErrorToast(error?.message || 'Could not open GPay. Scan the QR instead.');
    } finally {
      setOpeningUpi(false);
    }
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
    const reference = upiReference.trim();
    if (reference.length < 6) {
      showErrorToast('Enter the UPI transaction / UTR number from GPay');
      return;
    }
    try {
      await claimPayment({
        amount: parsed.toFixed(2),
        method: 'UPI',
        orderId: selected.id,
        upiReference: reference,
      }).unwrap();
      showSuccessToast(`Payment sent to seller for order #${selected.id}. Waiting for confirmation.`);
      setAmount('');
      setUpiReference('');
      setSelectedOrderId(null);
      setAwaitingReturn(false);
      refetch();
      refetchClaims();
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not submit payment');
    }
  };

  if (isLoading || ordersLoading) {
    return <Loading fullScreen message="Loading payments..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Payments</Text>
      <Card style={styles.card}>
        <Text style={styles.stat}>{formatCurrency(due)}</Text>
        <Text style={styles.meta}>{payeeName} outstanding</Text>
        {!data?.customer && (
          <Text style={styles.meta}>No shop account is linked yet. Ask the seller to add your mobile as a customer.</Text>
        )}

        <Text style={styles.step}>1. Select unpaid bill</Text>
        {unpaidBills.length === 0 ? (
          <Text style={styles.meta}>No unpaid bills.</Text>
        ) : (
          unpaidBills.slice(0, 8).map((order) => {
            const split = orderSplit(order);
            const active = order.id === selectedOrderId;
            const waiting = pendingByOrder.has(order.id);
            return (
              <TouchableOpacity key={order.id} activeOpacity={0.8} onPress={() => chooseBill(order)}>
                <View style={[styles.suggest, active && styles.suggestActive]}>
                  <Text style={[styles.name, active && styles.suggestTextOn]}>
                    Order #{order.id}{waiting ? ' · Waiting' : ''}
                  </Text>
                  <Text style={[styles.meta, active && styles.suggestTextOn]}>
                    Balance {formatCurrency(split.balance)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {selected ? (
          <Text style={styles.selectedBill}>
            Paying order #{selected.id} · {formatCurrency(selectedBalance)}
            {waitingSelected ? ' · Waiting for seller' : ''}
          </Text>
        ) : null}

        <Input
          label="Pay amount"
          value={amount}
          keyboardType="decimal-pad"
          onChangeText={setAmount}
        />

        <Text style={styles.step}>2. Pay with UPI / GPay</Text>
        <Text style={styles.payLabel}>Seller UPI ID</Text>
        <Text selectable style={styles.upiId}>{upiId || 'Seller has not added a UPI ID yet'}</Text>

        {(uploadedQr || generatedQr) ? (
          <Image source={{ uri: uploadedQr || generatedQr }} style={styles.qr} resizeMode="contain" />
        ) : (
          <Text style={styles.meta}>Ask the seller to add a UPI ID or payment QR in Shop Profile.</Text>
        )}

        <Button
          title={openingUpi ? 'Opening GPay…' : 'Open GPay / UPI'}
          onPress={openGpay}
          disabled={openingUpi || !!waitingSelected || !selected}
          style={styles.gpayButton}
        />
        <Text style={styles.meta}>
          Pay in GPay, then copy the transaction / UTR number from the payment success screen.
        </Text>

        <Text style={styles.step}>3. Enter transaction number &amp; tell seller</Text>
        <Input
          ref={refInput}
          label="UPI transaction / UTR number"
          value={upiReference}
          onChangeText={(value) => {
            const cleaned = value.replace(/\s/g, '').toUpperCase();
            const extracted = extractUpiReference(cleaned);
            setUpiReference(extracted || cleaned);
          }}
          placeholder="Paste UTR from GPay"
          autoCapitalize="characters"
        />
        <Button
          title={saving ? 'Submitting…' : waitingSelected ? 'Waiting for seller' : 'I paid this bill'}
          onPress={save}
          disabled={saving || !!waitingSelected || !selected}
        />
        <Text style={styles.meta}>
          Seller gets a notification with your amount and UTR. The bill becomes Paid only after the seller confirms.
        </Text>
      </Card>

      <View style={styles.categories}>
        <TouchableOpacity
          style={[styles.category, billTab === 'unpaid' && styles.categoryUnpaid]}
          onPress={() => setBillTab('unpaid')}
        >
          <Text style={[styles.categoryLabel, billTab === 'unpaid' && styles.categoryLabelOn]}>Unpaid</Text>
          <Text style={[styles.categoryValue, billTab === 'unpaid' && styles.categoryLabelOn]}>{formatCurrency(orderDue)}</Text>
          <Text style={[styles.categoryCount, billTab === 'unpaid' && styles.categoryLabelOn]}>
            {unpaidBills.length} bill{unpaidBills.length === 1 ? '' : 's'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.category, billTab === 'paid' && styles.categoryPaid]}
          onPress={() => setBillTab('paid')}
        >
          <Text style={[styles.categoryLabel, billTab === 'paid' && styles.categoryLabelOn]}>Paid</Text>
          <Text style={[styles.categoryValue, billTab === 'paid' && styles.categoryLabelOn]}>{formatCurrency(paidTotal)}</Text>
          <Text style={[styles.categoryCount, billTab === 'paid' && styles.categoryLabelOn]}>
            {paidBills.length} bill{paidBills.length === 1 ? '' : 's'}
          </Text>
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

      {(data?.ledger || []).map((event) => (
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
  step: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.base,
  },
  payLabel: { marginTop: spacing.sm, color: colors.textSecondary, fontWeight: typography.fontWeight.semibold },
  upiId: { color: colors.primary, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginTop: 4 },
  qr: { width: 180, height: 180, alignSelf: 'center', marginVertical: spacing.md },
  gpayButton: { marginTop: spacing.sm, marginBottom: spacing.sm },
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
  rowCard: { padding: spacing.md, marginBottom: spacing.sm },
  rowCardActive: { borderWidth: 2, borderColor: colors.primary },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, flexWrap: 'wrap' },
  name: { flexShrink: 1, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  balance: { marginTop: 2, color: colors.warning, fontWeight: typography.fontWeight.bold },
});

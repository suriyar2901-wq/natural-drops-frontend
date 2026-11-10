import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Card, Button } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { openCashfreeCheckout } from '../../utils/cashfreeCheckout';
import {
  clearCashfreeReturnQuery,
  pollCashfreeFast,
  readCashfreeReturnOrderId,
  rememberCashfreeOrder,
  rememberCheckoutNdOrder,
} from '../../utils/cashfreeReturn';
import {
  useCreateCashfreeOrderMutation,
  useLazyGetCashfreeOrderStatusQuery,
  CashfreeOrderStatusResponse,
} from '../../store/api/paymentApi';
import { useGetOrderByIdQuery } from '../../store/api/orderApi';

export type CheckoutPaymentOutcome = 'initiating' | 'success' | 'failed' | 'pending' | 'idle';

type RouteParams = {
  orderId: number;
  orderTotal?: number | string;
  /** When true, start Cashfree as soon as the screen mounts. */
  autoStart?: boolean;
  outcome?: CheckoutPaymentOutcome;
  message?: string;
  cfOrderId?: string;
};

const isVerifiedPaid = (status?: CashfreeOrderStatusResponse | null) =>
  !!status?.paymentApplied || String(status?.cfOrderStatus || '').toUpperCase() === 'PAID';

const isTerminalFailed = (status?: CashfreeOrderStatusResponse | null) => {
  const local = String(status?.status || '').toUpperCase();
  return (
    local === 'FAILED'
    || local === 'EXPIRED'
    || local === 'USER_DROPPED'
    || local === 'CANCELLED'
  );
};

export const CheckoutPaymentResultScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params || {}) as RouteParams;
  const orderId = Number(params.orderId);

  const [outcome, setOutcome] = useState<CheckoutPaymentOutcome>(
    params.outcome || (params.autoStart ? 'initiating' : 'idle')
  );
  const [message, setMessage] = useState(params.message || '');
  const [cfOrderId, setCfOrderId] = useState(params.cfOrderId || '');
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const startedRef = useRef(false);

  const setBusySafe = (value: boolean) => {
    busyRef.current = value;
    setBusy(value);
  };

  const [createCashfreeOrder] = useCreateCashfreeOrderMutation();
  const [fetchCashfreeStatus] = useLazyGetCashfreeOrderStatusQuery();
  const { data: order, refetch: refetchOrder } = useGetOrderByIdQuery(orderId, {
    skip: !orderId || !Number.isFinite(orderId),
  });

  const goOrders = () => {
    try {
      navigation.navigate('BuyerApp', { screen: 'Orders' });
      return;
    } catch {}
    try {
      navigation.navigate('Orders');
    } catch {}
  };

  const goOrderDetail = () => {
    if (order) {
      navigation.navigate('OrderDetail', { order });
      return;
    }
    goOrders();
  };

  const applyVerifiedStatus = useCallback((status: CashfreeOrderStatusResponse | undefined) => {
    if (!status) {
      setOutcome('pending');
      setMessage('Payment status could not be confirmed yet. Refresh status in a moment.');
      return;
    }
    if (status.cfOrderId) setCfOrderId(status.cfOrderId);
    if (status.amount != null) setPaidAmount(Number(status.amount));

    if (isVerifiedPaid(status)) {
      setOutcome('success');
      setMessage('Payment verified. Your order is paid.');
      refetchOrder();
      return;
    }
    if (isTerminalFailed(status)) {
      setOutcome('failed');
      setMessage('Payment was not completed. You can retry with the same order.');
      return;
    }
    setOutcome('pending');
    setMessage(
      'Payment is still processing. If money was deducted, wait a moment and refresh — the order updates only after the server confirms payment.'
    );
  }, [refetchOrder]);

  const verifyCfOrder = useCallback(async (id: string) => {
    const status = await pollCashfreeFast(
      () => fetchCashfreeStatus(id).unwrap(),
      { maxAttempts: 14, gapMs: 400 }
    );
    applyVerifiedStatus(status);
    return status;
  }, [applyVerifiedStatus, fetchCashfreeStatus]);

  const startPayment = useCallback(async () => {
    if (!orderId || !Number.isFinite(orderId)) {
      setOutcome('failed');
      setMessage('Missing order id. Go back to cart and place the order again.');
      return;
    }
    if (busyRef.current) return;
    setBusySafe(true);
    setOutcome('initiating');
    setMessage('Creating a secure Cashfree payment session…');
    rememberCheckoutNdOrder(orderId);

    try {
      // Omit amount — server uses unpaid bill balance for this order.
      const session = await createCashfreeOrder({ orderId }).unwrap();
      if (!session?.paymentSessionId || !session?.cfOrderId) {
        throw new Error('Server did not return a Cashfree payment session');
      }
      setCfOrderId(session.cfOrderId);
      if (session.amount != null) setPaidAmount(Number(session.amount));
      rememberCashfreeOrder(session.cfOrderId);
      rememberCheckoutNdOrder(orderId);

      setMessage('Opening Cashfree checkout…');
      const checkout = await openCashfreeCheckout({
        paymentSessionId: session.paymentSessionId,
        cfOrderId: session.cfOrderId,
        environment: session.environment,
      });

      if (checkout.status === 'FAILED') {
        setOutcome('failed');
        setMessage(checkout.message || 'Cashfree payment failed');
        // Still verify — webhook may have applied, or local status may differ
        await verifyCfOrder(session.cfOrderId);
        return;
      }

      setOutcome('pending');
      setMessage('Confirming payment with the server…');
      await verifyCfOrder(session.cfOrderId);
    } catch (error: any) {
      setOutcome('failed');
      setMessage(
        error?.data?.message
          || error?.message
          || 'Could not start Cashfree payment. Your order was created — tap Retry Payment.'
      );
    } finally {
      setBusySafe(false);
      clearCashfreeReturnQuery();
    }
  }, [createCashfreeOrder, orderId, verifyCfOrder]);

  const refreshStatus = useCallback(async () => {
    if (!cfOrderId) {
      // Try return URL / remembered cf order, else start a new session for same ND order
      const fromReturn = readCashfreeReturnOrderId();
      if (fromReturn) {
        setBusySafe(true);
        setOutcome('pending');
        setMessage('Confirming payment…');
        try {
          await verifyCfOrder(fromReturn);
        } finally {
          setBusySafe(false);
          clearCashfreeReturnQuery();
        }
        return;
      }
      await startPayment();
      return;
    }
    setBusySafe(true);
    setOutcome('pending');
    setMessage('Refreshing payment status…');
    try {
      await verifyCfOrder(cfOrderId);
    } finally {
      setBusySafe(false);
    }
  }, [cfOrderId, startPayment, verifyCfOrder]);

  useEffect(() => {
    if (!orderId || startedRef.current) return;
    startedRef.current = true;

    const returnedCf = readCashfreeReturnOrderId();
    if (returnedCf) {
      setCfOrderId(returnedCf);
      setOutcome('pending');
      setMessage('Confirming payment…');
      setBusySafe(true);
      verifyCfOrder(returnedCf).finally(() => {
        setBusySafe(false);
        clearCashfreeReturnQuery();
      });
      return;
    }

    if (params.autoStart !== false) {
      startPayment();
    }
  }, [orderId, params.autoStart, startPayment, verifyCfOrder]);

  const title =
    outcome === 'success'
      ? 'Payment successful'
      : outcome === 'failed'
        ? 'Payment failed'
        : outcome === 'pending' || outcome === 'initiating'
          ? 'Payment processing'
          : 'Complete payment';

  const accent =
    outcome === 'success'
      ? colors.success
      : outcome === 'failed'
        ? colors.error
        : colors.primary;

  const displayAmount =
    paidAmount != null && Number.isFinite(paidAmount)
      ? paidAmount
      : Number(params.orderTotal ?? order?.total ?? 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={[styles.kicker, { color: accent }]}>{title}</Text>
        <Text style={styles.message}>{message || ' '}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Order</Text>
          <Text style={styles.value}>#{orderId || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.value}>{formatCurrency(displayAmount || 0)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment status</Text>
          <Text style={[styles.value, { color: accent }]}>
            {outcome === 'success'
              ? 'PAID (verified)'
              : outcome === 'failed'
                ? 'UNPAID'
                : outcome === 'pending' || outcome === 'initiating'
                  ? 'Pending verification'
                  : 'Awaiting payment'}
          </Text>
        </View>
        {cfOrderId ? (
          <View style={styles.row}>
            <Text style={styles.label}>Payment ref</Text>
            <Text style={styles.valueMono} numberOfLines={2}>{cfOrderId}</Text>
          </View>
        ) : null}
        {order?.paymentStatus ? (
          <View style={styles.row}>
            <Text style={styles.label}>Order payment</Text>
            <Text style={styles.value}>{order.paymentStatus}</Text>
          </View>
        ) : null}

        <Text style={styles.hint}>
          Payment is confirmed only after the Natural Drops server verifies Cashfree. Closing checkout does not mark the order paid.
        </Text>
      </Card>

      <View style={styles.actions}>
        {outcome === 'success' ? (
          <>
            <Button title="View order" onPress={goOrderDetail} style={styles.btn} />
            <Button title="My orders" onPress={goOrders} variant="outline" style={styles.btn} />
          </>
        ) : (
          <>
            <Button
              title={busy ? 'Please wait…' : outcome === 'initiating' ? 'Starting…' : 'Retry payment'}
              onPress={startPayment}
              loading={busy}
              disabled={busy}
              style={styles.btn}
            />
            <Button
              title="Refresh status"
              onPress={refreshStatus}
              variant="outline"
              disabled={busy}
              style={styles.btn}
            />
            <Button title="View order" onPress={goOrderDetail} variant="outline" style={styles.btn} />
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { padding: spacing.lg },
  kicker: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  message: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  label: { color: colors.textSecondary, fontSize: typography.fontSize.sm },
  value: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
    flexShrink: 1,
    textAlign: 'right',
  },
  valueMono: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '60%',
  },
  hint: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    lineHeight: 18,
  },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  btn: { width: '100%' },
});

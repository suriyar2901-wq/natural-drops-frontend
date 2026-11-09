import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button, Card, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import {
  CashfreeOrderStatusResponse,
  useClaimSubscriptionPaymentMutation,
  useCreateCashfreeSubscriptionOrderMutation,
  useGetMySubscriptionClaimsQuery,
  useGetPlatformPaymentQuery,
  useLazyGetCashfreeSubscriptionStatusQuery,
} from '../../store/api/paymentApi';
import { useGetSellerSubscriptionQuery } from '../../store/api/shopApi';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { openCashfreeCheckout } from '../../utils/cashfreeCheckout';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type PayMethod = 'ONLINE' | 'CASH';

type RouteParams = {
  plan?: 'MONTHLY' | 'YEARLY';
  payMethod?: PayMethod | 'UPI';
  autoStart?: boolean;
};

export const SellerSubscriptionPayScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const params = (route.params || {}) as RouteParams;
  const { data: platform, isLoading } = useGetPlatformPaymentQuery();
  const { data: access, refetch: refetchAccess } = useGetSellerSubscriptionQuery(undefined, {
    pollingInterval: 8000,
  });
  const { data: claims = [], refetch } = useGetMySubscriptionClaimsQuery(undefined, {
    pollingInterval: 8000,
  });
  const [claimPayment, { isLoading: saving }] = useClaimSubscriptionPaymentMutation();
  const [createCashfreeSubscription] = useCreateCashfreeSubscriptionOrderMutation();
  const [fetchCashfreeStatus] = useLazyGetCashfreeSubscriptionStatusQuery();
  const [plan, setPlan] = useState<'MONTHLY' | 'YEARLY'>(params.plan === 'YEARLY' ? 'YEARLY' : 'MONTHLY');
  const initialMethod: PayMethod = params.payMethod === 'CASH' ? 'CASH' : 'ONLINE';
  const [payMethod, setPayMethod] = useState<PayMethod>(initialMethod);
  const [openingCashfree, setOpeningCashfree] = useState(false);
  const [cashRequested, setCashRequested] = useState(false);
  const autoStartedRef = useRef(false);
  const unlockedRef = useRef(false);

  const monthly = Number(platform?.planMonthlyAmount || 499);
  const yearly = Number(platform?.planYearlyAmount || 5389.2);
  const amount = plan === 'YEARLY' ? yearly : monthly;
  const pending = claims.find((item) => item.status === 'PENDING');
  const waitingForAdmin = !!(pending || cashRequested);

  useEffect(() => {
    if (params.plan === 'YEARLY' || params.plan === 'MONTHLY') {
      setPlan(params.plan);
    }
    if (params.payMethod === 'CASH') {
      setPayMethod('CASH');
    } else if (params.payMethod === 'ONLINE') {
      setPayMethod('ONLINE');
    }
  }, [params.plan, params.payMethod]);

  // Subscription activated → leave pay screen so seller can use the app.
  useEffect(() => {
    if (!access?.canWork || unlockedRef.current) return;
    unlockedRef.current = true;
    showSuccessToast('Subscription active. You can use the seller app now.');
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('SellerApp');
    }
  }, [access?.canWork, navigation]);

  const pollCashfreeUntilSettled = async (cfOrderId: string) => {
    let last: CashfreeOrderStatusResponse | undefined;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      if (attempt > 0) await sleep(1500);
      try {
        const status = await fetchCashfreeStatus(cfOrderId).unwrap();
        last = status;
        if (status?.paymentApplied || String(status?.cfOrderStatus || '').toUpperCase() === 'PAID') {
          return status;
        }
        const local = String(status?.status || '').toUpperCase();
        if (local === 'FAILED' || local === 'EXPIRED' || local === 'USER_DROPPED' || local === 'CANCELLED') {
          return status;
        }
      } catch {
        // keep polling briefly
      }
    }
    return last;
  };

  const payOnline = useCallback(async () => {
    if (pending) {
      showErrorToast('A cash request is already waiting for admin. Ask admin to confirm or reject it first.');
      return;
    }
    if (openingCashfree) return;
    setOpeningCashfree(true);
    try {
      const session = await createCashfreeSubscription({ plan }).unwrap();
      if (!session?.paymentSessionId || !session?.cfOrderId) {
        throw new Error('Server did not return a Cashfree payment session');
      }

      const checkout = await openCashfreeCheckout({
        paymentSessionId: session.paymentSessionId,
        cfOrderId: session.cfOrderId,
        environment: session.environment,
      });

      if (checkout.status === 'FAILED') {
        showErrorToast(checkout.message || 'Cashfree payment failed');
        return;
      }
      if (checkout.status === 'CANCELLED') {
        showErrorToast(checkout.message || 'Payment cancelled');
        return;
      }

      showSuccessToast('Verifying payment with server…');
      const status = await pollCashfreeUntilSettled(session.cfOrderId);
      if (status?.paymentApplied || String(status?.cfOrderStatus || '').toUpperCase() === 'PAID') {
        showSuccessToast(`${plan === 'YEARLY' ? 'Yearly' : 'Monthly'} subscription activated`);
        await Promise.all([refetch(), refetchAccess()]);
        return;
      }

      const local = String(status?.status || '').toUpperCase();
      if (local === 'FAILED' || local === 'EXPIRED' || local === 'USER_DROPPED' || local === 'CANCELLED') {
        showErrorToast('Payment was not completed. Try Pay online again, or send a hand-cash request.');
        return;
      }

      showErrorToast(
        'Payment is still pending. If money was deducted, wait a moment — the app unlocks when Cashfree confirms PAID.'
      );
      await Promise.all([refetch(), refetchAccess()]);
    } catch (error: any) {
      showErrorToast(error?.data?.message || error?.message || 'Could not start Cashfree payment');
    } finally {
      setOpeningCashfree(false);
    }
  }, [
    pending,
    openingCashfree,
    createCashfreeSubscription,
    plan,
    fetchCashfreeStatus,
    refetch,
    refetchAccess,
  ]);

  const requestCash = useCallback(async () => {
    if (pending) {
      setCashRequested(true);
      return;
    }
    try {
      await claimPayment({ plan, method: 'CASH' }).unwrap();
      setCashRequested(true);
      showSuccessToast('Request sent. Waiting for admin to mark cash received.');
      await Promise.all([refetch(), refetchAccess()]);
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not send cash request');
    }
  }, [pending, claimPayment, plan, refetch, refetchAccess]);

  // Auto-start from gate: open Cashfree or submit cash claim once.
  useEffect(() => {
    if (!params.autoStart || autoStartedRef.current || isLoading) return;
    autoStartedRef.current = true;
    if (payMethod === 'ONLINE') {
      const timer = setTimeout(() => {
        payOnline();
      }, 350);
      return () => clearTimeout(timer);
    }
    if (payMethod === 'CASH') {
      const timer = setTimeout(() => {
        requestCash();
      }, 200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [params.autoStart, isLoading, payMethod, payOnline, requestCash]);

  if (isLoading) {
    return <Loading fullScreen message="Loading subscription payment..." />;
  }

  if (waitingForAdmin && (payMethod === 'CASH' || pending?.method === 'CASH' || String(pending?.method || '').toUpperCase() === 'CASH')) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card style={styles.waitCard}>
          <Text style={styles.waitTitle}>Waiting for admin confirmation</Text>
          <Text style={styles.meta}>
            You sent a hand-cash request for {plan === 'YEARLY' ? 'Yearly' : 'Monthly'} · {formatCurrency(amount)}.
          </Text>
          <Text style={styles.meta}>
            After admin marks <Text style={styles.bold}>Cash received</Text>, your subscription activates and this screen closes automatically.
          </Text>
          {!!pending && (
            <Text style={styles.claimLine}>
              Status: {pending.status}
              {pending.createdAt ? ` · ${formatDateTime(pending.createdAt)}` : ''}
            </Text>
          )}
          <Button
            title="Refresh status"
            variant="outline"
            onPress={() => {
              refetch();
              refetchAccess();
            }}
            style={styles.refreshBtn}
          />
          <Button
            title="Back"
            variant="outline"
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('SellerApp'))}
          />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.title}>Pay subscription</Text>
        <Text style={styles.meta}>
          Current: {access?.plan || 'None'}
          {access?.expiryDate ? ` · expires ${access.expiryDate}` : ''}
        </Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.chip, plan === 'MONTHLY' && styles.chipActive]} onPress={() => setPlan('MONTHLY')}>
            <Text style={[styles.chipText, plan === 'MONTHLY' && styles.chipTextActive]}>Monthly {formatCurrency(monthly)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, plan === 'YEARLY' && styles.chipActive]} onPress={() => setPlan('YEARLY')}>
            <Text style={[styles.chipText, plan === 'YEARLY' && styles.chipTextActive]}>Yearly {formatCurrency(yearly)}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Payment method</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.chip, payMethod === 'ONLINE' && styles.chipActive]} onPress={() => setPayMethod('ONLINE')}>
            <Text style={[styles.chipText, payMethod === 'ONLINE' && styles.chipTextActive]}>Online (Cashfree)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, payMethod === 'CASH' && styles.chipActive]} onPress={() => setPayMethod('CASH')}>
            <Text style={[styles.chipText, payMethod === 'CASH' && styles.chipTextActive]}>Hand cash</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.payLabel}>Pay {formatCurrency(amount)}</Text>

        {payMethod === 'ONLINE' ? (
          <>
            <Text style={styles.meta}>
              Cashfree payment gateway opens here. After a successful payment, subscription activates and the seller app unlocks automatically.
            </Text>
            <Button
              title={openingCashfree ? 'Opening Cashfree…' : `Pay ${formatCurrency(amount)} online`}
              onPress={payOnline}
              disabled={openingCashfree || !!pending}
            />
            {!!pending && (
              <Text style={styles.warn}>A cash request is waiting for admin. Online pay is blocked until that is cleared.</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.meta}>
              Give cash to the admin by hand, then send a request. You will see a waiting screen until admin marks cash received.
            </Text>
            <Button
              title={saving ? 'Sending…' : 'Request admin — I paid by cash'}
              onPress={requestCash}
              disabled={saving || !!pending}
            />
          </>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  card: { padding: spacing.md, marginBottom: spacing.md },
  waitCard: { padding: spacing.lg, marginTop: spacing.lg },
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold },
  waitTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  meta: { color: colors.textSecondary, marginTop: 4, marginBottom: 4, lineHeight: 20 },
  bold: { fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  warn: { color: colors.warning, marginTop: spacing.sm },
  claimLine: { marginTop: spacing.md, color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  refreshBtn: { marginVertical: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  chip: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, alignItems: 'center' },
  chipActive: { borderColor: colors.primary, backgroundColor: '#E3F2FD' },
  chipText: { color: colors.textSecondary, textAlign: 'center' },
  chipTextActive: { color: colors.primary, fontWeight: typography.fontWeight.semibold },
  sectionLabel: { fontWeight: typography.fontWeight.semibold, marginTop: spacing.sm, color: colors.textPrimary },
  payLabel: { fontWeight: typography.fontWeight.semibold, marginTop: spacing.sm },
});

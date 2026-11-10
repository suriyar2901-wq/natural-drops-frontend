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
import {
  useGetMySubscriptionPaymentsQuery,
  useGetSellerSubscriptionQuery,
} from '../../store/api/shopApi';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { moneyValue } from '../../types/shop.types';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { openCashfreeCheckout } from '../../utils/cashfreeCheckout';
import {
  clearCashfreeReturnQuery,
  pollCashfreeFast,
  readCashfreeReturnOrderId,
  rememberCashfreeOrder,
} from '../../utils/cashfreeReturn';

type PayMethod = 'ONLINE' | 'CASH';

type RouteParams = {
  plan?: 'MONTHLY' | 'YEARLY';
  payMethod?: PayMethod | 'UPI';
  autoStart?: boolean;
  cf_order?: string;
};

const formatDateOnly = (value?: string | null) => {
  if (!value) return '—';
  const raw = String(value).slice(0, 10);
  const parts = raw.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return raw;
};

export const SellerSubscriptionPayScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const params = (route.params || {}) as RouteParams;
  const needsActivation = !!params.autoStart;

  const { data: platform, isLoading: platformLoading } = useGetPlatformPaymentQuery();
  const { data: access, isLoading: accessLoading, refetch: refetchAccess } = useGetSellerSubscriptionQuery();
  const { data: history = [], refetch: refetchHistory } = useGetMySubscriptionPaymentsQuery();
  const { data: claims = [], refetch: refetchClaims } = useGetMySubscriptionClaimsQuery();
  const [claimPayment, { isLoading: saving }] = useClaimSubscriptionPaymentMutation();
  const [createCashfreeSubscription] = useCreateCashfreeSubscriptionOrderMutation();
  const [fetchCashfreeStatus] = useLazyGetCashfreeSubscriptionStatusQuery();

  const [plan, setPlan] = useState<'MONTHLY' | 'YEARLY'>(params.plan === 'YEARLY' ? 'YEARLY' : 'MONTHLY');
  const [payMethod, setPayMethod] = useState<PayMethod>(params.payMethod === 'CASH' ? 'CASH' : 'ONLINE');
  const [openingCashfree, setOpeningCashfree] = useState(false);
  const [cashRequested, setCashRequested] = useState(false);
  const [showRenewForm, setShowRenewForm] = useState(!!params.autoStart);
  const [verifyingReturn, setVerifyingReturn] = useState(false);
  const autoStartedRef = useRef(false);
  const returnHandledRef = useRef(false);

  const monthly = Number(platform?.planMonthlyAmount || access?.monthlyAmount || 499);
  const yearly = Number(platform?.planYearlyAmount || access?.yearlyAmount || 5389.2);
  const amount = plan === 'YEARLY' ? yearly : monthly;
  const pending = claims.find((item) => item.status === 'PENDING');
  const waitingForAdmin = !!(pending || cashRequested);
  const active = !!access?.canWork && !!access?.subscribed;

  // Poll while waiting for Cashfree/admin — never reference `access` inside its own query options (TDZ crash).
  useEffect(() => {
    const shouldPoll = needsActivation || waitingForAdmin || (access != null && !access.canWork);
    if (!shouldPoll) return undefined;
    const timer = setInterval(() => {
      refetchAccess();
      refetchClaims();
      refetchHistory();
    }, 8000);
    return () => clearInterval(timer);
  }, [needsActivation, waitingForAdmin, access, refetchAccess, refetchClaims, refetchHistory]);

  useEffect(() => {
    if (params.plan === 'YEARLY' || params.plan === 'MONTHLY') setPlan(params.plan);
    if (params.payMethod === 'CASH') setPayMethod('CASH');
    else if (params.payMethod === 'ONLINE') setPayMethod('ONLINE');
    if (params.autoStart) setShowRenewForm(true);
  }, [params.plan, params.payMethod, params.autoStart]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refetchAccess(), refetchHistory(), refetchClaims()]);
  }, [refetchAccess, refetchHistory, refetchClaims]);

  const applyPaidResult = useCallback(async (status: CashfreeOrderStatusResponse | undefined, labelPlan: string) => {
    if (status?.paymentApplied || String(status?.cfOrderStatus || '').toUpperCase() === 'PAID') {
      showSuccessToast(`${labelPlan === 'YEARLY' ? 'Yearly' : 'Monthly'} subscription activated`);
      setShowRenewForm(false);
      setCashRequested(false);
      await refreshAll();
      return true;
    }
    const local = String(status?.status || '').toUpperCase();
    if (local === 'FAILED' || local === 'EXPIRED' || local === 'USER_DROPPED' || local === 'CANCELLED') {
      showErrorToast('Payment was not completed. Try again or send a hand-cash request.');
      return false;
    }
    showErrorToast(
      'Payment is still pending. If money was deducted, pull to refresh — status updates when Cashfree confirms PAID.'
    );
    await refreshAll();
    return false;
  }, [refreshAll]);

  const verifyReturnedPayment = useCallback(async (cfOrderId: string) => {
    setVerifyingReturn(true);
    try {
      const status = await pollCashfreeFast(
        () => fetchCashfreeStatus(cfOrderId).unwrap(),
        { maxAttempts: 14, gapMs: 400 }
      );
      await applyPaidResult(status, plan);
    } catch (error: any) {
      showErrorToast(error?.data?.message || error?.message || 'Could not verify payment');
      await refreshAll();
    } finally {
      setVerifyingReturn(false);
      clearCashfreeReturnQuery();
    }
  }, [applyPaidResult, fetchCashfreeStatus, plan, refreshAll]);

  // Cashfree return_url lands here — verify immediately so the app unlocks without waiting on blank thank-you.
  useEffect(() => {
    if (returnHandledRef.current) return;
    const fromParams = (params.cf_order || '').trim();
    const cfOrderId = fromParams || readCashfreeReturnOrderId();
    if (!cfOrderId) return;
    returnHandledRef.current = true;
    verifyReturnedPayment(cfOrderId);
  }, [params.cf_order, verifyReturnedPayment]);

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

      rememberCashfreeOrder(session.cfOrderId);
      const checkout = await openCashfreeCheckout({
        paymentSessionId: session.paymentSessionId,
        cfOrderId: session.cfOrderId,
        environment: session.environment,
      });

      // Full-page redirect (_self) leaves this screen; return_url handler will finish verification.
      if (checkout.status === 'UNKNOWN' && /redirect/i.test(checkout.message || '')) {
        return;
      }

      if (checkout.status === 'FAILED') {
        showErrorToast(checkout.message || 'Cashfree payment failed');
        return;
      }
      if (checkout.status === 'CANCELLED') {
        showErrorToast(checkout.message || 'Payment cancelled');
        return;
      }

      showSuccessToast('Confirming payment…');
      const status = await pollCashfreeFast(
        () => fetchCashfreeStatus(session.cfOrderId).unwrap(),
        { maxAttempts: 14, gapMs: 400 }
      );
      await applyPaidResult(status, plan);
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
    applyPaidResult,
  ]);

  const requestCash = useCallback(async () => {
    if (pending) {
      setCashRequested(true);
      setShowRenewForm(true);
      return;
    }
    try {
      await claimPayment({ plan, method: 'CASH' }).unwrap();
      setCashRequested(true);
      setShowRenewForm(true);
      showSuccessToast('Request sent. Waiting for admin to mark cash received.');
      await refreshAll();
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not send cash request');
    }
  }, [pending, claimPayment, plan, refreshAll]);

  // Only auto-start when gate sent the seller here for activation — not from More menu.
  useEffect(() => {
    if (!params.autoStart || autoStartedRef.current || platformLoading || accessLoading) return;
    if (access?.canWork) {
      autoStartedRef.current = true;
      return;
    }
    autoStartedRef.current = true;
    if (payMethod === 'ONLINE') {
      const timer = setTimeout(() => payOnline(), 350);
      return () => clearTimeout(timer);
    }
    if (payMethod === 'CASH') {
      const timer = setTimeout(() => requestCash(), 200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [params.autoStart, platformLoading, accessLoading, access?.canWork, payMethod, payOnline, requestCash]);

  if (platformLoading || accessLoading || verifyingReturn) {
    return (
      <Loading
        fullScreen
        message={verifyingReturn ? 'Confirming payment… unlocking subscription' : 'Loading subscription...'}
      />
    );
  }

  const showWaiting =
    waitingForAdmin
    && (payMethod === 'CASH'
      || String(pending?.method || '').toUpperCase() === 'CASH'
      || cashRequested);

  if (showWaiting && (!active || params.autoStart)) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card style={styles.waitCard}>
          <Text style={styles.waitTitle}>Waiting for admin confirmation</Text>
          <Text style={styles.meta}>
            Hand-cash request for {plan === 'YEARLY' ? 'Yearly' : 'Monthly'} · {formatCurrency(amount)}.
          </Text>
          <Text style={styles.meta}>
            After admin marks <Text style={styles.bold}>Cash received</Text>, your subscription updates here automatically.
          </Text>
          {!!pending && (
            <Text style={styles.claimLine}>
              Status: {pending.status}
              {pending.createdAt ? ` · ${formatDateTime(pending.createdAt)}` : ''}
            </Text>
          )}
          <Button title="Refresh status" variant="outline" onPress={refreshAll} style={styles.refreshBtn} />
          {active ? (
            <Button title="Back to subscription details" variant="outline" onPress={() => {
              setCashRequested(false);
              setShowRenewForm(false);
            }} />
          ) : (
            <Button
              title="Back"
              variant="outline"
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('SellerApp'))}
            />
          )}
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.title}>My subscription</Text>
        <Text style={styles.statusBadge}>{access?.status || (active ? 'Active' : 'Payment Pending')}</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Plan</Text>
          <Text style={styles.detailValue}>{access?.plan || 'None'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailValue}>
            {access?.amount != null ? formatCurrency(moneyValue(access.amount)) : '—'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Start date</Text>
          <Text style={styles.detailValue}>{formatDateOnly(access?.startDate)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>End date</Text>
          <Text style={styles.detailValue}>{formatDateOnly(access?.expiryDate)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Days left</Text>
          <Text style={styles.detailValue}>
            {access?.daysRemaining != null ? String(access.daysRemaining) : '—'}
          </Text>
        </View>

        {!!access?.reminderMessage && (
          <Text style={styles.reminder}>{access.reminderMessage}</Text>
        )}

        {!showRenewForm ? (
          <Button
            title={active ? 'Renew / extend subscription' : 'Subscribe now'}
            onPress={() => setShowRenewForm(true)}
            style={styles.primaryBtn}
          />
        ) : null}
      </Card>

      {showRenewForm ? (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>
            {active ? 'Renew subscription' : 'Activate subscription'}
          </Text>
          <Text style={styles.meta}>
            {active
              ? 'Paying again extends your end date from the current expiry (or today if already expired).'
              : 'Choose a plan and pay online, or request admin after paying by hand cash.'}
          </Text>

          <Text style={styles.sectionLabel}>Plan</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.chip, plan === 'MONTHLY' && styles.chipActive]} onPress={() => setPlan('MONTHLY')}>
              <Text style={[styles.chipText, plan === 'MONTHLY' && styles.chipTextActive]}>
                Monthly {formatCurrency(monthly)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, plan === 'YEARLY' && styles.chipActive]} onPress={() => setPlan('YEARLY')}>
              <Text style={[styles.chipText, plan === 'YEARLY' && styles.chipTextActive]}>
                Yearly {formatCurrency(yearly)}
              </Text>
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
                Opens Cashfree gateway. After success, start/end dates update and history refreshes automatically.
              </Text>
              <Button
                title={openingCashfree ? 'Opening Cashfree…' : `Pay ${formatCurrency(amount)} online`}
                onPress={payOnline}
                disabled={openingCashfree || !!pending}
              />
              {!!pending && (
                <Text style={styles.warn}>A cash request is waiting for admin. Clear it before paying online.</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.meta}>
                Pay admin by hand, then send a request. You will see a waiting screen until they mark cash received.
              </Text>
              <Button
                title={saving ? 'Sending…' : 'Request admin — I paid by cash'}
                onPress={requestCash}
                disabled={saving || !!pending}
              />
            </>
          )}

          {active ? (
            <Button title="Cancel" variant="outline" onPress={() => setShowRenewForm(false)} style={styles.cancelBtn} />
          ) : null}
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>Subscription history</Text>
      {history.length === 0 ? (
        <Text style={styles.meta}>No subscription payments yet.</Text>
      ) : (
        history.map((payment) => (
          <Card key={payment.id} style={styles.historyCard}>
            <Text style={styles.historyTitle}>
              {payment.plan || 'Plan'} · {formatCurrency(moneyValue(payment.amount))} · {payment.status || '—'}
            </Text>
            <Text style={styles.meta}>
              {payment.method || '—'}
              {payment.paidAt ? ` · ${formatDateTime(payment.paidAt)}` : payment.createdAt ? ` · ${formatDateTime(payment.createdAt)}` : ''}
            </Text>
            {!!payment.transactionCode && <Text style={styles.meta}>Txn {payment.transactionCode}</Text>}
            {!!payment.gatewayRef && <Text style={styles.meta}>Ref {payment.gatewayRef}</Text>}
            {!!payment.note && <Text style={styles.meta}>{payment.note}</Text>}
          </Card>
        ))
      )}

      {!!pending && !showWaiting ? (
        <Card style={styles.pendingCard}>
          <Text style={styles.historyTitle}>Pending admin confirmation</Text>
          <Text style={styles.meta}>
            {pending.plan} · {formatCurrency(moneyValue(pending.amount))} · {pending.method || 'CASH'}
          </Text>
          <Button
            title="View waiting screen"
            variant="outline"
            onPress={() => {
              setPayMethod('CASH');
              setCashRequested(true);
              setShowRenewForm(true);
            }}
          />
        </Card>
      ) : null}
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
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#E3F2FD',
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: { color: colors.textSecondary },
  detailValue: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  reminder: { marginTop: spacing.sm, color: colors.warning },
  primaryBtn: { marginTop: spacing.md },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  sectionLabel: { fontWeight: typography.fontWeight.semibold, marginTop: spacing.sm, color: colors.textPrimary },
  payLabel: { fontWeight: typography.fontWeight.semibold, marginTop: spacing.sm, marginBottom: spacing.xs },
  meta: { color: colors.textSecondary, marginTop: 4, marginBottom: 4, lineHeight: 20 },
  bold: { fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  warn: { color: colors.warning, marginTop: spacing.sm },
  claimLine: { marginTop: spacing.md, color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  refreshBtn: { marginVertical: spacing.md },
  cancelBtn: { marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  chip: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, alignItems: 'center' },
  chipActive: { borderColor: colors.primary, backgroundColor: '#E3F2FD' },
  chipText: { color: colors.textSecondary, textAlign: 'center' },
  chipTextActive: { color: colors.primary, fontWeight: typography.fontWeight.semibold },
  historyCard: { padding: spacing.md, marginBottom: spacing.sm },
  historyTitle: { fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  pendingCard: { padding: spacing.md, marginTop: spacing.sm, marginBottom: spacing.sm },
});

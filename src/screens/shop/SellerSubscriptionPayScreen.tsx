import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'qrcode';
import { Button, Card, Input, Loading } from '../../components/common';
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

type PayMethod = 'ONLINE' | 'UPI';

export const SellerSubscriptionPayScreen = () => {
  const { data: platform, isLoading } = useGetPlatformPaymentQuery();
  const { data: access, refetch: refetchAccess } = useGetSellerSubscriptionQuery();
  const { data: claims = [], refetch } = useGetMySubscriptionClaimsQuery();
  const [claimPayment, { isLoading: saving }] = useClaimSubscriptionPaymentMutation();
  const [createCashfreeSubscription] = useCreateCashfreeSubscriptionOrderMutation();
  const [fetchCashfreeStatus] = useLazyGetCashfreeSubscriptionStatusQuery();
  const [plan, setPlan] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [payMethod, setPayMethod] = useState<PayMethod>('ONLINE');
  const [upiReference, setUpiReference] = useState('');
  const [generatedQr, setGeneratedQr] = useState('');
  const [openingCashfree, setOpeningCashfree] = useState(false);

  const monthly = Number(platform?.planMonthlyAmount || 499);
  const yearly = Number(platform?.planYearlyAmount || 5389.2);
  const amount = plan === 'YEARLY' ? yearly : monthly;
  const uploadedQr = platform?.qrCodeImage && platform.qrCodeImage.startsWith('data:image') ? platform.qrCodeImage : '';
  const upiId = (platform?.upiId || '').trim();

  useEffect(() => {
    if (uploadedQr || !upiId || payMethod !== 'UPI') {
      setGeneratedQr('');
      return undefined;
    }
    let active = true;
    const payload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('Natural Drops')}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(plan + ' subscription')}`;
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
  }, [uploadedQr, upiId, amount, plan, payMethod]);

  if (isLoading) {
    return <Loading fullScreen message="Loading subscription payment..." />;
  }

  const shownQr = uploadedQr || generatedQr;
  const pending = claims.find((item) => item.status === 'PENDING');

  const pollCashfreeUntilSettled = async (cfOrderId: string) => {
    let last: CashfreeOrderStatusResponse | undefined;
    for (let attempt = 0; attempt < 12; attempt += 1) {
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

  const payOnline = async () => {
    if (pending) {
      showErrorToast('A UPI payment is already waiting for admin. Finish that first, or ask admin to reject it.');
      return;
    }
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
        showSuccessToast(`${plan === 'YEARLY' ? 'Yearly' : 'Monthly'} subscription activated via Cashfree`);
        await Promise.all([refetch(), refetchAccess()]);
        return;
      }

      const local = String(status?.status || '').toUpperCase();
      if (local === 'FAILED' || local === 'EXPIRED' || local === 'USER_DROPPED' || local === 'CANCELLED') {
        showErrorToast('Payment was not completed. You can try online pay again or use UPI.');
        return;
      }

      showErrorToast(
        'Payment is still pending. If money was deducted, wait a moment and refresh — subscription updates when Cashfree confirms PAID.'
      );
      await Promise.all([refetch(), refetchAccess()]);
    } catch (error: any) {
      showErrorToast(error?.data?.message || error?.message || 'Could not start Cashfree payment');
    } finally {
      setOpeningCashfree(false);
    }
  };

  const saveUpiClaim = async () => {
    if (pending) {
      showErrorToast('A payment is already waiting for admin confirmation');
      return;
    }
    if (!upiId && !uploadedQr) {
      showErrorToast('Admin has not added a UPI ID or QR yet');
      return;
    }
    try {
      await claimPayment({
        plan,
        method: 'UPI',
        upiReference: upiReference.trim() || undefined,
      }).unwrap();
      showSuccessToast('Payment sent. Admin will confirm after checking UPI.');
      setUpiReference('');
      refetch();
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not submit payment');
    }
  };

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
          <TouchableOpacity style={[styles.chip, payMethod === 'UPI' && styles.chipActive]} onPress={() => setPayMethod('UPI')}>
            <Text style={[styles.chipText, payMethod === 'UPI' && styles.chipTextActive]}>UPI to admin</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.payLabel}>Pay {formatCurrency(amount)}</Text>

        {payMethod === 'ONLINE' ? (
          <>
            <Text style={styles.meta}>
              Pay online with UPI, card, or net banking via Cashfree. Subscription activates automatically after payment succeeds — no admin confirm needed.
            </Text>
            <Button
              title={openingCashfree ? 'Opening Cashfree…' : `Pay ${formatCurrency(amount)} online`}
              onPress={payOnline}
              disabled={openingCashfree || !!pending}
            />
            {!!pending && (
              <Text style={styles.warn}>A UPI claim is waiting for admin. Online pay is blocked until that is cleared.</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.upiId}>{upiId || 'Admin UPI not set'}</Text>
            {shownQr ? (
              <Image source={{ uri: shownQr }} style={styles.qr} resizeMode="contain" />
            ) : (
              <Text style={styles.meta}>Ask admin to upload a payment QR in More → Platform payment.</Text>
            )}
            <Text style={styles.meta}>Pay in your UPI app, then tap I paid. The bill stays waiting until admin confirms.</Text>
            <Input
              label="UPI reference (optional)"
              value={upiReference}
              onChangeText={setUpiReference}
              placeholder="Transaction / UTR number"
              autoCapitalize="characters"
            />
            <Button
              title={saving ? 'Submitting…' : pending ? 'Waiting for admin' : 'I paid this amount'}
              onPress={saveUpiClaim}
              disabled={saving || !!pending}
            />
          </>
        )}
      </Card>

      <Text style={styles.sectionTitle}>My payment claims</Text>
      {claims.length === 0 ? (
        <Text style={styles.meta}>No subscription payment claims yet.</Text>
      ) : (
        claims.slice(0, 8).map((claim) => (
          <Card key={claim.id} style={styles.claimCard}>
            <Text style={styles.claimTitle}>{claim.plan} · {formatCurrency(Number(claim.amount))} · {claim.status}</Text>
            <Text style={styles.meta}>{claim.createdAt ? formatDateTime(claim.createdAt) : ''}</Text>
            {!!claim.upiReference && <Text style={styles.meta}>Ref {claim.upiReference}</Text>}
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  card: { padding: spacing.md, marginBottom: spacing.md },
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold },
  meta: { color: colors.textSecondary, marginTop: 4, marginBottom: 4 },
  warn: { color: colors.warning, marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  chip: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, alignItems: 'center' },
  chipActive: { borderColor: colors.primary, backgroundColor: '#E3F2FD' },
  chipText: { color: colors.textSecondary, textAlign: 'center' },
  chipTextActive: { color: colors.primary, fontWeight: typography.fontWeight.semibold },
  sectionLabel: { fontWeight: typography.fontWeight.semibold, marginTop: spacing.sm, color: colors.textPrimary },
  payLabel: { fontWeight: typography.fontWeight.semibold, marginTop: spacing.sm },
  upiId: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginVertical: spacing.sm },
  qr: { width: 220, height: 220, alignSelf: 'center', marginVertical: spacing.sm },
  sectionTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm },
  claimCard: { padding: spacing.md, marginBottom: spacing.sm },
  claimTitle: { fontWeight: typography.fontWeight.semibold },
});

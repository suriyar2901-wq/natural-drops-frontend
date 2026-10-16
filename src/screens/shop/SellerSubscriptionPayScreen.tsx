import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'qrcode';
import { Button, Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import {
  useClaimSubscriptionPaymentMutation,
  useGetMySubscriptionClaimsQuery,
  useGetPlatformPaymentQuery,
} from '../../store/api/paymentApi';
import { useGetSellerSubscriptionQuery } from '../../store/api/shopApi';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

export const SellerSubscriptionPayScreen = () => {
  const { data: platform, isLoading } = useGetPlatformPaymentQuery();
  const { data: access } = useGetSellerSubscriptionQuery();
  const { data: claims = [], refetch } = useGetMySubscriptionClaimsQuery();
  const [claimPayment, { isLoading: saving }] = useClaimSubscriptionPaymentMutation();
  const [plan, setPlan] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [upiReference, setUpiReference] = useState('');
  const [generatedQr, setGeneratedQr] = useState('');

  const monthly = Number(platform?.planMonthlyAmount || 499);
  const yearly = Number(platform?.planYearlyAmount || 5389.2);
  const amount = plan === 'YEARLY' ? yearly : monthly;
  const uploadedQr = platform?.qrCodeImage && platform.qrCodeImage.startsWith('data:image') ? platform.qrCodeImage : '';
  const upiId = (platform?.upiId || '').trim();

  useEffect(() => {
    if (uploadedQr || !upiId) {
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
  }, [uploadedQr, upiId, amount, plan]);

  if (isLoading) {
    return <Loading fullScreen message="Loading subscription payment..." />;
  }

  const shownQr = uploadedQr || generatedQr;
  const pending = claims.find((item) => item.status === 'PENDING');

  const save = async () => {
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
        <Text style={styles.payLabel}>Pay {formatCurrency(amount)} to admin</Text>
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
          onPress={save}
          disabled={saving || !!pending}
        />
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
  row: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  chip: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, alignItems: 'center' },
  chipActive: { borderColor: colors.primary, backgroundColor: '#E3F2FD' },
  chipText: { color: colors.textSecondary, textAlign: 'center' },
  chipTextActive: { color: colors.primary, fontWeight: typography.fontWeight.semibold },
  payLabel: { fontWeight: typography.fontWeight.semibold, marginTop: spacing.sm },
  upiId: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginVertical: spacing.sm },
  qr: { width: 220, height: 220, alignSelf: 'center', marginVertical: spacing.sm },
  sectionTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm },
  claimCard: { padding: spacing.md, marginBottom: spacing.sm },
  claimTitle: { fontWeight: typography.fontWeight.semibold },
});

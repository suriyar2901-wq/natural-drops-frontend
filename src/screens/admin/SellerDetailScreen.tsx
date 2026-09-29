import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input, Loading, StatusPill } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import {
  useDeactivateAdminSellerMutation,
  useGetAdminSellerQuery,
  useReactivateAdminSellerMutation,
  useRenewAdminSubscriptionMutation,
} from '../../store/api/platformAdminApi';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const REASONS = ['Business Closed', 'Seller Requested', 'Payment Issue', 'Admin Decision', 'Other'];

export const SellerDetailScreen = ({ navigation, route }: any) => {
  const sellerId = route?.params?.sellerId;
  const { data: seller, isLoading, refetch } = useGetAdminSellerQuery(sellerId, { skip: !sellerId });
  const [deactivate, { isLoading: deactivating }] = useDeactivateAdminSellerMutation();
  const [reactivate, { isLoading: reactivating }] = useReactivateAdminSellerMutation();
  const [renew, { isLoading: renewing }] = useRenewAdminSubscriptionMutation();
  const [reason, setReason] = useState(REASONS[0]);
  const [adminNote, setAdminNote] = useState('');
  const [renewPlan, setRenewPlan] = useState(seller?.plan || 'MONTHLY');

  if (isLoading || !seller) {
    return <Loading fullScreen message="Loading seller..." />;
  }

  const handleDeactivate = async () => {
    try {
      await deactivate({ id: seller.id, reason, adminNote }).unwrap();
      Alert.alert('Updated', 'Seller deactivated. Payment will not auto-reactivate this account.');
      refetch();
    } catch (e: any) {
      Alert.alert('Failed', e?.data?.message || e?.message || 'Could not deactivate seller');
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivate({ id: seller.id, adminNote }).unwrap();
      Alert.alert('Updated', 'Seller reactivated.');
      refetch();
    } catch (e: any) {
      Alert.alert('Failed', e?.data?.message || e?.message || 'Could not reactivate seller');
    }
  };

  const handleRenew = async () => {
    try {
      await renew({ sellerId: seller.id, plan: renewPlan || seller.plan || 'MONTHLY' }).unwrap();
      Alert.alert('Renewed', 'Cash renewal recorded and subscription extended.');
      refetch();
    } catch (e: any) {
      Alert.alert('Failed', e?.data?.message || e?.message || 'Could not renew subscription');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{seller.businessName}</Text>
      <Text style={styles.subtitle}>{seller.sellerCode} • {seller.ownerName}</Text>

      <View style={styles.pills}>
        <StatusPill label={seller.accountStatus} />
        <StatusPill label={seller.subscriptionStatus} />
        <StatusPill label={seller.paymentStatus} />
      </View>

      <Card style={styles.card}>
        <Text style={styles.section}>Seller information</Text>
        <Row label="Company code" value={seller.companyCode || seller.sellerCode} />
        <Row label="Mobile" value={seller.mobile} />
        <Row label="Alternate" value={seller.alternateMobile || '—'} />
        <Row label="Email" value={seller.email || '—'} />
        <Row label="Address" value={seller.businessAddress} />
        <Row label="Area / City" value={`${seller.area}, ${seller.city} ${seller.pincode}`} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>Subscription</Text>
        <Row label="Plan" value={`${seller.plan || 'MONTHLY'} • ${formatCurrency(seller.amount)}`} />
        <Row label="Start" value={seller.startDate || '—'} />
        <Row label="Expiry" value={seller.expiryDate ? `${seller.expiryDate} (${seller.daysRemaining} days)` : '—'} />
        <Text style={styles.hint}>Early renewal extends from the current expiry. Expired renewals start from payment date.</Text>
        <View style={styles.rowBtns}>
          <Button title="Monthly" variant={renewPlan === 'MONTHLY' ? 'primary' : 'outline'} onPress={() => setRenewPlan('MONTHLY')} />
          <Button title="Yearly" variant={renewPlan === 'YEARLY' ? 'primary' : 'outline'} onPress={() => setRenewPlan('YEARLY')} />
        </View>
        <Button title={renewing ? 'Renewing…' : 'Record Cash Renewal'} onPress={handleRenew} loading={renewing} fullWidth style={styles.mt} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>Payment history</Text>
        {(seller.payments || []).length === 0 ? (
          <Text style={styles.hint}>No payments yet.</Text>
        ) : (seller.payments || []).map((payment) => (
          <View key={payment.id} style={styles.payRow}>
            <Text style={styles.payTitle}>{payment.transactionCode} • {formatCurrency(payment.amount)}</Text>
            <Text style={styles.hint}>{payment.method} • {payment.paidAt ? formatDateTime(payment.paidAt) : '—'}</Text>
            <StatusPill label={payment.status} />
          </View>
        ))}
        <Button title="View all payments" variant="outline" onPress={() => navigation.navigate('PaymentList')} style={styles.mt} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>Account management</Text>
        <Text style={styles.hint}>Deactivating stops seller app access. Payment does not auto-reactivate a deactivated account.</Text>
        {seller.accountStatus === 'DEACTIVATED' ? (
          <Button title={reactivating ? 'Reactivating…' : 'Reactivate Seller'} onPress={handleReactivate} loading={reactivating} fullWidth />
        ) : (
          <>
            <Input label="Reason *" value={reason} onChangeText={setReason} />
            <Input label="Admin note" value={adminNote} onChangeText={setAdminNote} />
            <Button title={deactivating ? 'Deactivating…' : 'Deactivate Seller'} variant="secondary" onPress={handleDeactivate} loading={deactivating} fullWidth />
          </>
        )}
      </Card>

      <Button title="Edit Seller" onPress={() => navigation.navigate('EditSeller', { sellerId: seller.id })} fullWidth />
      {seller.subscriptionStatus === 'Payment Pending' && (
        <Button title="Record Initial Payment" variant="outline" onPress={() => navigation.navigate('ActivatePayment', { sellerId: seller.id })} style={styles.mt} fullWidth />
      )}
    </ScrollView>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  card: { padding: spacing.md, marginBottom: spacing.md },
  section: { fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm },
  hint: { color: colors.textSecondary, marginVertical: spacing.sm },
  infoRow: { marginBottom: spacing.sm },
  label: { color: colors.textSecondary, fontSize: typography.fontSize.sm },
  value: { color: colors.textPrimary, fontSize: typography.fontSize.base },
  rowBtns: { flexDirection: 'row', gap: spacing.sm },
  mt: { marginTop: spacing.sm },
  payRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm },
  payTitle: { fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
});

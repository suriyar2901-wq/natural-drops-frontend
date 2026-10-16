import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'qrcode';
import { Button, Card, Input, Loading } from '../../components/common';
import { borderRadius, colors, spacing, typography } from '../../theme';
import {
  useConfirmSubscriptionClaimMutation,
  useGetPendingSubscriptionClaimsQuery,
  useGetPlatformPaymentQuery,
  useRejectSubscriptionClaimMutation,
  useSavePlatformPaymentMutation,
} from '../../store/api/paymentApi';
import { pickProfileImage } from '../../utils/imageUtils';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

export const AdminPlatformPaymentScreen = () => {
  const { data, isLoading, refetch } = useGetPlatformPaymentQuery();
  const { data: pending = [], refetch: refetchClaims } = useGetPendingSubscriptionClaimsQuery();
  const [savePayment, { isLoading: saving }] = useSavePlatformPaymentMutation();
  const [confirmClaim, { isLoading: confirming }] = useConfirmSubscriptionClaimMutation();
  const [rejectClaim, { isLoading: rejecting }] = useRejectSubscriptionClaimMutation();
  const [editing, setEditing] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [qrData, setQrData] = useState('');
  const [temporaryQr, setTemporaryQr] = useState('');

  useEffect(() => {
    if (editing) return;
    setUpiId(data?.upiId || '');
    setQrData(data?.qrCodeImage && data.qrCodeImage.startsWith('data:image') ? data.qrCodeImage : '');
  }, [data, editing]);

  useEffect(() => {
    if (!upiId.trim()) {
      setTemporaryQr('');
      return undefined;
    }
    let active = true;
    QRCode.toDataURL(`upi://pay?pa=${encodeURIComponent(upiId.trim())}&pn=${encodeURIComponent('Natural Drops')}&cu=INR`, {
      width: 280,
      margin: 1,
      color: { dark: '#0232AA', light: '#FFFFFF' },
    }).then((image) => {
      if (active) setTemporaryQr(image);
    }).catch(() => {
      if (active) setTemporaryQr('');
    });
    return () => {
      active = false;
    };
  }, [upiId]);

  if (isLoading) {
    return <Loading fullScreen message="Loading payment details..." />;
  }

  const shownQr = qrData || temporaryQr;

  const save = async () => {
    if (upiId.trim() && !/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
      showErrorToast('Enter a valid UPI ID, for example watercan@upi');
      return;
    }
    try {
      await savePayment({ upiId: upiId.trim(), qrCodeImage: qrData }).unwrap();
      setEditing(false);
      showSuccessToast('Platform payment details saved');
      refetch();
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not save payment details');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{editing ? 'Edit payment QR' : 'Platform payment'}</Text>
            <Text style={styles.subtitle}>Sellers pay subscription here</Text>
          </View>
          {!editing && (
            <Button title="Edit" onPress={() => setEditing(true)} variant="outline" size="small" style={styles.editButton} />
          )}
        </View>

        {editing ? (
          <Input
            label="UPI ID"
            value={upiId}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="example watercan@upi"
            onChangeText={setUpiId}
          />
        ) : (
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>UPI ID</Text>
            <Text style={styles.infoValue}>{upiId || 'Not specified'}</Text>
          </View>
        )}

        <Text style={styles.blockTitle}>Payment QR</Text>
        {shownQr ? (
          <Image source={{ uri: shownQr }} style={styles.qr} resizeMode="contain" />
        ) : (
          <View style={styles.qrPlaceholder}>
            <Ionicons name="qr-code-outline" size={48} color={colors.primary} />
          </View>
        )}
        {editing && (
          <Button
            title="Upload QR photo"
            variant="outline"
            onPress={async () => {
              const image = await pickProfileImage();
              if (image) setQrData(image);
            }}
            disabled={saving}
          />
        )}
        {editing && (
          <View style={styles.buttonRow}>
            <Button title="Cancel" variant="outline" onPress={() => setEditing(false)} style={styles.actionButton} disabled={saving} />
            <Button title={saving ? 'Saving…' : 'Save'} onPress={save} style={styles.actionButton} disabled={saving} />
          </View>
        )}
      </Card>

      <Text style={styles.sectionTitle}>Waiting for confirmation</Text>
      {pending.length === 0 ? (
        <Text style={styles.empty}>No seller subscription payments waiting.</Text>
      ) : (
        pending.map((claim) => (
          <Card key={claim.id} style={styles.claimCard}>
            <Text style={styles.claimTitle}>{claim.plan || 'Subscription'} · {formatCurrency(Number(claim.amount))}</Text>
            <Text style={styles.meta}>{claim.method || 'UPI'}{claim.upiReference ? ` · Ref ${claim.upiReference}` : ''}</Text>
            <Text style={styles.meta}>{claim.note || ''}</Text>
            <Text style={styles.meta}>{claim.createdAt ? formatDateTime(claim.createdAt) : ''}</Text>
            <View style={styles.buttonRow}>
              <Button
                title="Reject"
                variant="outline"
                size="small"
                style={styles.actionButton}
                disabled={confirming || rejecting}
                onPress={async () => {
                  try {
                    await rejectClaim({ id: claim.id }).unwrap();
                    showSuccessToast('Payment rejected');
                    refetchClaims();
                  } catch (error: any) {
                    showErrorToast(error?.data?.message || 'Could not reject');
                  }
                }}
              />
              <Button
                title="Confirm"
                size="small"
                style={styles.actionButton}
                disabled={confirming || rejecting}
                onPress={async () => {
                  try {
                    await confirmClaim(claim.id).unwrap();
                    showSuccessToast('Subscription activated');
                    refetchClaims();
                  } catch (error: any) {
                    showErrorToast(error?.data?.message || 'Could not confirm');
                  }
                }}
              />
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  card: { padding: spacing.lg, marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  headerText: { flex: 1 },
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  subtitle: { marginTop: 4, color: colors.primary, fontWeight: typography.fontWeight.semibold },
  editButton: { minWidth: 72 },
  infoCell: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoLabel: { color: colors.textSecondary, marginBottom: 4 },
  infoValue: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold },
  blockTitle: { fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm, marginTop: spacing.sm },
  qr: { width: 220, height: 220, alignSelf: 'center', backgroundColor: colors.white },
  qrPlaceholder: {
    width: 220,
    height: 220,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue50,
    borderRadius: borderRadius.xs,
  },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionButton: { flex: 1 },
  sectionTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm },
  empty: { color: colors.textSecondary, marginBottom: spacing.md },
  claimCard: { padding: spacing.md, marginBottom: spacing.sm },
  claimTitle: { fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base },
  meta: { color: colors.textSecondary, marginTop: 2 },
});

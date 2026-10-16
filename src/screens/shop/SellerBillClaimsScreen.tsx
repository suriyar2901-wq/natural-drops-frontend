import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import {
  useConfirmOrderClaimMutation,
  useGetPendingOrderClaimsQuery,
  useRejectOrderClaimMutation,
} from '../../store/api/paymentApi';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

export const SellerBillClaimsScreen = () => {
  const { data: pending = [], isLoading, refetch } = useGetPendingOrderClaimsQuery();
  const [confirmClaim, { isLoading: confirming }] = useConfirmOrderClaimMutation();
  const [rejectClaim, { isLoading: rejecting }] = useRejectOrderClaimMutation();

  if (isLoading) {
    return <Loading fullScreen message="Loading buyer payments..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Buyer bill payments</Text>
      <Text style={styles.meta}>Confirm only after the money shows in your UPI app. Then the buyer bill becomes Paid.</Text>
      {pending.length === 0 ? (
        <Text style={styles.empty}>No buyer payments waiting.</Text>
      ) : (
        pending.map((claim) => (
          <Card key={claim.id} style={styles.card}>
            <Text style={styles.claimTitle}>Order #{claim.orderId} · {formatCurrency(Number(claim.amount))}</Text>
            <Text style={styles.meta}>{claim.method || 'UPI'}{claim.upiReference ? ` · Ref ${claim.upiReference}` : ''}</Text>
            <Text style={styles.meta}>{claim.note || ''}</Text>
            <Text style={styles.meta}>{claim.createdAt ? formatDateTime(claim.createdAt) : ''}</Text>
            <View style={styles.row}>
              <Button
                title="Reject"
                variant="outline"
                size="small"
                style={styles.btn}
                disabled={confirming || rejecting}
                onPress={async () => {
                  try {
                    await rejectClaim({ id: claim.id }).unwrap();
                    showSuccessToast('Payment rejected');
                    refetch();
                  } catch (error: any) {
                    showErrorToast(error?.data?.message || 'Could not reject');
                  }
                }}
              />
              <Button
                title="Confirm paid"
                size="small"
                style={styles.btn}
                disabled={confirming || rejecting}
                onPress={async () => {
                  try {
                    await confirmClaim(claim.id).unwrap();
                    showSuccessToast('Bill updated to paid');
                    refetch();
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
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs },
  meta: { color: colors.textSecondary, marginBottom: spacing.sm },
  empty: { color: colors.textSecondary, marginTop: spacing.lg },
  card: { padding: spacing.md, marginBottom: spacing.sm },
  claimTitle: { fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1 },
});

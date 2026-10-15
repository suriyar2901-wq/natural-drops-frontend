import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { Button, Card, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetBuyerAccountSummaryQuery, useMarkCansReadyMutation } from '../../store/api/buyerAccountApi';
import { canEventQuantity, canEventType } from '../../types/shop.types';
import { formatDateTime } from '../../utils/formatters';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

export const BuyerEmptyCansScreen = () => {
  const { data, isLoading } = useGetBuyerAccountSummaryQuery();
  const [markReady, { isLoading: sending }] = useMarkCansReadyMutation();
  const [quantity, setQuantity] = useState('');
  const holding = data?.emptyCans || 0;
  const readyCount = quantity.trim() ? Number(quantity) : holding;

  if (isLoading) {
    return <Loading fullScreen message="Loading empty cans..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Empty Cans</Text>
      <Card style={styles.card}>
        <Text style={styles.stat}>{data?.emptyCans || 0}</Text>
        <Text style={styles.meta}>20 litre cans still with you. Return these to the seller.</Text>
        <Text style={styles.meta}>
          Given {(() => {
            const events = data?.canEvents || [];
            const qty = (type: string) => events.filter((event) => canEventType(event) === type).reduce((sum, event) => sum + canEventQuantity(event), 0);
            const returned = qty('RETURNED');
            return Math.max(qty('ISSUED'), (data?.emptyCans || 0) + returned + qty('DAMAGED') + qty('MISSING'));
          })()}
          {' • '}
          Returned {(() => {
            const events = data?.canEvents || [];
            return events.filter((event) => canEventType(event) === 'RETURNED').reduce((sum, event) => sum + canEventQuantity(event), 0);
          })()}
        </Text>
        {!data?.customer && (
          <Text style={styles.meta}>No shop account is linked yet. Ask the seller to add your mobile as a customer.</Text>
        )}
        <Text style={styles.readyLabel}>Cans ready at the door</Text>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          placeholder={holding ? String(holding) : '0'}
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
        />
        <Button
          title={sending ? 'Sending…' : 'Cans are ready for pickup'}
          onPress={async () => {
            if (!holding || !readyCount || readyCount < 1 || readyCount > holding) {
              showErrorToast(holding ? `Enter 1 to ${holding} cans` : 'You have no empty cans to return');
              return;
            }
            try {
              await markReady({ quantity: readyCount }).unwrap();
              showSuccessToast('Seller notified. They can pick up the cans.');
            } catch (error: any) {
              showErrorToast(error?.data?.message || 'Could not notify the seller');
            }
          }}
          disabled={sending || holding < 1}
        />
      </Card>
      {(data?.canEvents || []).map((event) => (
        <Card key={event.id} style={styles.row}>
          <Text style={styles.name}>{event.copy}</Text>
          <Text style={styles.meta}>{formatDateTime(event.occurredAt)}</Text>
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
  meta: { color: colors.textSecondary, marginTop: 4 },
  row: { padding: spacing.md, marginBottom: spacing.sm },
  name: { fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  readyLabel: { marginTop: spacing.md, marginBottom: spacing.xs, color: colors.textPrimary, fontWeight: typography.fontWeight.bold },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
});

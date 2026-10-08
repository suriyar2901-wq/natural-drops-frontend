import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { formatDeliverySlot } from '../../utils/formatters';

export const DeliverySlotBadge = ({ order }: { order?: { scheduledDeliveryDate?: string; estimatedDelivery?: string; billingNotes?: string } | null }) => {
  const label = formatDeliverySlot(order);
  const note = order?.billingNotes?.trim();
  if (!label && !note) return null;
  return (
    <View>
      {!!label && (
        <View style={styles.badge}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={styles.text}>{label}</Text>
        </View>
      )}
      {!!note && <Text style={styles.note}>Note: {note}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  text: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  note: {
    marginTop: 4,
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
  },
});

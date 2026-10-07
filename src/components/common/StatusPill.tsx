import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

const TONE: Record<string, { bg: string; fg: string }> = {
  ACTIVE: { bg: colors.successTint, fg: colors.success },
  Active: { bg: colors.successTint, fg: colors.success },
  SUCCESSFUL: { bg: colors.successTint, fg: colors.success },
  PENDING: { bg: colors.warningTint, fg: colors.warning },
  'Payment Pending': { bg: colors.warningTint, fg: colors.warning },
  'Expiring Soon': { bg: colors.warningTint, fg: colors.warning },
  FAILED: { bg: colors.errorTint, fg: colors.error },
  Expired: { bg: colors.errorTint, fg: colors.error },
  DEACTIVATED: { bg: colors.gray100, fg: colors.textSecondary },
};

export const StatusPill = ({ label }: { label?: string }) => {
  if (!label) return null;
  const tone = TONE[label] || { bg: colors.gray200, fg: colors.textSecondary };
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.fg }]}>{label.replace('_', ' ')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  text: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
});

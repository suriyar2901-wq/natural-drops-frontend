import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

const TONE: Record<string, { bg: string; fg: string }> = {
  ACTIVE: { bg: '#E8F5E9', fg: colors.success },
  Active: { bg: '#E8F5E9', fg: colors.success },
  SUCCESSFUL: { bg: '#E8F5E9', fg: colors.success },
  PENDING: { bg: '#FFF3E0', fg: colors.warning },
  'Payment Pending': { bg: '#FFF3E0', fg: colors.warning },
  'Expiring Soon': { bg: '#FFF8E1', fg: '#F57C00' },
  FAILED: { bg: '#FFEBEE', fg: colors.error },
  Expired: { bg: '#FFEBEE', fg: colors.error },
  DEACTIVATED: { bg: '#ECEFF1', fg: colors.textSecondary },
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

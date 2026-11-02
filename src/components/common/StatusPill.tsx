import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

const TONE: Record<string, { bg: string; fg: string }> = {
  ACTIVE: { bg: '#BBF7D0', fg: '#166534' },
  Active: { bg: '#BBF7D0', fg: '#166534' },
  SUCCESSFUL: { bg: '#BBF7D0', fg: '#166534' },
  PENDING: { bg: '#FDE68A', fg: '#854A0E' },
  'Payment Pending': { bg: '#FDE68A', fg: '#854A0E' },
  'Expiring Soon': { bg: '#FED7AA', fg: '#9A3412' },
  FAILED: { bg: '#FECACA', fg: '#991B1B' },
  Expired: { bg: '#FECACA', fg: '#991B1B' },
  DEACTIVATED: { bg: '#E5E7EB', fg: '#374151' },
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

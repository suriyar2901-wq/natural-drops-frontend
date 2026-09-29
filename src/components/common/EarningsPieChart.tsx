import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

type Slice = {
  label: string;
  hint: string;
  value: number;
  color: string;
};

type Props = {
  paid: number;
  partial: number;
  due: number;
};

const money = (value: number | undefined | null) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

export const EarningsPieChart = ({ paid, partial, due }: Props) => {
  const slices: Slice[] = [
    { label: 'Earnings', hint: 'Fully paid orders', value: money(paid), color: colors.success },
    { label: 'Partial amount', hint: 'Collected on partial bills', value: money(partial), color: colors.warning },
    { label: 'Yet to collect', hint: 'Unpaid and remaining balance', value: money(due), color: '#90A4AE' },
  ];
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  let cursor = 0;
  const gradient = total === 0
    ? colors.gray200
    : `conic-gradient(${slices
        .map((slice) => {
          const start = cursor;
          cursor += (slice.value / total) * 360;
          const piece = `${slice.color} ${start}deg ${cursor}deg`;
          return piece;
        })
        .join(', ')})`;

  return (
    <View style={styles.wrap}>
      <View style={styles.chartRow}>
        {Platform.OS === 'web' ? (
          React.createElement('div', {
            style: {
              width: 168,
              height: 168,
              borderRadius: '50%',
              background: gradient,
              flexShrink: 0,
            },
          })
        ) : (
          <View style={[styles.fallbackPie, { backgroundColor: slices.find((slice) => slice.value > 0)?.color || colors.gray200 }]} />
        )}
        <View style={styles.legend}>
          {slices.map((slice) => {
            const percent = total > 0 ? Math.round((slice.value / total) * 100) : 0;
            return (
              <View key={slice.label} style={styles.legendRow}>
                <View style={[styles.swatch, { backgroundColor: slice.color }]} />
                <View style={styles.legendText}>
                  <Text style={styles.legendLabel}>{slice.label}</Text>
                  <Text style={styles.legendHint}>{slice.hint}</Text>
                  <Text style={styles.legendValue}>{formatCurrency(slice.value)} · {percent}%</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
      <Text style={styles.total}>Chart total {formatCurrency(total)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  fallbackPie: { width: 168, height: 168, borderRadius: 84 },
  legend: { flex: 1, minWidth: 180 },
  legendRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  swatch: { width: 14, height: 14, borderRadius: 7, marginTop: 3, marginRight: spacing.sm },
  legendText: { flex: 1 },
  legendLabel: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  legendHint: { color: colors.textSecondary, fontSize: typography.fontSize.xs },
  legendValue: { color: colors.textPrimary, marginTop: 2 },
  total: { marginTop: spacing.sm, color: colors.textSecondary, fontWeight: typography.fontWeight.medium },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

const PIE_SIZE = 168;

const money = (value: number | undefined | null) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const sliceColors = (slices: Slice[]) => {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const degrees: string[] = [];
  if (total <= 0) return degrees;
  const positive = slices.filter((slice) => slice.value > 0);
  let assigned = 0;
  positive.forEach((slice, index) => {
    const count = index === positive.length - 1
      ? 360 - assigned
      : Math.max(0, Math.round((slice.value / total) * 360));
    const safe = Math.min(count, 360 - assigned);
    for (let step = 0; step < safe; step += 1) degrees.push(slice.color);
    assigned += safe;
  });
  return degrees;
};

const EarningsPie = ({ slices }: { slices: Slice[] }) => {
  const degrees = sliceColors(slices);
  if (degrees.length === 0) {
    return <View style={[styles.pie, { backgroundColor: colors.gray200 }]} />;
  }
  return (
    <View style={styles.pie}>
      {degrees.map((color, degree) => (
        <View
          key={`${color}-${degree}`}
          style={{
            position: 'absolute',
            left: PIE_SIZE / 2 - 2,
            top: 0,
            width: 4,
            height: PIE_SIZE / 2,
            backgroundColor: color,
            transform: [
              { translateY: PIE_SIZE / 4 },
              { rotate: `${degree}deg` },
              { translateY: -(PIE_SIZE / 4) },
            ],
          }}
        />
      ))}
    </View>
  );
};

export const EarningsPieChart = ({ paid, partial, due }: Props) => {
  const slices: Slice[] = [
    { label: 'Earnings', hint: 'Fully paid orders', value: money(paid), color: colors.success },
    { label: 'Partial amount', hint: 'Collected on partial bills', value: money(partial), color: colors.warning },
    { label: 'Yet to collect', hint: 'Unpaid and remaining balance', value: money(due), color: '#90A4AE' },
  ];
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.chartRow}>
        <EarningsPie slices={slices} />
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
  pie: {
    width: PIE_SIZE,
    height: PIE_SIZE,
    borderRadius: PIE_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: colors.gray200,
  },
  legend: { flex: 1, minWidth: 180 },
  legendRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  swatch: { width: 14, height: 14, borderRadius: 7, marginTop: 3, marginRight: spacing.sm },
  legendText: { flex: 1 },
  legendLabel: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  legendHint: { color: colors.textSecondary, fontSize: typography.fontSize.xs },
  legendValue: { color: colors.textPrimary, marginTop: 2 },
  total: { marginTop: spacing.sm, color: colors.textSecondary, fontWeight: typography.fontWeight.medium },
});

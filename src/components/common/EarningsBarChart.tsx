import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { MonthlyRevenuePoint } from '../../types';

interface Props {
  points?: MonthlyRevenuePoint[];
}

const PAID = colors.success;
const PARTIAL = colors.warning;
const DUE = colors.primary;
const TRACK = 156;

type Row = MonthlyRevenuePoint & {
  paid: number;
  partial: number;
  due: number;
  total: number;
};

export const EarningsBarChart = ({ points = [] }: Props) => {
  const rows = useMemo<Row[]>(() => points.map((point) => {
    const paid = Number(point.orderRevenue) || 0;
    const partial = Number(point.subscriptionRevenue) || 0;
    const total = Number(point.totalRevenue) || 0;
    const due = Math.max(0, total - paid - partial);
    return { ...point, paid, partial, due, total: paid + partial + due };
  }), [points]);
  const maxValue = useMemo(() => {
    const peak = rows.reduce((max, row) => Math.max(max, row.total), 0);
    return peak > 0 ? peak : 1;
  }, [rows]);
  const totals = useMemo(() => rows.reduce((sum, row) => ({
    paid: sum.paid + row.paid,
    partial: sum.partial + row.partial,
    due: sum.due + row.due,
  }), { paid: 0, partial: 0, due: 0 }), [rows]);
  const hasMoney = rows.some((row) => row.total > 0);
  const [picked, setPicked] = useState<string | null>(null);
  const selected = rows.find((row) => row.monthKey === picked)
    || [...rows].reverse().find((row) => row.total > 0)
    || rows[rows.length - 1];
  const scroll = rows.length > 10;

  return (
    <View>
      <View style={styles.summary}>
        <SummaryChip color={PAID} tint={colors.successTint} label="Paid" value={totals.paid} />
        <SummaryChip color={PARTIAL} tint={colors.warningTint} label="Partial" value={totals.partial} />
        <SummaryChip color={DUE} tint={colors.blue50} label="Yet to collect" value={totals.due} />
      </View>
      {!hasMoney ? (
        <Text style={styles.empty}>No earnings in this date range.</Text>
      ) : (
        <View style={styles.chartRow}>
          <View style={styles.axis}>
            <Text style={styles.axisText}>{compact(maxValue)}</Text>
            <Text style={styles.axisText}>{compact(maxValue / 2)}</Text>
            <Text style={styles.axisText}>₹0</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={scroll}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={[styles.plot, scroll ? { width: rows.length * 58 } : styles.plotFill]}>
              <View style={[styles.grid, { bottom: 24 + TRACK }]} />
              <View style={[styles.grid, { bottom: 24 + TRACK / 2 }]} />
              <View style={[styles.grid, styles.baseline]} />
              {rows.map((row) => {
                const paidHeight = (row.paid / maxValue) * TRACK;
                const partialHeight = (row.partial / maxValue) * TRACK;
                const dueHeight = (row.due / maxValue) * TRACK;
                const active = selected?.monthKey === row.monthKey;
                const top = row.due > 0 ? 'due' : row.partial > 0 ? 'partial' : 'paid';
                return (
                  <Pressable
                    key={row.monthKey}
                    style={[styles.column, active && styles.columnActive]}
                    onPress={() => setPicked(row.monthKey)}
                  >
                    <Text style={[styles.value, active && styles.valueActive]}>
                      {row.total > 0 ? compact(row.total) : ''}
                    </Text>
                    <View style={styles.track}>
                      <View style={styles.stack}>
                        <Bar height={dueHeight} color={DUE} round={top === 'due'} show={row.due > 0} />
                        <Bar height={partialHeight} color={PARTIAL} round={top === 'partial'} show={row.partial > 0} />
                        <Bar height={paidHeight} color={PAID} round={top === 'paid'} show={row.paid > 0} />
                      </View>
                    </View>
                    <Text style={[styles.label, active && styles.labelActive]}>{row.month}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
      {selected && hasMoney && (
        <View style={styles.detail}>
          <Text style={styles.detailTitle}>{selected.month}</Text>
          <Text style={styles.detailCount}>
            {selected.orderCount || 0} order{(selected.orderCount || 0) === 1 ? '' : 's'}
          </Text>
          <View style={styles.detailRow}>
            <DetailItem color={PAID} label="Paid" value={selected.paid} />
            <DetailItem color={PARTIAL} label="Partial" value={selected.partial} />
            <DetailItem color={DUE} label="Due" value={selected.due} />
          </View>
        </View>
      )}
    </View>
  );
};

const Bar = ({ height, color, round, show }: { height: number; color: string; round: boolean; show: boolean }) => (
  <View
    style={{
      height: show ? Math.max(6, height) : 0,
      backgroundColor: color,
      borderTopLeftRadius: round ? 8 : 0,
      borderTopRightRadius: round ? 8 : 0,
    }}
  />
);

const SummaryChip = ({ color, tint, label, value }: { color: string; tint: string; label: string; value: number }) => (
  <View style={[styles.chip, { backgroundColor: tint }]}>
    <View style={[styles.swatch, { backgroundColor: color }]} />
    <View>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={[styles.chipValue, { color }]}>{money(value)}</Text>
    </View>
  </View>
);

const DetailItem = ({ color, label, value }: { color: string; label: string; value: number }) => (
  <View style={styles.detailItem}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{money(value)}</Text>
  </View>
);

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

const compact = (value: number) => {
  if (!value) return '₹0';
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `₹${Math.round(value)}`;
};

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { flexGrow: 1, flexBasis: 150, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  swatch: { width: 8, height: 28, borderRadius: 4 },
  chipLabel: { fontSize: typography.fontSize.xs, color: colors.textSecondary, fontWeight: typography.fontWeight.semibold },
  chipValue: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, marginTop: 2 },
  empty: { color: colors.textSecondary, paddingVertical: spacing.lg },
  chartRow: { flexDirection: 'row', alignItems: 'flex-start' },
  axis: { width: 46, height: TRACK, marginTop: 16, justifyContent: 'space-between' },
  axisText: { fontSize: 10, color: colors.textSecondary },
  scrollContent: { flexGrow: 1 },
  plot: { flexDirection: 'row', alignItems: 'flex-end', position: 'relative' },
  plotFill: { flexGrow: 1, width: '100%' },
  grid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#E7EEF6' },
  baseline: { bottom: 24, height: 2, backgroundColor: '#D5E3F2' },
  column: { flex: 1, minWidth: 48, alignItems: 'center', borderRadius: 10, paddingTop: 2 },
  columnActive: { backgroundColor: '#F3F8FD' },
  value: { fontSize: 10, color: colors.textSecondary, height: 16, fontWeight: typography.fontWeight.semibold },
  valueActive: { color: colors.textPrimary },
  track: { height: TRACK, width: 22, justifyContent: 'flex-end' },
  stack: { width: '100%', justifyContent: 'flex-end', borderRadius: 8, overflow: 'hidden' },
  label: { marginTop: 8, height: 16, fontSize: typography.fontSize.xs, color: colors.textSecondary, textAlign: 'center' },
  labelActive: { color: colors.primary, fontWeight: typography.fontWeight.bold },
  detail: {
    marginTop: spacing.md,
    backgroundColor: '#F7FBFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3EEF8',
    padding: spacing.md,
  },
  detailTitle: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  detailCount: { fontSize: typography.fontSize.xs, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.sm },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  detailLabel: { fontSize: typography.fontSize.xs, color: colors.textSecondary },
  detailValue: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
});

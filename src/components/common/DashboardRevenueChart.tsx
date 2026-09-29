import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { MonthlyRevenuePoint } from '../../types';
import { formatCurrency } from '../../utils/formatters';

const SAMPLE_POINTS: MonthlyRevenuePoint[] = [
  { month: 'Apr', monthKey: 'sample-04', orderRevenue: 4200, subscriptionRevenue: 499, totalRevenue: 4699, orderCount: 8 },
  { month: 'May', monthKey: 'sample-05', orderRevenue: 5800, subscriptionRevenue: 998, totalRevenue: 6798, orderCount: 11 },
  { month: 'Jun', monthKey: 'sample-06', orderRevenue: 5200, subscriptionRevenue: 499, totalRevenue: 5699, orderCount: 9 },
  { month: 'Jul', monthKey: 'sample-07', orderRevenue: 7100, subscriptionRevenue: 1497, totalRevenue: 8597, orderCount: 14 },
  { month: 'Aug', monthKey: 'sample-08', orderRevenue: 7800, subscriptionRevenue: 1996, totalRevenue: 9796, orderCount: 16 },
  { month: 'Sep', monthKey: 'sample-09', orderRevenue: 8800, subscriptionRevenue: 2495, totalRevenue: 11295, orderCount: 18 },
];

const hasRealRevenue = (points: MonthlyRevenuePoint[]) =>
  points.some((point) => Number(point.totalRevenue) > 0);

interface Props {
  points?: MonthlyRevenuePoint[];
}

export const DashboardRevenueChart = ({ points = [] }: Props) => {
  const usingSample = !hasRealRevenue(points);
  const chartPoints = usingSample ? SAMPLE_POINTS : points;

  const maxValue = useMemo(() => {
    const peak = chartPoints.reduce((max, point) => Math.max(max, Number(point.totalRevenue) || 0), 0);
    return peak > 0 ? peak : 1;
  }, [chartPoints]);

  const totals = useMemo(() => {
    return chartPoints.reduce(
      (acc, point) => ({
        orders: acc.orders + Number(point.orderRevenue || 0),
        subscriptions: acc.subscriptions + Number(point.subscriptionRevenue || 0),
      }),
      { orders: 0, subscriptions: 0 }
    );
  }, [chartPoints]);

  return (
    <View>
      {usingSample && (
        <View style={styles.sampleBanner}>
          <Text style={styles.sampleText}>Showing sample data so the graph is visible. Real monthly totals will replace this when orders exist in the last 6 months.</Text>
        </View>
      )}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Orders {formatCurrency(totals.orders)}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
          <Text style={styles.legendText}>Subscriptions {formatCurrency(totals.subscriptions)}</Text>
        </View>
      </View>

      <View style={styles.chart}>
        {chartPoints.map((point) => {
          const orderHeight = Math.max(Number(point.orderRevenue || 0) > 0 ? 6 : 2, (Number(point.orderRevenue || 0) / maxValue) * 150);
          const subHeight = Math.max(Number(point.subscriptionRevenue || 0) > 0 ? 6 : 2, (Number(point.subscriptionRevenue || 0) / maxValue) * 150);
          return (
            <View key={point.monthKey} style={styles.column}>
              <Text style={styles.value}>{compact(Number(point.totalRevenue || 0))}</Text>
              <View style={styles.track}>
                <View style={[styles.bar, styles.orderBar, { height: orderHeight }]} />
                <View style={[styles.bar, styles.subBar, { height: subHeight }]} />
              </View>
              <Text style={styles.label}>{point.month}</Text>
              <Text style={styles.count}>{point.orderCount || 0} ord</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const compact = (value: number) => {
  if (!value) return '₹0';
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
};

const styles = StyleSheet.create({
  sampleBanner: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  sampleText: {
    color: '#8A6D1B',
    fontSize: typography.fontSize.sm,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  track: {
    width: '100%',
    height: 160,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: colors.gray100,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  bar: {
    width: 18,
    minHeight: 4,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  orderBar: {
    backgroundColor: colors.primary,
  },
  subBar: {
    backgroundColor: colors.secondary,
  },
  label: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  count: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
});

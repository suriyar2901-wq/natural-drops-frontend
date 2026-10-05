import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { MonthlyRevenuePoint } from '../../types';

interface Props {
  points?: MonthlyRevenuePoint[];
}

const BAR_COLORS = ['#3B82F6', '#14B8A6', '#8B5CF6', '#F59E0B', '#22C55E', '#F97316'];

export const DashboardRevenueChart = ({ points = [] }: Props) => {
  const maxValue = useMemo(() => {
    const peak = points.reduce((max, point) => Math.max(max, Number(point.totalRevenue) || 0), 0);
    return peak > 0 ? peak : 1;
  }, [points]);

  return (
    <View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendText}>Orders</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>Subscriptions</Text>
        </View>
      </View>
      <View style={styles.chart}>
        <View style={styles.axis}>
          <Text style={styles.axisText}>{compact(maxValue)}</Text>
          <Text style={styles.axisText}>{compact(maxValue / 2)}</Text>
          <Text style={styles.axisText}>₹0</Text>
        </View>
        <View style={styles.plot}>
          <View style={[styles.gridLine, { bottom: 140 }]} />
          <View style={[styles.gridLine, { bottom: 70 }]} />
          {points.map((point, index) => {
            const order = Number(point.orderRevenue) || 0;
            const subscription = Number(point.subscriptionRevenue) || 0;
            const total = Number(point.totalRevenue) || order + subscription;
            const orderHeight = (order / maxValue) * 140;
            const subscriptionHeight = (subscription / maxValue) * 140;
            const color = BAR_COLORS[index % BAR_COLORS.length];
            const topRadius = subscription > 0 ? 0 : 6;
            return (
              <View key={point.monthKey} style={styles.column}>
                <Text style={styles.value}>{total > 0 ? compact(total) : ''}</Text>
                <View style={styles.track}>
                  <View style={styles.stack}>
                    <View
                      style={[
                        styles.segment,
                        {
                          height: Math.max(subscription > 0 ? 4 : 0, subscriptionHeight),
                          backgroundColor: '#F59E0B',
                          borderTopLeftRadius: subscription > 0 ? 6 : 0,
                          borderTopRightRadius: subscription > 0 ? 6 : 0,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.segment,
                        {
                          height: Math.max(order > 0 ? 4 : 0, orderHeight),
                          backgroundColor: color,
                          borderTopLeftRadius: topRadius,
                          borderTopRightRadius: topRadius,
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.label}>{point.month}</Text>
              </View>
            );
          })}
        </View>
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
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semibold,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 200,
  },
  axis: {
    width: 52,
    height: 150,
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  axisText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  plot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    borderBottomColor: '#D6E4F0',
    minHeight: 188,
    position: 'relative',
    backgroundColor: '#F7FBFF',
    borderRadius: 8,
    paddingTop: 4,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E3EEF8',
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 2,
    minHeight: 14,
  },
  track: {
    width: '100%',
    height: 140,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  stack: {
    width: '52%',
    maxWidth: 34,
    justifyContent: 'flex-end',
  },
  segment: {
    width: '100%',
    minHeight: 0,
  },
  label: {
    marginTop: spacing.xs,
    marginBottom: 4,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
});

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetShopCanEventsQuery, useGetShopCustomerQuery } from '../../store/api/shopApi';
import { canEventQuantity, canEventType } from '../../types/shop.types';
import { formatDateTime } from '../../utils/formatters';

export const CanReturnHistoryScreen = ({ route }: any) => {
  const customerId = route?.params?.customerId as number;
  const { data: customer, isLoading: loadingCustomer } = useGetShopCustomerQuery(customerId, { skip: !customerId });
  const { data: events = [], isLoading } = useGetShopCanEventsQuery(customerId, { skip: !customerId });

  const returns = useMemo(
    () => events.filter((event) => canEventType(event) === 'RETURNED'),
    [events],
  );
  const total = returns.reduce((sum, event) => sum + canEventQuantity(event), 0);

  if (isLoading || loadingCustomer) {
    return <Loading fullScreen message="Loading can return history..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{customer?.name || 'Client'}</Text>
      <Text style={styles.meta}>{customer?.mobile}</Text>
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{returns.length}</Text>
          <Text style={styles.summaryLabel}>Return entries</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{total}</Text>
          <Text style={styles.summaryLabel}>Cans returned</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, styles.pending]}>{customer?.emptyCans || 0}</Text>
          <Text style={styles.summaryLabel}>Still pending</Text>
        </View>
      </View>
      {returns.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyText}>No can returns yet for this client.</Text>
        </Card>
      ) : returns.map((event) => {
        const cans = canEventQuantity(event);
        return (
          <Card key={event.id} style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.returned}>Returned</Text>
              <Text style={styles.qty}>{cans} can{cans === 1 ? '' : 's'}</Text>
            </View>
            <Text style={styles.meta}>{formatDateTime(event.occurredAt)}</Text>
            {!!event.copy && <Text style={styles.copy}>{event.copy}</Text>}
            {!!event.note && <Text style={styles.copy}>{event.note}</Text>}
          </Card>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 4 },
  summary: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  summaryItem: { flex: 1, backgroundColor: colors.white, borderRadius: 12, paddingVertical: spacing.sm, alignItems: 'center' },
  summaryValue: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  summaryLabel: { marginTop: 2, fontSize: typography.fontSize.xs, color: colors.textSecondary, textAlign: 'center' },
  pending: { color: colors.primary },
  row: { marginBottom: spacing.sm, padding: spacing.md },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  returned: { fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  qty: { fontWeight: typography.fontWeight.bold, color: colors.success, fontSize: typography.fontSize.lg },
  copy: { color: colors.textPrimary, marginTop: 6 },
  empty: { padding: spacing.lg },
  emptyText: { textAlign: 'center', color: colors.textSecondary },
});

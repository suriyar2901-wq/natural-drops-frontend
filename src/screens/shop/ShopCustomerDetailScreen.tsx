import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Loading, StatusPill } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetShopCanEventsQuery, useGetShopCustomerQuery, useGetShopLedgerQuery } from '../../store/api/shopApi';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { moneyValue } from '../../types/shop.types';

export const ShopCustomerDetailScreen = ({ navigation, route }: any) => {
  const customerId = route?.params?.customerId as number;
  const { data: customer, isLoading } = useGetShopCustomerQuery(customerId, { skip: !customerId });
  const { data: ledger = [] } = useGetShopLedgerQuery(customerId, { skip: !customerId });
  const { data: canEvents = [] } = useGetShopCanEventsQuery(customerId, { skip: !customerId });

  if (isLoading || !customer) {
    return <Loading fullScreen message="Loading customer..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{customer.name}</Text>
        <StatusPill label={customer.customerCode} />
      </View>
      <Text style={styles.meta}>{customer.mobile}</Text>
      <Text style={styles.meta}>
        {[customer.house, customer.area, customer.city, customer.pin].filter(Boolean).join(', ') || 'No address'}
      </Text>

      <View style={styles.chips}>
        <Card style={styles.stat}><Text style={styles.statValue}>{formatCurrency(moneyValue(customer.money))}</Text><Text style={styles.statLabel}>Outstanding</Text></Card>
        <Card style={styles.stat}><Text style={styles.statValue}>{Math.max(canEvents.filter((event) => event.changeAmount > 0).reduce((sum, event) => sum + event.changeAmount, 0), (customer.emptyCans || 0) + canEvents.filter((event) => event.changeAmount < 0).reduce((sum, event) => sum + Math.abs(event.changeAmount), 0))}</Text><Text style={styles.statLabel}>Cans given</Text></Card>
        <Card style={styles.stat}><Text style={styles.statValue}>{canEvents.filter((event) => event.changeAmount < 0).reduce((sum, event) => sum + Math.abs(event.changeAmount), 0)}</Text><Text style={styles.statLabel}>Returned</Text></Card>
        <Card style={styles.stat}><Text style={styles.statValue}>{customer.emptyCans || 0}</Text><Text style={styles.statLabel}>To return</Text></Card>
      </View>

      <View style={styles.actions}>
        <Button title="Record Payment" onPress={() => navigation.navigate('RecordShopPayment', { customerId })} />
        <Button title="Record can return" variant="outline" onPress={() => navigation.navigate('ShopEmptyCans', { customerId })} />
      </View>
      <View style={styles.actions}>
        <Button title="Add Order" variant="outline" onPress={() => navigation.navigate('PhoneOrder', { customerId })} />
        <Button title="Edit" variant="outline" onPress={() => navigation.navigate('AddShopCustomer', { customerId })} />
      </View>

      <Text style={styles.section}>Ledger</Text>
      {ledger.length === 0 ? (
        <Card style={styles.empty}><Text style={styles.emptyText}>No ledger entries yet.</Text></Card>
      ) : ledger.map((event) => (
        <Card key={event.id} style={styles.row}>
          <View style={styles.cardTop}>
            <Text style={styles.name}>{event.kind}</Text>
            <Text style={styles.due}>{formatCurrency(moneyValue(event.amount))}</Text>
          </View>
          <Text style={styles.meta}>{event.method || '—'} • {event.reference || 'No ref'}</Text>
          <Text style={styles.meta}>{formatDateTime(event.occurredAt)}</Text>
        </Card>
      ))}

      <Text style={styles.section}>Can history</Text>
      {canEvents.length === 0 ? (
        <Card style={styles.empty}><Text style={styles.emptyText}>No can movements yet.</Text></Card>
      ) : canEvents.map((event) => (
        <Card key={event.id} style={styles.row}>
          <Text style={styles.name}>{event.copy}</Text>
          <Text style={styles.meta}>{event.changeAmount > 0 ? '+' : ''}{event.changeAmount} • {formatDateTime(event.occurredAt)}</Text>
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  stat: { flex: 1, padding: spacing.md },
  statValue: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  statLabel: { color: colors.textSecondary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  row: { marginBottom: spacing.sm, padding: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  due: { fontWeight: typography.fontWeight.semibold, color: colors.primary },
  empty: { padding: spacing.md },
  emptyText: { color: colors.textSecondary, textAlign: 'center' },
});

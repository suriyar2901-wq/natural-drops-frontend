import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetShopCustomersQuery } from '../../store/api/shopApi';
import { formatCurrency } from '../../utils/formatters';
import { moneyValue } from '../../types/shop.types';

export const ShopCustomersScreen = ({ navigation }: any) => {
  const { data: customers = [], isLoading, refetch, isFetching } = useGetShopCustomersQuery();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.mobile, customer.customerCode, customer.area, customer.city]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [customers, search]);

  const totals = useMemo(() => ({
    count: customers.length,
    due: customers.reduce((sum, item) => sum + moneyValue(item.money), 0),
    cans: customers.reduce((sum, item) => sum + (item.emptyCans || 0), 0),
  }), [customers]);

  if (isLoading) {
    return <Loading fullScreen message="Loading customers..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Shop Customers</Text>
        <Button title="+ Add" onPress={() => navigation.navigate('AddShopCustomer')} />
      </View>

      <View style={styles.chips}>
        <Chip label={`Customers ${totals.count}`} />
        <Chip label={`Due ${formatCurrency(totals.due)}`} />
        <Chip label={`Empty cans ${totals.cans}`} />
      </View>

      <Input
        label="Search"
        placeholder="Name, mobile or code"
        value={search}
        onChangeText={setSearch}
      />

      <Button title={isFetching ? 'Refreshing…' : 'Refresh'} onPress={() => refetch()} />

      <View style={styles.actions}>
        <Button title="Phone Order" variant="outline" onPress={() => navigation.navigate('PhoneOrder')} />
        <Button title="Shop Profile" variant="outline" onPress={() => navigation.navigate('ShopProfile')} />
      </View>

      {filtered.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyText}>No shop customers yet. Add a customer to start ledger and empty-can tracking.</Text>
        </Card>
      ) : filtered.map((customer) => (
        <TouchableOpacity
          key={customer.id}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ShopCustomerDetail', { customerId: customer.id })}
        >
          <Card style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.code}>{customer.customerCode}</Text>
              <Text style={styles.due}>{formatCurrency(moneyValue(customer.money))}</Text>
            </View>
            <Text style={styles.name}>{customer.name}</Text>
            <Text style={styles.meta}>{customer.mobile}</Text>
            <Text style={styles.meta}>
              {[customer.area, customer.city].filter(Boolean).join(', ') || 'No area'}
              {' • '}To return {customer.emptyCans || 0}
            </Text>
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const Chip = ({ label }: { label: string }) => (
  <View style={styles.chip}>
    <Text style={styles.chipText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  chipText: { fontSize: typography.fontSize.sm, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  card: { marginTop: spacing.md, padding: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontWeight: typography.fontWeight.bold, color: colors.primary },
  due: { fontWeight: typography.fontWeight.semibold, color: colors.error },
  name: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary, marginTop: 4 },
  meta: { color: colors.textSecondary, marginTop: 2 },
  empty: { marginTop: spacing.lg, padding: spacing.lg },
  emptyText: { textAlign: 'center', color: colors.textSecondary },
});

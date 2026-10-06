import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetCanLedgerQuery } from '../../store/api/shopApi';

export const IssuedCansScreen = ({ navigation }: any) => {
  const { data: rows = [], isLoading } = useGetCanLedgerQuery();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.name, row.mobile].filter(Boolean).some((value) => String(value).toLowerCase().includes(query))
    );
  }, [rows, search]);

  const totals = useMemo(() => ({
    clients: rows.length,
    given: rows.reduce((sum, row) => sum + (row.given || 0), 0),
    returned: rows.reduce((sum, row) => sum + (row.returned || 0), 0),
    toReturn: rows.reduce((sum, row) => sum + (row.toReturn || 0), 0),
  }), [rows]);

  if (isLoading) {
    return <Loading fullScreen message="Loading 20 litre cans..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>20 Litre Cans</Text>
      <Text style={styles.subtitle}>Each client, how many cans were given, and how many are still to return.</Text>
      <View style={styles.summary}>
        <Summary value={totals.clients} label="Clients" />
        <Summary value={totals.given} label="Given" />
        <Summary value={totals.returned} label="Returned" />
        <Summary value={totals.toReturn} label="To return" highlight />
      </View>
      <Input label="Search client" placeholder="Name or mobile" value={search} onChangeText={setSearch} />
      {filtered.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyText}>No clients yet. Cans show here after a 20 litre order is placed for a shop customer.</Text>
        </Card>
      ) : filtered.map((row) => (
        <TouchableOpacity
          key={row.customerId}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ShopCustomerDetail', { customerId: row.customerId })}
        >
          <Card style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.who}>
                <Text style={styles.name}>{row.name}</Text>
                <Text style={styles.meta}>{row.mobile}</Text>
              </View>
            </View>
            <View style={styles.counts}>
              <Count value={row.given || 0} label="Given" />
              <Count value={row.returned || 0} label="Returned" />
              <Count value={row.toReturn || 0} label="To return" highlight />
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const Summary = ({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) => (
  <View style={styles.summaryItem}>
    <Text style={[styles.summaryValue, highlight && styles.highlight]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const Count = ({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) => (
  <View style={styles.countBox}>
    <Text style={[styles.countValue, highlight && styles.highlight]}>{value}</Text>
    <Text style={styles.countLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md },
  summary: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryItem: { flex: 1, backgroundColor: colors.white, borderRadius: 12, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, alignItems: 'center' },
  summaryValue: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  summaryLabel: { marginTop: 2, fontSize: typography.fontSize.xs, color: colors.textSecondary, textAlign: 'center' },
  card: { marginTop: spacing.md, padding: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  who: { flex: 1, minWidth: 0 },
  name: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 2 },
  counts: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  countBox: { flex: 1, backgroundColor: colors.background, borderRadius: 10, paddingVertical: spacing.sm, alignItems: 'center' },
  countValue: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  countLabel: { marginTop: 2, fontSize: typography.fontSize.xs, color: colors.textSecondary },
  highlight: { color: colors.primary },
  empty: { marginTop: spacing.lg, padding: spacing.lg },
  emptyText: { textAlign: 'center', color: colors.textSecondary },
});

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
    toReturn: rows.reduce((sum, row) => sum + (row.toReturn || 0), 0),
  }), [rows]);

  if (isLoading) {
    return <Loading fullScreen message="Loading 20 litre cans..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>20 Litre Cans</Text>
      <Text style={styles.subtitle}>Each client, how many cans were given, and how many are still to return.</Text>
      <View style={styles.chips}>
        <Chip label={`Clients ${totals.clients}`} />
        <Chip label={`Given ${totals.given}`} />
        <Chip label={`To return ${totals.toReturn}`} />
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
            <Text style={styles.name}>{row.name}</Text>
            <Text style={styles.meta}>{row.mobile}</Text>
            <View style={styles.counts}>
              <Text style={styles.count}>Given {row.given || 0}</Text>
              <Text style={styles.count}>Returned {row.returned || 0}</Text>
              <Text style={styles.pending}>To return {row.toReturn || 0}</Text>
            </View>
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
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  chipText: { fontSize: typography.fontSize.sm, color: colors.textSecondary },
  card: { marginTop: spacing.md, padding: spacing.md },
  name: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 2 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  count: { color: colors.textPrimary, fontWeight: typography.fontWeight.medium },
  pending: { color: colors.primary, fontWeight: typography.fontWeight.bold },
  empty: { marginTop: spacing.lg, padding: spacing.lg },
  emptyText: { textAlign: 'center', color: colors.textSecondary },
});

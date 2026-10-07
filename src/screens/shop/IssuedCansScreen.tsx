import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useAdjustCanStockMutation, useGetCanLedgerQuery, useGetCanStockQuery, useSaveCanDepositRateMutation } from '../../store/api/shopApi';
import { moneyValue } from '../../types/shop.types';
import { formatCurrency } from '../../utils/formatters';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

export const IssuedCansScreen = ({ navigation }: any) => {
  const { data: rows = [], isLoading } = useGetCanLedgerQuery();
  const { data: stock, isLoading: stockLoading } = useGetCanStockQuery();
  const [saveRate, { isLoading: savingRate }] = useSaveCanDepositRateMutation();
  const [adjustStock, { isLoading: adjusting }] = useAdjustCanStockMutation();
  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [depositRate, setDepositRate] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [rateReady, setRateReady] = useState(false);

  useEffect(() => {
    if (stock && !rateReady) {
      setDepositRate(String(moneyValue(stock.depositPerCan)));
      setRateReady(true);
    }
  }, [stock, rateReady]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (pendingOnly && !(row.toReturn > 0)) return false;
      if (!query) return true;
      return [row.name, row.mobile].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
    });
  }, [rows, search, pendingOnly]);

  const totals = useMemo(() => ({
    clients: rows.length,
    given: rows.reduce((sum, row) => sum + (row.given || 0), 0),
    returned: rows.reduce((sum, row) => sum + (row.returned || 0), 0),
    toReturn: rows.reduce((sum, row) => sum + (row.toReturn || 0), 0),
  }), [rows]);

  const saveDeposit = async () => {
    const amount = Number(depositRate);
    if (!Number.isFinite(amount) || amount < 0) {
      showErrorToast('Enter the can deposit amount');
      return;
    }
    try {
      await saveRate({ depositPerCan: amount.toFixed(2) }).unwrap();
      showSuccessToast('Can deposit amount saved');
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not save the deposit amount');
    }
  };

  const changeStock = async (direction: 'ADD' | 'REMOVE') => {
    const quantity = Number(stockQty);
    if (!quantity || quantity <= 0) {
      showErrorToast('Enter how many cans to add or remove');
      return;
    }
    try {
      await adjustStock({ quantity, direction }).unwrap();
      setStockQty('');
      showSuccessToast(direction === 'ADD' ? 'Cans added to seller stock' : 'Cans removed from seller stock');
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not update seller stock');
    }
  };

  if (isLoading || stockLoading) {
    return <Loading fullScreen message="Loading water can management..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Water can management</Text>
      <Text style={styles.subtitle}>Seller stock, customer pending cans, and the deposit held for each can.</Text>

      <Card style={styles.stockCard}>
        <Text style={styles.section}>Seller total can stock</Text>
        <Text style={styles.stockValue}>{stock?.totalStock || 0}</Text>
        <Text style={styles.meta}>Cans in the shop. A delivery takes from this stock. A return puts the empty can back.</Text>
        <View style={styles.stockStats}>
          <Count value={stock?.withCustomers || 0} label="With customers" highlight />
          <Count value={stock?.damaged || 0} label="Damaged" />
          <Count value={stock?.missing || 0} label="Missing" />
        </View>
        <Text style={styles.meta}>Deposit held {formatCurrency(moneyValue(stock?.depositHeld))}</Text>
        <Input
          label="Add or remove cans"
          placeholder="Quantity"
          value={stockQty}
          keyboardType="number-pad"
          onChangeText={(value) => setStockQty(value.replace(/[^0-9]/g, ''))}
        />
        <View style={styles.stockActions}>
          <Button title={adjusting ? 'Saving…' : 'Add stock'} onPress={() => changeStock('ADD')} disabled={adjusting} />
          <Button title="Remove stock" variant="outline" onPress={() => changeStock('REMOVE')} disabled={adjusting} />
        </View>
        <Input
          label="Can deposit amount per can (₹)"
          placeholder="0"
          value={depositRate}
          keyboardType="decimal-pad"
          onChangeText={setDepositRate}
        />
        <Button title={savingRate ? 'Saving…' : 'Save deposit amount'} variant="outline" onPress={saveDeposit} disabled={savingRate} />
        <Button title="Daily can collection report" variant="outline" onPress={() => navigation.navigate('CanCollectionReport')} style={styles.reportButton} />
      </Card>

      <Text style={styles.section}>Customer-wise pending cans</Text>
      <View style={styles.summary}>
        <Summary value={totals.clients} label="Clients" />
        <Summary value={totals.given} label="Given" />
        <Summary value={totals.returned} label="Returned" />
        <Summary value={totals.toReturn} label="To return" highlight />
      </View>
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.chip, !pendingOnly && styles.chipOn]} onPress={() => setPendingOnly(false)}>
          <Text style={[styles.chipText, !pendingOnly && styles.chipTextOn]}>All clients</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chip, pendingOnly && styles.chipOn]} onPress={() => setPendingOnly(true)}>
          <Text style={[styles.chipText, pendingOnly && styles.chipTextOn]}>Pending only</Text>
        </TouchableOpacity>
      </View>
      <Input label="Search client" placeholder="Name or mobile" value={search} onChangeText={setSearch} />
      {filtered.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyText}>
            {pendingOnly ? 'No customer has pending cans.' : 'No clients yet. Cans show here after a water can order is placed for a shop customer.'}
          </Text>
        </Card>
      ) : filtered.map((row) => (
        <Card key={row.customerId} style={styles.card}>
          <View style={styles.cardTop}>
            <TouchableOpacity
              style={styles.who}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ShopCustomerDetail', { customerId: row.customerId })}
            >
              <Text style={styles.name}>{row.name}</Text>
              <Text style={styles.meta}>{row.mobile}</Text>
            </TouchableOpacity>
            <View style={styles.cardSide}>
              <Text style={styles.pending}>{row.toReturn || 0} pending</Text>
              <TouchableOpacity
                style={styles.historyButton}
                onPress={() => navigation.navigate('CanReturnHistory', { customerId: row.customerId })}
                accessibilityLabel={`Can return history for ${row.name}`}
              >
                <Ionicons name="time-outline" size={22} color={colors.primary} />
                <Text style={styles.historyLabel}>History</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('ShopCustomerDetail', { customerId: row.customerId })}>
            <View style={styles.counts}>
              <Count value={row.given || 0} label="Given" />
              <Count value={row.returned || 0} label="Returned" />
              <Count value={row.toReturn || 0} label="To return" highlight />
            </View>
            <View style={styles.counts}>
              <Count value={formatCurrency(moneyValue(row.deposit))} label="Deposit" />
              <Count value={row.damaged || 0} label="Damaged" />
              <Count value={row.missing || 0} label="Missing" />
            </View>
          </TouchableOpacity>
          <Button
            title="Can entry"
            variant="outline"
            onPress={() => navigation.navigate('ShopEmptyCans', { customerId: row.customerId })}
            style={styles.entryButton}
          />
        </Card>
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

const Count = ({ value, label, highlight }: { value: number | string; label: string; highlight?: boolean }) => (
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
  section: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.sm },
  stockCard: { padding: spacing.md, marginBottom: spacing.lg },
  stockValue: { fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.primary },
  stockStats: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  stockActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  reportButton: { marginTop: spacing.sm },
  meta: { color: colors.textSecondary, marginTop: 2 },
  summary: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryItem: { flex: 1, backgroundColor: colors.white, borderRadius: 12, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, alignItems: 'center' },
  summaryValue: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  summaryLabel: { marginTop: 2, fontSize: typography.fontSize.xs, color: colors.textSecondary, textAlign: 'center' },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontWeight: typography.fontWeight.semibold },
  chipTextOn: { color: colors.white },
  card: { marginTop: spacing.md, padding: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  who: { flex: 1, minWidth: 0 },
  name: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  cardSide: { alignItems: 'flex-end', marginLeft: spacing.sm },
  pending: { color: colors.primary, fontWeight: typography.fontWeight.bold },
  historyButton: {
    marginTop: spacing.sm,
    width: 64,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLabel: { marginTop: 2, fontSize: typography.fontSize.xs, color: colors.primary, fontWeight: typography.fontWeight.semibold },
  counts: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  countBox: { flex: 1, backgroundColor: colors.background, borderRadius: 10, paddingVertical: spacing.sm, alignItems: 'center' },
  countValue: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  countLabel: { marginTop: 2, fontSize: typography.fontSize.xs, color: colors.textSecondary, textAlign: 'center' },
  highlight: { color: colors.primary },
  entryButton: { marginTop: spacing.md },
  empty: { marginTop: spacing.lg, padding: spacing.lg },
  emptyText: { textAlign: 'center', color: colors.textSecondary },
});

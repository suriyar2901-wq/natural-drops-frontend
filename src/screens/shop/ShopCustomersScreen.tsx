import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Loading } from '../../components/common';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { useGetShopCustomersQuery } from '../../store/api/shopApi';
import { useGetAllOrdersQuery } from '../../store/api/orderApi';
import { formatCurrency } from '../../utils/formatters';
import { moneyValue, orderBillPending } from '../../types/shop.types';
import { Order } from '../../types';
import { CreateBuyerModal } from './CreateBuyerModal';

type FilterTab = 'all' | 'dues' | 'cans' | 'settled';

export const ShopCustomersScreen = ({ navigation }: any) => {
  const { data: customers = [], isLoading } = useGetShopCustomersQuery();
  const { data: orders = [] } = useGetAllOrdersQuery();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [showCreate, setShowCreate] = useState(false);

  const dueFor = (customer: { mobile?: string | null; buyerUserId?: number | null; money: number | string }) => {
    const matched = (orders as Order[]).filter((order) => {
      if (order.status === 'canceled') return false;
      const orderPhone = String(order.buyerPhone || '').replace(/\D/g, '').slice(-10);
      const customerPhone = String(customer.mobile || '').replace(/\D/g, '').slice(-10);
      return (orderPhone && customerPhone && orderPhone === customerPhone)
        || (!!customer.buyerUserId && order.buyerId === customer.buyerUserId);
    });
    if (matched.length === 0) return moneyValue(customer.money);
    return matched.reduce((sum, order) => sum + orderBillPending(order), 0);
  };

  const enriched = useMemo(() => customers.map((customer) => ({
    ...customer,
    due: dueFor(customer),
    cansOut: customer.emptyCans || 0,
  })), [customers, orders]);

  const totals = useMemo(() => ({
    due: enriched.reduce((sum, item) => sum + item.due, 0),
    dueCustomers: enriched.filter((item) => item.due > 0).length,
    cans: enriched.reduce((sum, item) => sum + item.cansOut, 0),
    canCustomers: enriched.filter((item) => item.cansOut > 0).length,
  }), [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((customer) => {
      if (tab === 'dues' && !(customer.due > 0)) return false;
      if (tab === 'cans' && !(customer.cansOut > 0)) return false;
      if (tab === 'settled' && (customer.due > 0 || customer.cansOut > 0)) return false;
      if (!q) return true;
      return [customer.name, customer.mobile, customer.customerCode, customer.area, customer.city]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [enriched, search, tab]);

  const callCustomer = (mobile?: string | null) => {
    const phone = String(mobile || '').replace(/\D/g, '');
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading customers..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Customer Ledger</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtnText}>+ Add Customer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total to Collect</Text>
          <Text style={styles.summaryDue}>{formatCurrency(totals.due)}</Text>
          <Text style={styles.summaryMeta}>from {totals.dueCustomers} Customer{totals.dueCustomers === 1 ? '' : 's'}</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Cans out</Text>
          <Text style={styles.summaryCans}>{totals.cans}</Text>
          <Text style={styles.summaryMeta}>from {totals.canCustomers} Customer{totals.canCustomers === 1 ? '' : 's'}</Text>
        </Card>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.gray400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search.."
          placeholderTextColor={colors.gray400}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.tabs}>
        {([
          { id: 'all' as const, label: 'All' },
          { id: 'dues' as const, label: 'Dues' },
          { id: 'cans' as const, label: 'Cans' },
          { id: 'settled' as const, label: 'Settled' },
        ]).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.tab, tab === item.id && styles.tabActive]}
            onPress={() => setTab(item.id)}
          >
            <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <CreateBuyerModal visible={showCreate} onClose={() => setShowCreate(false)} />

      {filtered.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyText}>No customers in this filter.</Text>
        </Card>
      ) : filtered.map((customer) => {
        const initial = (customer.name || 'C').trim().charAt(0).toUpperCase();
        return (
          <TouchableOpacity
            key={customer.id}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ShopCustomerDetail', { customerId: customer.id })}
          >
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{customer.name}</Text>
                  <Text style={styles.phone}>+91 {customer.mobile || '—'}</Text>
                </View>
                <View style={styles.cardDue}>
                  <Text style={styles.dueAmount}>{formatCurrency(customer.due)}</Text>
                  <Text style={styles.dueLabel}>To Collect</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <View style={styles.cansTag}>
                  <Ionicons name="water-outline" size={14} color="#854A0E" />
                  <Text style={styles.cansTagText}>{customer.cansOut} cans out</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.callBtn} onPress={() => callCustomer(customer.mobile)}>
                    <Ionicons name="call-outline" size={16} color={colors.primary} />
                    <Text style={styles.callBtnText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.collectBtn}
                    onPress={() => navigation.navigate('RecordShopPayment', { customerId: customer.id })}
                  >
                    <Text style={styles.collectBtnText}>Collect</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addBtnText: {
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm,
  },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flex: 1, padding: spacing.md, ...shadows.sm },
  summaryLabel: { color: colors.textSecondary, fontSize: typography.fontSize.sm },
  summaryDue: {
    marginTop: 4,
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.error,
  },
  summaryCans: {
    marginTop: 4,
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  summaryMeta: { marginTop: 4, color: colors.textSecondary, fontSize: typography.fontSize.xs },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.full,
    padding: 4,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  tabActive: {
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  tabText: { color: colors.textSecondary, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm },
  tabTextActive: { color: colors.textPrimary },
  empty: { padding: spacing.lg },
  emptyText: { color: colors.textSecondary, textAlign: 'center' },
  card: { padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg },
  cardInfo: { flex: 1 },
  name: { fontWeight: typography.fontWeight.bold, color: colors.textPrimary, fontSize: typography.fontSize.base },
  phone: { color: colors.textSecondary, marginTop: 2, fontSize: typography.fontSize.sm },
  cardDue: { alignItems: 'flex-end' },
  dueAmount: { fontWeight: typography.fontWeight.bold, color: colors.error, fontSize: typography.fontSize.base },
  dueLabel: { color: colors.textSecondary, fontSize: typography.fontSize.xs, marginTop: 2 },
  cardBottom: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cansTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFAEB',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  cansTagText: { color: '#854A0E', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.blue100,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  callBtnText: { color: colors.primary, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm },
  collectBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  collectBtnText: { color: colors.white, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.sm },
});

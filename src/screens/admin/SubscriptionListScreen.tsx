import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Input, Loading, StatusPill } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetAdminSubscriptionsQuery, useRenewAdminSubscriptionMutation } from '../../store/api/platformAdminApi';
import { useGetSettingsQuery } from '../../store/api/settingsApi';
import { formatCurrency } from '../../utils/formatters';
import { SellerAdmin } from '../../types/platformAdmin.types';

const TABS = ['All', 'Active', 'Expiring Soon', 'Expired', 'Payment Pending'];

export const SubscriptionListScreen = ({ navigation, route }: any) => {
  const initial = route?.params?.filter || 'All';
  const { data: rows = [], isLoading, refetch } = useGetAdminSubscriptionsQuery();
  const { data: settings } = useGetSettingsQuery();
  const [renew, { isLoading: renewing }] = useRenewAdminSubscriptionMutation();
  const [tab, setTab] = useState(initial);

  useEffect(() => {
    if (route?.params?.filter) {
      setTab(route.params.filter);
    }
  }, [route?.params?.filter]);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('All');
  const [account, setAccount] = useState('All');
  const [renewTarget, setRenewTarget] = useState<SellerAdmin | null>(null);
  const [renewPlan, setRenewPlan] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const monthlyAmount = Number(settings?.planMonthlyAmount || 499);
  const yearlyAmount = Number(settings?.planYearlyAmount || 5389.2);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || [row.sellerCode, row.businessName, row.ownerName, row.mobile]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesTab = tab === 'All' || row.subscriptionStatus === tab;
      const matchesPlan = plan === 'All' || row.plan === plan;
      const matchesAccount = account === 'All' || row.accountStatus === account;
      return matchesSearch && matchesTab && matchesPlan && matchesAccount;
    });
  }, [rows, search, tab, plan, account]);

  const openRenew = (row: SellerAdmin) => {
    setRenewTarget(row);
    setRenewPlan(row.plan === 'YEARLY' ? 'YEARLY' : 'MONTHLY');
  };

  const closeRenew = () => {
    if (renewing) return;
    setRenewTarget(null);
  };

  const confirmRenew = async () => {
    if (!renewTarget) return;
    try {
      await renew({
        sellerId: renewTarget.id,
        plan: renewPlan,
        method: 'CASH',
      }).unwrap();
      const name = renewTarget.businessName;
      setRenewTarget(null);
      Alert.alert('Renewed', `${name} subscription extended (${renewPlan === 'YEARLY' ? 'Yearly' : 'Monthly'}).`);
      refetch();
    } catch (e: any) {
      Alert.alert('Failed', e?.data?.message || e?.message || 'Could not renew');
    }
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading subscriptions..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Subscriptions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {TABS.map((item) => (
          <TouchableOpacity key={item} style={[styles.tab, tab === item && styles.tabActive]} onPress={() => setTab(item)}>
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
              {item} ({item === 'All' ? rows.length : rows.filter((r) => r.subscriptionStatus === item).length})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Input label="Search" value={search} onChangeText={setSearch} placeholder="Seller or business" />
      <View style={styles.row}>
        {['All', 'MONTHLY', 'YEARLY'].map((item) => (
          <TouchableOpacity key={item} style={[styles.mini, plan === item && styles.miniActive]} onPress={() => setPlan(item)}>
            <Text style={plan === item ? styles.miniTextActive : styles.miniText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.row}>
        {['All', 'ACTIVE', 'DEACTIVATED'].map((item) => (
          <TouchableOpacity key={item} style={[styles.mini, account === item && styles.miniActive]} onPress={() => setAccount(item)}>
            <Text style={account === item ? styles.miniTextActive : styles.miniText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={styles.business}>{row.businessName}</Text>
          <Text style={styles.meta}>{row.sellerCode} • {row.plan} • {formatCurrency(row.amount)}</Text>
          <Text style={styles.meta}>Expiry {row.expiryDate || '—'}</Text>
          <View style={styles.pills}>
            <StatusPill label={row.subscriptionStatus} />
            <StatusPill label={row.paymentStatus} />
            <StatusPill label={row.accountStatus} />
          </View>
          <View style={styles.actions}>
            <Button title="View" variant="outline" onPress={() => navigation.navigate('SellerDetail', { sellerId: row.id })} />
            {row.subscriptionStatus === 'Payment Pending' ? (
              <Button title="Payment" onPress={() => navigation.navigate('ActivatePayment', { sellerId: row.id })} />
            ) : (
              <Button title="Cash Renew" onPress={() => openRenew(row)} />
            )}
          </View>
        </Card>
      ))}

      <Modal visible={!!renewTarget} transparent animationType="fade" onRequestClose={closeRenew}>
        <Pressable style={styles.overlay} onPress={closeRenew}>
          <Pressable style={styles.popup}>
            <Text style={styles.popupTitle}>Cash Renew</Text>
            <Text style={styles.popupHint}>
              {renewTarget?.businessName} — choose Monthly or Yearly, then confirm renewal.
            </Text>

            <Text style={styles.fieldLabel}>Plan</Text>
            <View style={styles.planRow}>
              <TouchableOpacity
                style={[styles.planCard, renewPlan === 'MONTHLY' && styles.planCardActive]}
                onPress={() => setRenewPlan('MONTHLY')}
              >
                <Text style={[styles.planName, renewPlan === 'MONTHLY' && styles.planNameActive]}>Monthly</Text>
                <Text style={[styles.planAmount, renewPlan === 'MONTHLY' && styles.planNameActive]}>
                  {formatCurrency(monthlyAmount)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.planCard, renewPlan === 'YEARLY' && styles.planCardActive]}
                onPress={() => setRenewPlan('YEARLY')}
              >
                <Text style={[styles.planName, renewPlan === 'YEARLY' && styles.planNameActive]}>Yearly</Text>
                <Text style={[styles.planAmount, renewPlan === 'YEARLY' && styles.planNameActive]}>
                  {formatCurrency(yearlyAmount)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.popupActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeRenew} disabled={renewing}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmRenew} disabled={renewing}>
                <Text style={styles.confirmText}>{renewing ? 'Renewing…' : 'Confirm Renew'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  tabs: { marginVertical: spacing.md },
  tab: { backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.sm },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textSecondary, fontSize: typography.fontSize.sm },
  tabTextActive: { color: colors.white, fontWeight: typography.fontWeight.semibold },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  mini: { backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  miniActive: { backgroundColor: colors.primary },
  miniText: { color: colors.textSecondary },
  miniTextActive: { color: colors.white },
  card: { padding: spacing.md, marginTop: spacing.md },
  business: { fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.lg },
  meta: { color: colors.textSecondary, marginTop: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17,17,17,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  popup: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
  },
  popupTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  popupHint: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  planRow: { flexDirection: 'row', gap: spacing.sm },
  planCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.gray50,
  },
  planCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.blue50,
  },
  planName: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  planNameActive: {
    color: colors.primary,
  },
  planAmount: {
    marginTop: 4,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  popupActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cancelText: { color: colors.textPrimary, fontWeight: typography.fontWeight.medium },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  confirmText: { color: colors.white, fontWeight: typography.fontWeight.semibold },
});

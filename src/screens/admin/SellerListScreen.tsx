import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Input, Loading, StatusPill } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetAdminSellersQuery } from '../../store/api/platformAdminApi';
import { SellerAdmin } from '../../types/platformAdmin.types';

const STATUS_FILTERS = ['All', 'Active', 'Expiring Soon', 'Expired', 'Payment Pending', 'DEACTIVATED'];

const SUMMARY_TONE: Record<string, { bg: string; fg: string; border: string }> = {
  Total: { bg: '#BFDBFE', fg: '#1E3A8A', border: '#93C5FD' },
  Active: { bg: '#BBF7D0', fg: '#166534', border: '#86EFAC' },
  Expiring: { bg: '#FED7AA', fg: '#9A3412', border: '#FDBA74' },
  Expired: { bg: '#FECACA', fg: '#991B1B', border: '#FCA5A5' },
  Deactivated: { bg: '#E5E7EB', fg: '#374151', border: '#D1D5DB' },
};

const FILTER_TONE: Record<string, { bg: string; fg: string }> = {
  All: { bg: colors.primary, fg: colors.white },
  Active: { bg: '#16A34A', fg: colors.white },
  'Expiring Soon': { bg: '#EA580C', fg: colors.white },
  Expired: { bg: '#DC2626', fg: colors.white },
  'Payment Pending': { bg: '#D97706', fg: colors.white },
  DEACTIVATED: { bg: '#4B5563', fg: colors.white },
};

const cardAccent = (seller: SellerAdmin) => {
  if (seller.accountStatus === 'DEACTIVATED') return '#9CA3AF';
  if (seller.subscriptionStatus === 'Active') return '#22C55E';
  if (seller.subscriptionStatus === 'Expiring Soon') return '#F97316';
  if (seller.subscriptionStatus === 'Expired') return '#EF4444';
  if (seller.subscriptionStatus === 'Payment Pending') return '#F59E0B';
  return colors.primary;
};

export const SellerListScreen = ({ navigation }: any) => {
  const { data: sellers = [], isLoading, refetch, isFetching } = useGetAdminSellersQuery();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');

  const filtered = useMemo(() => {
    return sellers.filter((seller) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q
        || [seller.sellerCode, seller.ownerName, seller.businessName, seller.mobile, seller.area]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      if (!matchesSearch) return false;
      if (status === 'All') return true;
      if (status === 'DEACTIVATED') return seller.accountStatus === 'DEACTIVATED';
      return seller.subscriptionStatus === status;
    });
  }, [sellers, search, status]);

  const counts = useMemo(() => ({
    total: sellers.length,
    active: sellers.filter((s) => s.subscriptionStatus === 'Active').length,
    expiring: sellers.filter((s) => s.subscriptionStatus === 'Expiring Soon').length,
    expired: sellers.filter((s) => s.subscriptionStatus === 'Expired').length,
    deactivated: sellers.filter((s) => s.accountStatus === 'DEACTIVATED').length,
  }), [sellers]);

  if (isLoading) {
    return <Loading fullScreen message="Loading sellers..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Sellers</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()} disabled={isFetching}>
            <Text style={styles.refreshText}>{isFetching ? 'Refreshing…' : 'Refresh'}</Text>
          </TouchableOpacity>
          <Button title="+ Add Seller" onPress={() => navigation.navigate('AddSeller')} />
        </View>
      </View>

      <View style={styles.chips}>
        <Chip toneKey="Total" label={`Total ${counts.total}`} />
        <Chip toneKey="Active" label={`Active ${counts.active}`} />
        <Chip toneKey="Expiring" label={`Expiring ${counts.expiring}`} />
        <Chip toneKey="Expired" label={`Expired ${counts.expired}`} />
        <Chip toneKey="Deactivated" label={`Deactivated ${counts.deactivated}`} />
      </View>

      <Input
        label="Search"
        placeholder="Seller, business or mobile"
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {STATUS_FILTERS.map((item) => {
          const active = status === item;
          const tone = FILTER_TONE[item] || FILTER_TONE.All;
          return (
            <TouchableOpacity
              key={item}
              style={[
                styles.filterChip,
                active && { backgroundColor: tone.bg, borderColor: tone.bg },
              ]}
              onPress={() => setStatus(item)}
            >
              <Text style={[styles.filterText, active && { color: tone.fg, fontWeight: typography.fontWeight.semibold }]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyText}>No sellers match the current filters.</Text>
        </Card>
      ) : filtered.map((seller) => (
        <SellerCard key={seller.id} seller={seller} onPress={() => navigation.navigate('SellerDetail', { sellerId: seller.id })} />
      ))}
    </ScrollView>
  );
};

const Chip = ({ toneKey, label }: { toneKey: keyof typeof SUMMARY_TONE; label: string }) => {
  const tone = SUMMARY_TONE[toneKey];
  return (
    <View style={[styles.summaryChip, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Text style={[styles.summaryText, { color: tone.fg }]}>{label}</Text>
    </View>
  );
};

const SellerCard = ({ seller, onPress }: { seller: SellerAdmin; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
    <Card style={[styles.card, { borderLeftColor: cardAccent(seller) }]}>
      <View style={styles.cardTop}>
        <View style={styles.codeBadge}>
          <Text style={styles.code}>{seller.sellerCode}</Text>
        </View>
        <StatusPill label={seller.subscriptionStatus} />
      </View>
      <Text style={styles.business}>{seller.businessName}</Text>
      <Text style={styles.meta}>{seller.ownerName} • {seller.mobile}</Text>
      {!!seller.username && <Text style={styles.meta}>Username {seller.username}</Text>}
      <Text style={styles.meta}>{seller.area}, {seller.city}</Text>
      <View style={styles.cardBottom}>
        <View style={styles.cardBottomText}>
          <Text style={styles.meta}>Code {seller.companyCode || seller.sellerCode}</Text>
          <Text style={styles.planText}>
            {seller.plan === 'FREE' ? 'Free account' : `${seller.plan || 'MONTHLY'} • Exp ${seller.expiryDate || '—'}`}
          </Text>
        </View>
        <StatusPill label={seller.accountStatus} />
      </View>
    </Card>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  refreshBtn: {
    borderWidth: 1,
    borderColor: colors.primaryLight,
    backgroundColor: colors.blue50,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  refreshText: { color: colors.primary, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  summaryChip: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
  },
  summaryText: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  filterRow: { marginBottom: spacing.md, marginTop: spacing.sm },
  filterChip: {
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterText: { color: colors.textSecondary, fontSize: typography.fontSize.sm },
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    backgroundColor: colors.white,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  codeBadge: {
    backgroundColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  code: { fontWeight: typography.fontWeight.bold, color: '#1E3A8A', fontSize: typography.fontSize.sm },
  business: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 2 },
  planText: { color: colors.textPrimary, marginTop: 2, fontWeight: typography.fontWeight.medium },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  cardBottomText: { flex: 1, paddingRight: spacing.sm },
  empty: { marginTop: spacing.lg, padding: spacing.lg },
  emptyText: { textAlign: 'center', color: colors.textSecondary },
});

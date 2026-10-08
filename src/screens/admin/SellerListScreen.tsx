import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Input, Loading, StatusPill } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetAdminSellersQuery } from '../../store/api/platformAdminApi';
import { SellerAdmin } from '../../types/platformAdmin.types';

const STATUS_FILTERS = ['All', 'Active', 'Expiring Soon', 'Expired', 'Payment Pending', 'DEACTIVATED'];

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
        <Button title="+ Add Seller" onPress={() => navigation.navigate('AddSeller')} />
      </View>

      <View style={styles.chips}>
        <Chip label={`Total ${counts.total}`} />
        <Chip label={`Active ${counts.active}`} />
        <Chip label={`Expiring ${counts.expiring}`} />
        <Chip label={`Expired ${counts.expired}`} />
        <Chip label={`Deactivated ${counts.deactivated}`} />
      </View>

      <Input
        label="Search"
        placeholder="Seller, business or mobile"
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {STATUS_FILTERS.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.filterChip, status === item && styles.filterChipActive]}
            onPress={() => setStatus(item)}
          >
            <Text style={[styles.filterText, status === item && styles.filterTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Button title={isFetching ? 'Refreshing…' : 'Refresh'} onPress={() => refetch()} />

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

const Chip = ({ label }: { label: string }) => (
  <View style={styles.summaryChip}>
    <Text style={styles.summaryText}>{label}</Text>
  </View>
);

const SellerCard = ({ seller, onPress }: { seller: SellerAdmin; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.code}>{seller.sellerCode}</Text>
        <StatusPill label={seller.subscriptionStatus} />
      </View>
      <Text style={styles.business}>{seller.businessName}</Text>
      <Text style={styles.meta}>{seller.ownerName} • {seller.mobile}</Text>
      {!!seller.username && <Text style={styles.meta}>Username {seller.username}</Text>}
      <Text style={styles.meta}>{seller.area}, {seller.city}</Text>
      <View style={styles.cardTop}>
        <Text style={styles.meta}>Code {seller.companyCode || seller.sellerCode}</Text>
      <Text style={styles.meta}>{seller.plan === 'FREE' ? 'Free account' : `${seller.plan || 'MONTHLY'} • Exp ${seller.expiryDate || '—'}`}</Text>
        <StatusPill label={seller.accountStatus} />
      </View>
    </Card>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  summaryChip: { backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  summaryText: { fontSize: typography.fontSize.sm, color: colors.textSecondary },
  filterRow: { marginBottom: spacing.md },
  filterChip: { backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.sm },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { color: colors.textSecondary, fontSize: typography.fontSize.sm },
  filterTextActive: { color: colors.white, fontWeight: typography.fontWeight.semibold },
  card: { marginTop: spacing.md, padding: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  code: { fontWeight: typography.fontWeight.bold, color: colors.primary },
  business: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 2 },
  empty: { marginTop: spacing.lg, padding: spacing.lg },
  emptyText: { textAlign: 'center', color: colors.textSecondary },
});

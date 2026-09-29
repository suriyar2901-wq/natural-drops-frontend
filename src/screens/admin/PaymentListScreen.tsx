import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, Input, Loading, StatusPill } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetAdminPaymentsQuery } from '../../store/api/platformAdminApi';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { SellerPayment } from '../../types/platformAdmin.types';

const TABS = ['All', 'SUCCESSFUL', 'PENDING', 'FAILED'];

export const PaymentListScreen = ({ navigation, route }: any) => {
  const { data: payments = [], isLoading } = useGetAdminPaymentsQuery();
  const [tab, setTab] = useState(route?.params?.status || 'All');
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('All');
  const [selected, setSelected] = useState<SellerPayment | null>(null);

  const filtered = useMemo(() => {
    return payments.filter((payment) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || [payment.transactionCode, payment.businessName, payment.sellerName, payment.sellerCode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesTab = tab === 'All' || payment.status === tab;
      const matchesMethod = method === 'All' || payment.method === method;
      return matchesSearch && matchesTab && matchesMethod;
    });
  }, [payments, search, tab, method]);

  const monthRevenue = payments
    .filter((p) => p.status === 'SUCCESSFUL')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  if (isLoading) {
    return <Loading fullScreen message="Loading payments..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Payments</Text>
      <Text style={styles.subtitle}>Seller subscription ledger only. Buyer order payments stay on Orders.</Text>
      <Card style={styles.summary}>
        <Text style={styles.revenue}>{formatCurrency(monthRevenue)}</Text>
        <Text style={styles.meta}>Successful subscription collections</Text>
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {TABS.map((item) => (
          <TouchableOpacity key={item} style={[styles.tab, tab === item && styles.tabActive]} onPress={() => setTab(item)}>
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Input label="Search" value={search} onChangeText={setSearch} placeholder="Transaction, seller or business" />
      <View style={styles.row}>
        {['All', 'CASH', 'UPI', 'GATEWAY'].map((item) => (
          <TouchableOpacity key={item} style={[styles.mini, method === item && styles.miniActive]} onPress={() => setMethod(item)}>
            <Text style={method === item ? styles.miniTextActive : styles.miniText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.map((payment) => (
        <TouchableOpacity key={payment.id} onPress={() => setSelected(payment)}>
          <Card style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.code}>{payment.transactionCode}</Text>
              <StatusPill label={payment.status} />
            </View>
            <Text style={styles.business}>{payment.businessName || payment.sellerName}</Text>
            <Text style={styles.meta}>{payment.plan} • {payment.method} • {formatCurrency(payment.amount)}</Text>
            <Text style={styles.meta}>{payment.paidAt ? formatDateTime(payment.paidAt) : '—'}</Text>
          </Card>
        </TouchableOpacity>
      ))}

      {selected && (
        <Card style={styles.detail}>
          <Text style={styles.section}>Transaction detail</Text>
          <Text style={styles.code}>{selected.transactionCode}</Text>
          <StatusPill label={selected.status} />
          <Text style={styles.meta}>Seller: {selected.sellerCode} {selected.businessName}</Text>
          <Text style={styles.meta}>Plan: {selected.plan} • {formatCurrency(selected.amount)}</Text>
          <Text style={styles.meta}>Method: {selected.method}</Text>
          <Text style={styles.meta}>Gateway ref: {selected.gatewayRef || '—'}</Text>
          <Text style={styles.meta}>Snapshot: {formatCurrency(selected.planPriceSnapshot)}</Text>
          {selected.status === 'PENDING' && (
            <Text style={styles.warn}>Pending payments do not extend a subscription.</Text>
          )}
          {selected.status === 'FAILED' && (
            <Text style={styles.warn}>Failed payments cannot be marked successful manually. Seller should retry.</Text>
          )}
          <TouchableOpacity onPress={() => selected.sellerId && navigation.navigate('SellerDetail', { sellerId: selected.sellerId })}>
            <Text style={styles.link}>View seller</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => selected.status === 'PENDING'
            ? Alert.alert('Status', 'Still pending. Refresh the list after the gateway updates.')
            : setSelected(null)}
          >
            <Text style={styles.link}>{selected.status === 'PENDING' ? 'Check status' : 'Close'}</Text>
          </TouchableOpacity>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.md },
  summary: { padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  revenue: { fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.primary },
  tabs: { marginBottom: spacing.md },
  tab: { backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.sm },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textSecondary },
  tabTextActive: { color: colors.white, fontWeight: typography.fontWeight.semibold },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  mini: { backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  miniActive: { backgroundColor: colors.primary },
  miniText: { color: colors.textSecondary },
  miniTextActive: { color: colors.white },
  card: { padding: spacing.md, marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { color: colors.primary, fontWeight: typography.fontWeight.bold },
  business: { fontWeight: typography.fontWeight.semibold, marginTop: spacing.xs },
  meta: { color: colors.textSecondary, marginTop: 2 },
  detail: { padding: spacing.md, marginBottom: spacing.lg },
  section: { fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm },
  warn: { color: colors.warning, marginTop: spacing.sm },
  link: { color: colors.primary, marginTop: spacing.md, fontWeight: typography.fontWeight.semibold },
});

import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, DatePicker, Input, Loading, StatusPill } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetAdminPaymentsQuery } from '../../store/api/platformAdminApi';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { SellerPayment } from '../../types/platformAdmin.types';

const PAGE_SIZE = 6;
const COLS = [
  { title: 'Transaction ID', flex: 1.6 },
  { title: 'Seller / Business', flex: 1.7 },
  { title: 'Plan', flex: 1.1 },
  { title: 'Amount', flex: 1 },
  { title: 'Method', flex: 0.9 },
  { title: 'Date & time', flex: 1.5 },
  { title: 'Status', flex: 1.1 },
  { title: 'Gateway ref', flex: 1.2 },
  { title: 'Action', flex: 0.8 },
];
const STATUS_TABS = ['All', 'SUCCESSFUL', 'PENDING', 'FAILED'] as const;

const FilterDropdown = ({
  label,
  value,
  options,
  open,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  open: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) => (
  <View style={[styles.dropWrap, open && styles.dropWrapOpen]}>
    <TouchableOpacity style={styles.dropButton} onPress={onToggle}>
      <Text style={styles.dropValue}>{value === 'All' ? label : value}</Text>
      <Text style={styles.dropCaret}>{open ? '▴' : '▾'}</Text>
    </TouchableOpacity>
    {open && (
      <View style={styles.dropMenu}>
        {options.map((item) => (
          <TouchableOpacity key={item} style={[styles.dropOption, item === value && styles.dropOptionActive]} onPress={() => onChange(item)}>
            <Text style={[styles.dropOptionText, item === value && styles.dropOptionTextActive]}>{item === 'All' ? label : item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </View>
);

const todayString = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
};

const paymentDay = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const inThisMonth = (value?: string) => {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

export const PaymentListScreen = ({ navigation, route }: any) => {
  const { data: payments = [], isLoading } = useGetAdminPaymentsQuery();
  const [tab, setTab] = useState<string>(route?.params?.status || 'All');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [method, setMethod] = useState('All');
  const [plan, setPlan] = useState('All');
  const [openFilter, setOpenFilter] = useState<'method' | 'plan' | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SellerPayment | null>(null);

  useEffect(() => {
    if (route?.params?.status) setTab(route.params.status);
  }, [route?.params?.status]);

  useEffect(() => {
    setPage(1);
  }, [tab, search, method, plan, fromDate, toDate]);

  const filtered = useMemo(() => {
    return payments.filter((payment) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || [payment.transactionCode, payment.businessName, payment.sellerName, payment.sellerCode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesTab = tab === 'All' || payment.status === tab;
      const matchesMethod = method === 'All' || payment.method === method;
      const matchesPlan = plan === 'All' || payment.plan === plan;
      const day = paymentDay(payment.paidAt || payment.createdAt);
      const matchesFrom = !fromDate || (day && day >= fromDate);
      const matchesTo = !toDate || (day && day <= toDate);
      return matchesSearch && matchesTab && matchesMethod && matchesPlan && matchesFrom && matchesTo;
    });
  }, [payments, search, tab, method, plan, fromDate, toDate]);

  const monthSuccessful = payments.filter((payment) => payment.status === 'SUCCESSFUL' && inThisMonth(payment.paidAt || payment.createdAt));
  const monthRevenue = monthSuccessful.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const pendingCount = payments.filter((payment) => payment.status === 'PENDING').length;
  const failedCount = payments.filter((payment) => payment.status === 'FAILED').length;
  const cashCount = payments.filter((payment) => payment.method === 'CASH' && inThisMonth(payment.paidAt || payment.createdAt)).length;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setTab('All');
    setSearch('');
    setFromDate('');
    setToDate('');
    setMethod('All');
    setPlan('All');
    setOpenFilter(null);
  };

  const exportRows = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const header = ['Transaction', 'Seller', 'Business', 'Plan', 'Amount', 'Method', 'Date', 'Status', 'Gateway'];
    const lines = [header, ...filtered.map((payment) => [
      payment.transactionCode,
      payment.sellerName || '',
      payment.businessName || '',
      payment.plan || '',
      payment.amount,
      payment.method || '',
      payment.paidAt ? formatDateTime(payment.paidAt) : '',
      payment.status || '',
      payment.gatewayRef || '',
    ])].map((cols) => cols.map((col) => `"${String(col ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([lines], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'subscription-payments.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading payments..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>ADMIN / PAYMENTS</Text>
          <Text style={styles.title}>Payments / Transactions</Text>
          <Text style={styles.subtitle}>Platform seller subscription payment ledger. Buyer order payments are not included.</Text>
        </View>
        <TouchableOpacity style={styles.exportButton} onPress={exportRows}>
          <Text style={styles.exportText}>Export Transactions</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <Summary label="Revenue this month" value={formatCurrency(monthRevenue)} hint="Successful payments only" />
        <Summary label="Successful" value={String(monthSuccessful.length)} hint="Confirmed transactions" />
        <Summary label="Pending" value={String(pendingCount)} hint="Not counted as revenue" />
        <Summary label="Failed" value={String(failedCount)} hint="Seller must retry" />
        <Summary label="Cash payments" value={String(cashCount)} hint="Admin-recorded this month" />
      </View>

      <Card style={styles.ledger}>
        <View style={styles.tabs}>
          {STATUS_TABS.map((item) => {
            const count = item === 'All' ? payments.length : payments.filter((payment) => payment.status === item).length;
            return (
              <TouchableOpacity key={item} style={[styles.tab, tab === item && styles.tabActive]} onPress={() => setTab(item)}>
                <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item === 'All' ? 'All' : item[0] + item.slice(1).toLowerCase()} {count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.filterRow}>
          <View style={styles.searchWrap}>
            <Input label="" value={search} onChangeText={setSearch} placeholder="Search transaction, seller ID or business" />
          </View>
          <View style={styles.dateWrap}>
            <DatePicker label="From" value={fromDate} onChange={setFromDate} maxDate={toDate || todayString()} placeholder="From date" />
          </View>
          <View style={styles.dateWrap}>
            <DatePicker label="To" value={toDate} onChange={setToDate} maxDate={todayString()} placeholder="To date" />
          </View>
          <FilterDropdown
            label="All Methods"
            value={method}
            options={['All', 'CASH', 'UPI', 'GATEWAY']}
            open={openFilter === 'method'}
            onToggle={() => setOpenFilter(openFilter === 'method' ? null : 'method')}
            onChange={(value) => { setMethod(value); setOpenFilter(null); }}
          />
          <FilterDropdown
            label="All Plans"
            value={plan}
            options={['All', 'MONTHLY', 'YEARLY']}
            open={openFilter === 'plan'}
            onToggle={() => setOpenFilter(openFilter === 'plan' ? null : 'plan')}
            onChange={(value) => { setPlan(value); setOpenFilter(null); }}
          />
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.countLine}>{filtered.length} transaction{filtered.length === 1 ? '' : 's'}</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            {COLS.map((column) => (
              <View key={column.title} style={[styles.headCell, { flex: column.flex }]}>
                <Text style={styles.headText}>{column.title}</Text>
              </View>
            ))}
          </View>
          {visible.map((payment) => (
            <View key={payment.id} style={styles.tableRow}>
              <View style={[styles.cell, { flex: COLS[0].flex }]}><Text style={styles.code}>{payment.transactionCode}</Text></View>
              <View style={[styles.cell, { flex: COLS[1].flex }]}>
                <Text style={styles.business}>{payment.businessName || payment.sellerName}</Text>
                <Text style={styles.tiny}>{payment.sellerCode || ''}</Text>
              </View>
              <View style={[styles.cell, { flex: COLS[2].flex }]}><Text style={styles.cellText}>{payment.plan || '—'}</Text></View>
              <View style={[styles.cell, { flex: COLS[3].flex }]}><Text style={styles.cellText}>{formatCurrency(payment.amount)}</Text></View>
              <View style={[styles.cell, { flex: COLS[4].flex }]}><Text style={styles.cellText}>{payment.method || '—'}</Text></View>
              <View style={[styles.cell, { flex: COLS[5].flex }]}><Text style={styles.cellText}>{payment.paidAt ? formatDateTime(payment.paidAt) : '—'}</Text></View>
              <View style={[styles.cell, { flex: COLS[6].flex }]}><StatusPill label={payment.status} /></View>
              <View style={[styles.cell, { flex: COLS[7].flex }]}><Text style={styles.cellText}>{payment.gatewayRef || '—'}</Text></View>
              <TouchableOpacity style={[styles.cell, { flex: COLS[8].flex }]} onPress={() => setSelected(payment)}>
                <Text style={styles.action}>{payment.status === 'PENDING' ? 'Check status' : 'View'}</Text>
              </TouchableOpacity>
            </View>
          ))}
          {visible.length === 0 && <Text style={styles.empty}>No transactions for this filter.</Text>}
        </View>

        <View style={styles.pager}>
          <TouchableOpacity disabled={page <= 1} onPress={() => setPage((current) => Math.max(1, current - 1))}>
            <Text style={[styles.pageBtn, page <= 1 && styles.pageDisabled]}>‹</Text>
          </TouchableOpacity>
          {Array.from({ length: pageCount }, (_, index) => index + 1).slice(0, 6).map((number) => (
            <TouchableOpacity key={number} onPress={() => setPage(number)}>
              <Text style={[styles.pageBtn, page === number && styles.pageActive]}>{number}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity disabled={page >= pageCount} onPress={() => setPage((current) => Math.min(pageCount, current + 1))}>
            <Text style={[styles.pageBtn, page >= pageCount && styles.pageDisabled]}>›</Text>
          </TouchableOpacity>
        </View>
      </Card>

      <View style={styles.legendRow}>
        <Legend title="Successful" text="Counts as platform revenue and can extend the seller subscription." />
        <Legend title="Pending" text="Payment is being processed. Not counted as revenue until it succeeds." />
        <Legend title="Failed" text="Does not extend the subscription. Seller retries payment." />
        <Legend title="Gateway verification" text="Gateway reference is stored with the payment. Cash has no gateway ref." />
      </View>
      <Text style={styles.boundary}>This ledger contains only seller platform subscription transactions. Buyer order payments stay on Orders.</Text>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.popup}>
            {selected && (
              <>
                <View style={styles.popupTop}>
                  <View>
                    <Text style={styles.kicker}>TRANSACTION DETAILS</Text>
                    <Text style={styles.popupCode}>{selected.transactionCode}</Text>
                  </View>
                  <StatusPill label={selected.status} />
                </View>
                <View style={styles.detailGrid}>
                  <Detail label="Seller" value={selected.businessName || selected.sellerName || '—'} />
                  <Detail label="Seller ID" value={selected.sellerCode || '—'} />
                  <Detail label="Plan" value={selected.plan || '—'} />
                  <Detail label="Amount" value={formatCurrency(selected.amount)} />
                  <Detail label="Payment method" value={selected.method || '—'} />
                  <Detail label="Payment date" value={selected.paidAt ? formatDateTime(selected.paidAt) : '—'} />
                  <Detail label="Gateway reference" value={selected.gatewayRef || '—'} />
                  <Detail label="Recorded" value={selected.createdAt ? formatDateTime(selected.createdAt) : '—'} />
                </View>
                {selected.status === 'PENDING' && <Text style={styles.warn}>Pending payments do not extend a subscription.</Text>}
                {selected.status === 'FAILED' && <Text style={styles.warn}>Failed payments cannot be marked successful here. The seller should retry.</Text>}
                <View style={styles.popupActions}>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                    <Text style={styles.closeBtnText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.viewSellerBtn}
                    onPress={() => {
                      const sellerId = selected.sellerId;
                      setSelected(null);
                      if (sellerId) navigation.navigate('SellerDetail', { sellerId });
                    }}
                  >
                    <Text style={styles.viewSellerText}>View Seller</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
};

const Summary = ({ label, value, hint }: { label: string; value: string; hint: string }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryHint}>{hint}</Text>
  </View>
);

const Legend = ({ title, text }: { title: string; text: string }) => (
  <View style={styles.legend}>
    <Text style={styles.legendTitle}>{title}</Text>
    <Text style={styles.legendText}>{text}</Text>
  </View>
);

const Detail = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailItem}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { padding: spacing.md, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  kicker: { color: '#0F766E', fontSize: 11, fontWeight: typography.fontWeight.bold, letterSpacing: 0.6 },
  title: { fontSize: 28, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: 4, maxWidth: 560 },
  exportButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  exportText: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flexGrow: 1, flexBasis: 140, backgroundColor: colors.white, borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: '#E6EEF6' },
  summaryLabel: { color: colors.textSecondary, fontSize: typography.fontSize.xs },
  summaryValue: { marginTop: 4, fontSize: 22, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  summaryHint: { marginTop: 2, color: colors.textSecondary, fontSize: 11 },
  ledger: { padding: spacing.md, marginBottom: spacing.md },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  tabText: { color: colors.textSecondary, fontWeight: typography.fontWeight.semibold },
  tabTextActive: { color: colors.textPrimary },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, zIndex: 5 },
  searchWrap: { flexGrow: 1, minWidth: 220 },
  dateWrap: { width: 160 },
  dropWrap: { minWidth: 140, position: 'relative' },
  dropWrapOpen: { zIndex: 20 },
  dropButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  dropValue: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  dropCaret: { color: colors.textSecondary, marginLeft: 8 },
  dropMenu: { position: 'absolute', top: 44, left: 0, right: 0, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 8, zIndex: 30 },
  dropOption: { paddingHorizontal: 12, paddingVertical: 10 },
  dropOptionActive: { backgroundColor: '#E8F1FC' },
  dropOptionText: { color: colors.textPrimary },
  dropOptionTextActive: { color: colors.primary, fontWeight: typography.fontWeight.bold },
  clearButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.white },
  clearText: { fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  countLine: { color: colors.textSecondary, marginBottom: spacing.sm, fontSize: typography.fontSize.xs },
  table: { width: '100%' },
  tableHead: { flexDirection: 'row', width: '100%', backgroundColor: '#F8FAFC', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E6EEF6' },
  headCell: { paddingHorizontal: 12, paddingVertical: 14, minWidth: 0 },
  headText: { fontSize: 13, color: colors.textSecondary, fontWeight: typography.fontWeight.bold },
  tableRow: { flexDirection: 'row', width: '100%', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEF2F6', minHeight: 64 },
  cell: { paddingHorizontal: 12, paddingVertical: 14, minWidth: 0, justifyContent: 'center' },
  cellText: { color: colors.textPrimary, fontSize: 15 },
  code: { color: colors.primary, fontWeight: typography.fontWeight.bold, fontSize: 15 },
  business: { fontWeight: typography.fontWeight.semibold, color: colors.textPrimary, fontSize: 15 },
  tiny: { color: colors.textSecondary, fontSize: 11 },
  action: { color: colors.primary, fontWeight: typography.fontWeight.bold },
  empty: { padding: spacing.md, color: colors.textSecondary },
  pager: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: spacing.md },
  pageBtn: { minWidth: 28, textAlign: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, color: colors.textPrimary, overflow: 'hidden' },
  pageActive: { backgroundColor: '#1D4ED8', color: colors.white, fontWeight: typography.fontWeight.bold },
  pageDisabled: { color: colors.gray400 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  legend: { flexGrow: 1, flexBasis: 180, backgroundColor: colors.white, borderRadius: 10, padding: spacing.md, borderWidth: 1, borderColor: '#E6EEF6' },
  legendTitle: { fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: 4 },
  legendText: { color: colors.textSecondary, fontSize: typography.fontSize.xs },
  boundary: { marginTop: spacing.md, backgroundColor: '#FFF8E8', color: '#92400E', padding: spacing.sm, borderRadius: 8, fontSize: typography.fontSize.xs },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', padding: spacing.lg },
  popup: { backgroundColor: colors.white, borderRadius: 14, padding: spacing.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  popupTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  popupCode: { fontSize: 20, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  detailItem: { width: '50%', marginBottom: spacing.sm },
  detailLabel: { color: colors.textSecondary, fontSize: 11 },
  detailValue: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  warn: { color: colors.warning, marginTop: spacing.sm },
  popupActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  closeBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  closeBtnText: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  viewSellerBtn: { backgroundColor: '#0F766E', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  viewSellerText: { color: colors.white, fontWeight: typography.fontWeight.bold },
});

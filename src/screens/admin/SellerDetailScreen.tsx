import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Card, Loading, StatusPill } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import {
  useDeactivateAdminSellerMutation,
  useGetAdminSellerQuery,
  useReactivateAdminSellerMutation,
  useRenewAdminSubscriptionMutation,
} from '../../store/api/platformAdminApi';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const REASONS = ['Business Closed', 'Seller Requested', 'Payment Issue', 'Admin Decision', 'Other'];

export const SellerDetailScreen = ({ navigation, route }: any) => {
  const sellerId = route?.params?.sellerId;
  const { data: seller, isLoading, refetch } = useGetAdminSellerQuery(sellerId, { skip: !sellerId });
  const [deactivate, { isLoading: deactivating }] = useDeactivateAdminSellerMutation();
  const [reactivate, { isLoading: reactivating }] = useReactivateAdminSellerMutation();
  const [renew, { isLoading: renewing }] = useRenewAdminSubscriptionMutation();
  const [reason, setReason] = useState(REASONS[0]);
  const [adminNote, setAdminNote] = useState('');
  const [renewPlan, setRenewPlan] = useState('MONTHLY');
  const [paidAt, setPaidAt] = useState('');
  const [showRenew, setShowRenew] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [notice, setNotice] = useState('');

  if (isLoading || !seller) {
    return <Loading fullScreen message="Loading seller..." />;
  }

  const accountOff = seller.loginActive === false || (seller.loginActive == null && seller.accountStatus === 'DEACTIVATED');

  const openRenew = () => {
    setRenewPlan(seller.plan || 'MONTHLY');
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    setPaidAt(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
    setShowRenew(true);
  };

  const handleDeactivate = async () => {
    try {
      await deactivate({ id: seller.id, reason, adminNote }).unwrap();
      setShowDeactivate(false);
      setNotice('Seller account deactivated. They cannot log in until you reactivate them.');
      refetch();
    } catch (e: any) {
      setNotice(e?.data?.message || e?.message || 'Could not deactivate seller');
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivate({ id: seller.id, adminNote }).unwrap();
      setNotice('Seller reactivated.');
      refetch();
    } catch (e: any) {
      setNotice(e?.data?.message || e?.message || 'Could not reactivate seller');
    }
  };

  const handleRenew = async () => {
    try {
      await renew({ sellerId: seller.id, plan: renewPlan, paidAt: paidAt || undefined }).unwrap();
      setShowRenew(false);
      setNotice('Cash renewal recorded and the subscription was extended.');
      refetch();
    } catch (e: any) {
      setNotice(e?.data?.message || e?.message || 'Could not renew subscription');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>ADMIN / SELLERS / {seller.sellerCode}</Text>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{seller.businessName}</Text>
          <Text style={styles.subtitle}>{seller.sellerCode} • {seller.ownerName}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('EditSeller', { sellerId: seller.id })}>
            <Text style={styles.outlineText}>Edit Seller</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={openRenew}>
            <Text style={styles.primaryText}>Renew / Extend</Text>
          </TouchableOpacity>
          {accountOff ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleReactivate} disabled={reactivating}>
              <Text style={styles.primaryText}>{reactivating ? 'Reactivating…' : 'Reactivate'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.dangerBtn} onPress={() => setShowDeactivate(true)}>
              <Text style={styles.primaryText}>Deactivate</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.pills}>
        <StatusPill label={seller.accountStatus} />
        <StatusPill label={seller.subscriptionStatus} />
        <StatusPill label={seller.paymentStatus} />
      </View>
      {!!notice && <Text style={styles.notice}>{notice}</Text>}

      <View style={styles.split}>
        <Card style={styles.card}>
          <Text style={styles.section}>Seller Information</Text>
          <Info label="Seller ID" value={seller.sellerCode} />
          <Info label="Company code" value={seller.companyCode || '—'} />
          <Info label="Owner" value={seller.ownerName} />
          <Info label="Mobile" value={seller.mobile} />
          <Info label="Alternate" value={seller.alternateMobile || '—'} />
          <Info label="Email" value={seller.email || '—'} />
          <Info label="Address" value={`${seller.businessAddress}, ${seller.area}, ${seller.city} ${seller.pincode}`} />
        </Card>
        <Card style={styles.card}>
          <Text style={styles.section}>Subscription</Text>
          <Text style={styles.amount}>{formatCurrency(seller.amount)}</Text>
          <Text style={styles.hint}>{seller.plan || 'MONTHLY'}</Text>
          <Info label="Start" value={seller.startDate || '—'} />
          <Info label="Expiry" value={seller.expiryDate ? `${seller.expiryDate} (${seller.daysRemaining ?? '—'} days)` : '—'} />
          <TouchableOpacity style={styles.wideBtn} onPress={openRenew}>
            <Text style={styles.primaryText}>Record cash renewal</Text>
          </TouchableOpacity>
        </Card>
      </View>

      <View style={styles.split}>
        <Card style={styles.card}>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>Payment History</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PaymentList')}>
              <Text style={styles.link}>View all</Text>
            </TouchableOpacity>
          </View>
          {(seller.payments || []).length === 0 ? <Text style={styles.hint}>No payments yet.</Text> : (seller.payments || []).slice(0, 5).map((payment) => (
            <View key={payment.id} style={styles.payRow}>
              <Text style={styles.payCode}>{payment.transactionCode}</Text>
              <Text style={styles.payMeta}>{payment.paidAt ? formatDateTime(payment.paidAt) : '—'}</Text>
              <Text style={styles.payMeta}>{payment.plan}</Text>
              <Text style={styles.payMeta}>{payment.method}</Text>
              <Text style={styles.payMeta}>{formatCurrency(payment.amount)}</Text>
              <StatusPill label={payment.status} />
            </View>
          ))}
        </Card>
        <Card style={styles.card}>
          <Text style={styles.section}>Account Management</Text>
          <Text style={styles.hint}>Deactivate turns off this seller login. A later payment does not turn the account back on.</Text>
          {accountOff ? (
            <TouchableOpacity style={styles.wideBtn} onPress={handleReactivate}>
              <Text style={styles.primaryText}>{reactivating ? 'Reactivating…' : 'Reactivate Seller'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.dangerWide} onPress={() => setShowDeactivate(true)}>
              <Text style={styles.primaryText}>Deactivate Seller</Text>
            </TouchableOpacity>
          )}
        </Card>
      </View>

      <Modal visible={showRenew} transparent animationType="fade" onRequestClose={() => setShowRenew(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowRenew(false)}>
          <Pressable style={styles.popup}>
            <Text style={styles.popupTitle}>Record Cash Renewal</Text>
            <Text style={styles.hint}>Cash collected outside the app. Amount follows the selected plan.</Text>
            <Text style={styles.fieldLabel}>Plan</Text>
            <TouchableOpacity style={styles.field} onPress={() => setPlanOpen((open) => !open)}>
              <Text>{renewPlan === 'YEARLY' ? 'Yearly' : 'Monthly'}</Text>
            </TouchableOpacity>
            {planOpen && (
              <View style={styles.menu}>
                {['MONTHLY', 'YEARLY'].map((item) => (
                  <TouchableOpacity key={item} style={styles.menuItem} onPress={() => { setRenewPlan(item); setPlanOpen(false); }}>
                    <Text>{item === 'YEARLY' ? 'Yearly' : 'Monthly'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={styles.fieldLabel}>Amount</Text>
            <View style={styles.field}><Text>{formatCurrency(seller.amount)}</Text></View>
            <Text style={styles.fieldLabel}>Payment method</Text>
            <View style={styles.field}><Text>Cash</Text></View>
            <Text style={styles.fieldLabel}>Payment date & time</Text>
            <TextInput style={styles.field} value={paidAt} onChangeText={setPaidAt} />
            <View style={styles.popupActions}>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowRenew(false)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleRenew} disabled={renewing}>
                <Text style={styles.primaryText}>{renewing ? 'Saving…' : 'Confirm Cash Renewal'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showDeactivate} transparent animationType="fade" onRequestClose={() => setShowDeactivate(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowDeactivate(false)}>
          <Pressable style={styles.popup}>
            <Text style={styles.popupTitle}>Deactivate Seller?</Text>
            <Text style={styles.hint}>App access stops. A later payment will not turn this account back on.</Text>
            <Text style={styles.fieldLabel}>Reason</Text>
            <TouchableOpacity style={styles.field} onPress={() => setReasonOpen((open) => !open)}>
              <Text>{reason}</Text>
            </TouchableOpacity>
            {reasonOpen && (
              <View style={styles.menu}>
                {REASONS.map((item) => (
                  <TouchableOpacity key={item} style={styles.menuItem} onPress={() => { setReason(item); setReasonOpen(false); }}>
                    <Text>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={styles.fieldLabel}>Admin note</Text>
            <TextInput style={[styles.field, styles.note]} value={adminNote} onChangeText={setAdminNote} placeholder="Add context for the audit log" multiline />
            <View style={styles.popupActions}>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowDeactivate(false)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.dangerBtn} onPress={handleDeactivate} disabled={deactivating}>
                <Text style={styles.primaryText}>{deactivating ? 'Deactivating…' : 'Deactivate Seller'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.info}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { padding: spacing.md, paddingBottom: 40 },
  kicker: { color: '#0F766E', fontSize: 11, fontWeight: typography.fontWeight.bold },
  header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm, marginTop: 4 },
  title: { fontSize: 28, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.sm },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  pills: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  notice: { backgroundColor: '#ECFDF5', color: '#065F46', padding: spacing.sm, borderRadius: 8, marginBottom: spacing.md },
  split: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { flexGrow: 1, flexBasis: 320, padding: spacing.md, marginBottom: spacing.md },
  section: { fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg, color: colors.textPrimary, marginBottom: spacing.sm },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 28, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  hint: { color: colors.textSecondary, marginBottom: spacing.sm },
  info: { marginBottom: spacing.sm },
  infoLabel: { color: colors.textSecondary, fontSize: typography.fontSize.xs },
  infoValue: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  outlineBtn: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  outlineText: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  primaryBtn: { backgroundColor: '#0F4C81', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  primaryText: { color: colors.white, fontWeight: typography.fontWeight.bold },
  dangerBtn: { backgroundColor: '#DC2626', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  dangerWide: { backgroundColor: '#DC2626', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: spacing.sm },
  dangerOutline: { borderWidth: 1, borderColor: '#DC2626', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  dangerText: { color: '#DC2626', fontWeight: typography.fontWeight.bold },
  wideBtn: { backgroundColor: '#0F766E', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: spacing.sm },
  link: { color: colors.primary, fontWeight: typography.fontWeight.semibold },
  payRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderTopColor: '#EEF2F6', paddingVertical: 8 },
  payCode: { color: colors.primary, fontWeight: typography.fontWeight.bold, minWidth: 90 },
  payMeta: { color: colors.textSecondary },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', padding: spacing.lg },
  popup: { backgroundColor: colors.white, borderRadius: 14, padding: spacing.lg, maxWidth: 440, width: '100%', alignSelf: 'center' },
  popupTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs },
  fieldLabel: { color: colors.textSecondary, fontSize: typography.fontSize.xs, marginTop: spacing.sm },
  field: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, marginTop: 4, backgroundColor: colors.white },
  note: { minHeight: 70, textAlignVertical: 'top' },
  menu: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginTop: 4 },
  menuItem: { padding: 10 },
  popupActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
});

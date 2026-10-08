import React, { useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, ContactActions, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetShopBuyersQuery, useGetShopCompanyQuery, useGetShopInboxQuery, useMarkShopInboxReadMutation } from '../../store/api/shopApi';
import { formatDateTime } from '../../utils/formatters';
import { regularNoticeLook, regularNoticeTone } from '../../utils/regularNotice';
import { CreateBuyerModal } from './CreateBuyerModal';

export const ShopBuyersScreen = ({ navigation }: any) => {
  const { data: company } = useGetShopCompanyQuery();
  const { data: buyers = [], isLoading } = useGetShopBuyersQuery();
  const { data: inbox = [] } = useGetShopInboxQuery();
  const [markInboxRead] = useMarkShopInboxReadMutation();
  const [showCreate, setShowCreate] = useState(false);

  useLayoutEffect(() => {
    navigation?.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerCreateButton}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.headerCreatePlus}>+</Text>
          <Text style={styles.headerCreateText}>Create buyer</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const unreadInbox = inbox.filter((item) => !item.isRead);

  if (isLoading) {
    return <Loading fullScreen message="Loading buyers..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Buyers</Text>
      <Card style={styles.card}>
        <Text style={styles.label}>Company</Text>
        <Text style={styles.value}>{company?.companyName || '—'}</Text>
        <Text style={styles.label}>Company code</Text>
        <Text style={styles.code}>{company?.companyCode || '—'}</Text>
        <Text style={styles.meta}>Share this code. Buyers who register with it belong only to you.</Text>
      </Card>

      <Text style={styles.section}>Buyers ({buyers.length})</Text>
      {buyers.length === 0 ? (
        <Card style={styles.card}><Text style={styles.meta}>No buyers have joined with your company code yet.</Text></Card>
      ) : buyers.map((buyer) => (
        <Card key={buyer.id} style={styles.card}>
          <Text style={styles.value}>{buyer.fullName || buyer.username}</Text>
          <Text style={styles.meta}>{buyer.username} • {buyer.phone || buyer.phoneNumber || 'No mobile'}</Text>
          {!!buyer.email && <Text style={styles.meta}>{buyer.email}</Text>}
          <Text style={styles.meta}>
            {[buyer.houseDoorNo, buyer.streetArea, buyer.city, buyer.pincode].filter(Boolean).join(', ') || 'No address'}
          </Text>
          <ContactActions phone={buyer.phone || buyer.phoneNumber} email={buyer.email} message={`Hello ${buyer.fullName || buyer.username}, this is your Natural Drops seller.`} />
        </Card>
      ))}

      {unreadInbox.some((item) => regularNoticeTone(item.title)) && (
        <>
          <Text style={styles.pauseSection}>Regular order updates</Text>
          {unreadInbox.filter((item) => regularNoticeTone(item.title)).map((item) => {
            const look = regularNoticeLook[regularNoticeTone(item.title)!];
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => markInboxRead(item.id)}
              >
                <Card style={[styles.card, { backgroundColor: look.background, borderWidth: 2, borderColor: look.border }]}>
                  <View style={styles.row}>
                    <Text style={styles.value}>{item.title}</Text>
                    <Text style={[styles.pauseBadge, { backgroundColor: look.border }]}>{look.badge}</Text>
                  </View>
                  <Text style={styles.meta}>{item.message}</Text>
                  <Text style={styles.meta}>{formatDateTime(item.createdAt)}</Text>
                  <Text style={[styles.pauseHint, { color: look.border }]}>Tap to mark as read</Text>
                </Card>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {unreadInbox.some((item) => !regularNoticeTone(item.title)) && (
        <>
          <Text style={styles.section}>Join messages</Text>
          {unreadInbox.filter((item) => !regularNoticeTone(item.title)).map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => markInboxRead(item.id)}
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.value}>{item.title}</Text>
                  <Text style={styles.new}>NEW</Text>
                </View>
                <Text style={styles.meta}>{item.message}</Text>
                <Text style={styles.meta}>{formatDateTime(item.createdAt)}</Text>
                <Text style={styles.new}>Tap to mark as read</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}

      <CreateBuyerModal visible={showCreate} onClose={() => setShowCreate(false)} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.md },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  card: { padding: spacing.md, marginBottom: spacing.sm },
  pauseSection: { marginTop: spacing.md, marginBottom: spacing.sm, color: '#9A3412', fontWeight: typography.fontWeight.bold },
  pauseCard: { backgroundColor: '#FFF7ED', borderWidth: 2, borderColor: '#EA580C' },
  pauseBadge: { backgroundColor: '#EA580C', color: colors.white, fontWeight: typography.fontWeight.bold, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  pauseHint: { color: '#EA580C', fontWeight: typography.fontWeight.bold, marginTop: spacing.xs },
  label: { color: colors.textSecondary, marginTop: spacing.xs },
  value: { fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  code: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary, marginVertical: spacing.xs },
  meta: { color: colors.textSecondary, marginTop: 4 },
  error: { color: colors.error, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  new: { color: colors.warning, fontWeight: typography.fontWeight.bold },
  headerCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginRight: spacing.md,
  },
  headerCreatePlus: {
    color: colors.white,
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    marginRight: 4,
  },
  headerCreateText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    padding: spacing.md,
    overflow: 'visible',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  formContent: {
    paddingBottom: spacing.md,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.bold,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  popupCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    width: '100%',
    maxWidth: 420,
    padding: spacing.lg,
  },
  popupTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  popupMessage: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  shareButton: {
    backgroundColor: colors.gray100,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  shareButtonText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  popupButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  popupButtonText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
});

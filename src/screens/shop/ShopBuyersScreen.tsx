import React, { useLayoutEffect, useState } from 'react';
import { Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AutocompleteInput, Button, Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useCreateShopBuyerMutation, useGetShopBuyersQuery, useGetShopCompanyQuery, useGetShopInboxQuery, useMarkShopInboxReadMutation } from '../../store/api/shopApi';
import { formatDateTime } from '../../utils/formatters';
import { regularNoticeLook, regularNoticeTone } from '../../utils/regularNotice';
import { locationApiService, PincodeSuggestion } from '../../services/locationApi.service';

type InviteResult = {
  username: string;
  inviteLink: string;
  shareMessage: string;
  whatsappUrl: string;
  smsUrl: string;
  emailSent: boolean;
  sellerEmailSent: boolean;
};

export const ShopBuyersScreen = ({ navigation }: any) => {
  const { data: company } = useGetShopCompanyQuery();
  const { data: buyers = [], isLoading } = useGetShopBuyersQuery();
  const { data: inbox = [] } = useGetShopInboxQuery();
  const [markInboxRead] = useMarkShopInboxReadMutation();
  const [createBuyer, { isLoading: creating }] = useCreateShopBuyerMutation();
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    phone: '',
    email: '',
    houseDoorNo: '',
    streetArea: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
  });
  const [formError, setFormError] = useState('');
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pincodeSuggestions, setPincodeSuggestions] = useState<PincodeSuggestion[]>([]);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');

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

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyPincodeLocation = (suggestion: PincodeSuggestion) => {
    setForm((prev) => ({
      ...prev,
      pincode: suggestion.pincode,
      city: suggestion.city,
      district: suggestion.district,
      state: suggestion.state,
    }));
    setPincodeError('');
    setPincodeSuggestions([]);
  };

  const handlePincodeChange = async (text: string) => {
    const cleanPincode = text.replace(/[^0-9]/g, '').slice(0, 6);
    setForm((prev) => ({ ...prev, pincode: cleanPincode, city: '', district: '', state: '' }));
    setPincodeError('');
    setPincodeSuggestions([]);
    if (cleanPincode.length !== 6) {
      return;
    }
    setPincodeLoading(true);
    try {
      const suggestions = await locationApiService.getPincodeSuggestions(cleanPincode);
      setPincodeSuggestions(suggestions);
      if (suggestions.length === 1) {
        applyPincodeLocation(suggestions[0]);
      } else if (suggestions.length === 0) {
        setPincodeError('Invalid pincode. Please enter a valid 6-digit pincode.');
      }
    } catch (_error) {
      setPincodeError('Failed to fetch location. Please enter city, district and state.');
    } finally {
      setPincodeLoading(false);
    }
  };

  const openShare = async (url?: string) => {
    if (!url) {
      return;
    }
    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
        return;
      }
      await Linking.openURL(url);
    } catch (_error) {
      // Keep the invite popup visible if the device cannot open the app.
    }
  };

  const handleCreate = async () => {
    setFormError('');
    const missing: string[] = [];
    if (form.fullName.trim().length < 2) missing.push('Buyer name');
    if (form.username.trim().length < 3) missing.push('Username');
    if (!/^\d{10}$/.test(form.phone.trim())) missing.push('Mobile');
    if (!/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(form.email.trim())) missing.push('Email');
    if (!form.houseDoorNo.trim()) missing.push('House / door no');
    if (form.streetArea.trim().length < 2) missing.push('Street / area');
    if (!/^\d{6}$/.test(form.pincode.trim())) missing.push('Pincode');
    if (form.city.trim().length < 2) missing.push('City');
    if (form.district.trim().length < 2) missing.push('District');
    if (form.state.trim().length < 2) missing.push('State');
    if (missing.length > 0) {
      setFormError(`Fill every field before creating the buyer: ${missing.join(', ')}.`);
      return;
    }
    try {
      const result = await createBuyer({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        houseDoorNo: form.houseDoorNo.trim(),
        streetArea: form.streetArea.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
      }).unwrap();
      setShowCreate(false);
      setInvite(result);
      setForm({
        fullName: '',
        username: '',
        phone: '',
        email: '',
        houseDoorNo: '',
        streetArea: '',
        city: '',
        district: '',
        state: '',
        pincode: '',
      });
      await openShare(result.whatsappUrl);
      await openShare(result.smsUrl);
    } catch (error: any) {
      setFormError(error?.data?.message || error?.message || 'Could not create buyer');
    }
  };

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

      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.popupOverlay}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.popupTitle}>Create buyer</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formContent}>
              <Text style={styles.meta}>Company details are filled from your shop. The buyer is mapped to {company?.companyCode || 'your company'}.</Text>
              <Input label="Company name" value={company?.companyName || ''} editable={false} />
              <Input label="Company code" value={company?.companyCode || ''} editable={false} />
              <Input label="Buyer name *" value={form.fullName} onChangeText={(text) => setField('fullName', text)} placeholder="Full name" />
              <Input label="Username *" value={form.username} onChangeText={(text) => setField('username', text)} placeholder="At least 3 letters" autoCapitalize="none" />
              <Input label="Mobile *" value={form.phone} onChangeText={(text) => setField('phone', text.replace(/[^0-9]/g, '').slice(0, 10))} placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} />
              <Input label="Email *" value={form.email} onChangeText={(text) => setField('email', text)} placeholder="Buyer email" autoCapitalize="none" keyboardType="email-address" />
              <Input label="House / door no *" value={form.houseDoorNo} onChangeText={(text) => setField('houseDoorNo', text)} />
              <Input label="Street / area *" value={form.streetArea} onChangeText={(text) => setField('streetArea', text)} />
              <AutocompleteInput
                label="Pincode *"
                value={form.pincode}
                onChangeText={handlePincodeChange}
                onSelect={(option) => applyPincodeLocation({
                  pincode: option.pincode || option.name,
                  name: option.name,
                  displayName: option.displayName || option.name,
                  city: option.city || '',
                  district: option.district || '',
                  state: option.state || '',
                })}
                placeholder="Enter 6-digit pincode"
                suggestions={pincodeSuggestions}
                isLoading={pincodeLoading}
                error={pincodeError}
                maxLength={6}
                keyboardType="number-pad"
                autoCapitalize="none"
              />
              <Input label="City *" value={form.city} onChangeText={(text) => setField('city', text)} placeholder="Auto from pincode" />
              <Input label="District *" value={form.district} onChangeText={(text) => setField('district', text)} placeholder="Auto from pincode" />
              <Input label="State *" value={form.state} onChangeText={(text) => setField('state', text)} placeholder="Auto from pincode" />
              {!!formError && <Text style={styles.error}>{formError}</Text>}
              <Button title={creating ? 'Creating...' : 'Create buyer'} onPress={handleCreate} disabled={creating} fullWidth />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!invite} transparent animationType="fade" onRequestClose={() => setInvite(null)}>
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>Buyer created</Text>
            <Text style={styles.popupMessage}>
              Username: {invite?.username}{'\n'}
              The buyer must open the app link and create a new password before login.
            </Text>
            <Text style={styles.meta}>{invite?.inviteLink}</Text>
            <Text style={styles.meta}>
              {invite?.emailSent ? 'Email sent to the buyer. ' : 'Buyer email was not sent. '}
              {invite?.sellerEmailSent ? 'A copy was emailed to you.' : ''}
            </Text>
            <TouchableOpacity style={styles.shareButton} onPress={() => openShare(invite?.whatsappUrl)}>
              <Text style={styles.shareButtonText}>Send WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={() => openShare(invite?.smsUrl)}>
              <Text style={styles.shareButtonText}>Send SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.popupButton} onPress={() => setInvite(null)}>
              <Text style={styles.popupButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AddressMatchFields, Button, Card, Input } from '../../components/common';
import { openContact } from '../../utils/openContact';
import { colors, spacing, typography } from '../../theme';
import { useCreateAdminSellerMutation } from '../../store/api/platformAdminApi';
import { useGetSettingsQuery } from '../../store/api/settingsApi';
import { formatCurrency } from '../../utils/formatters';
import { PlanType, SellerAdmin } from '../../types/platformAdmin.types';

const EMAIL_RE = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export const AddSellerScreen = ({ navigation }: any) => {
  const [createSeller, { isLoading }] = useCreateAdminSellerMutation();
  const { data: settings } = useGetSettingsQuery();
  const [ownerName, setOwnerName] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [addressMatched, setAddressMatched] = useState(false);
  const [plan, setPlan] = useState<PlanType>('MONTHLY');
  const [created, setCreated] = useState<SellerAdmin | null>(null);

  const monthlyPrice = settings?.planMonthlyAmount || '499.00';
  const yearlyPrice = settings?.planYearlyAmount || '5389.20';
  const amount = plan === 'FREE' ? '0.00' : plan === 'YEARLY' ? yearlyPrice : monthlyPrice;
  const error = useMemo(() => {
    if (ownerName.trim().length < 2) return 'Owner name is required';
    const loginName = username.trim().toLowerCase();
    if (!/^[a-z][a-z0-9._]{2,29}$/.test(loginName)) return 'Username must start with a letter and be 3 to 30 characters';
    if (!/^[0-9]{10}$/.test(mobile)) return 'Mobile must be 10 digits';
    if (loginName === mobile) return 'Username cannot be the mobile number';
    if (alternateMobile && !/^[0-9]{10}$/.test(alternateMobile)) return 'Alternate mobile must be 10 digits';
    if (email.trim() && !EMAIL_RE.test(email.trim())) return 'Invalid email format';
    if (businessName.trim().length < 2) return 'Business name is required';
    if (businessAddress.trim().length < 4) return 'Business address is required';
    if (!addressMatched) return 'Pick an area suggestion so city and pincode match';
    return '';
  }, [ownerName, username, mobile, alternateMobile, email, businessName, businessAddress, addressMatched]);

  const resetForm = () => {
    setOwnerName('');
    setUsername('');
    setMobile('');
    setAlternateMobile('');
    setEmail('');
    setBusinessName('');
    setBusinessAddress('');
    setArea('');
    setCity('');
    setPincode('');
    setAddressMatched(false);
    setPlan('MONTHLY');
  };

  const handleCreate = async () => {
    if (error) {
      Alert.alert('Check details', error);
      return;
    }
    try {
      const seller = await createSeller({
        ownerName: ownerName.trim(),
        mobile,
        alternateMobile: alternateMobile || undefined,
        email: email.trim() || undefined,
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        area: area.trim(),
        city: city.trim(),
        username: username.trim().toLowerCase(),
        pincode,
        plan,
      }).unwrap();
      resetForm();
      setCreated(seller);
    } catch (e: any) {
      Alert.alert('Failed', e?.data?.message || e?.message || 'Could not create seller');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Add Seller</Text>
      <Text style={styles.subtitle}>Owner, business and initial plan. Payment stays pending until confirmed.</Text>

      <Card style={styles.card}>
        <Text style={styles.section}>1. Owner</Text>
        <Input label="Owner name *" value={ownerName} onChangeText={setOwnerName} />
        <Input
          label="Username *"
          value={username}
          onChangeText={(text) => setUsername(text.replace(/\s/g, '').toLowerCase())}
          autoCapitalize="none"
          placeholder="Letters first, not the mobile number"
        />
        <Input label="Mobile *" value={mobile} onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, '').slice(0, 10))} keyboardType="numeric" />
        <Input label="Alternate mobile" value={alternateMobile} onChangeText={(t) => setAlternateMobile(t.replace(/[^0-9]/g, '').slice(0, 10))} keyboardType="numeric" />
        <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>2. Business</Text>
        <Input label="Business name *" value={businessName} onChangeText={setBusinessName} />
        <Input label="Address *" value={businessAddress} onChangeText={setBusinessAddress} />
        <AddressMatchFields
          area={area}
          city={city}
          pincode={pincode}
          matched={addressMatched}
          onChange={(next) => {
            setArea(next.area);
            setCity(next.city);
            setPincode(next.pincode);
            setAddressMatched(next.matched);
          }}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>3. Plan</Text>
        <View style={styles.planRow}>
          <PlanOption title="Free" amount="₹0" selected={plan === 'FREE'} onPress={() => setPlan('FREE')} />
          <PlanOption title="Monthly" amount={formatCurrency(Number(monthlyPrice))} selected={plan === 'MONTHLY'} onPress={() => setPlan('MONTHLY')} />
          <PlanOption title="Yearly" amount={formatCurrency(Number(yearlyPrice))} selected={plan === 'YEARLY'} onPress={() => setPlan('YEARLY')} />
        </View>
        <Text style={styles.preview}>
          {plan === 'FREE'
            ? 'Free account. No payment now. Admin can change this seller to a paid plan later.'
            : `Selected: ${plan} • Amount due ₹${amount} • Payment Pending`}
        </Text>
      </Card>

      <Button
        title={isLoading ? 'Creating…' : plan === 'FREE' ? 'Create free seller account' : 'Create Seller & Continue to Payment'}
        onPress={handleCreate}
        loading={isLoading}
        fullWidth
      />
      <Button title="Cancel" variant="outline" onPress={() => navigation.goBack()} style={styles.cancel} fullWidth />

      <Modal visible={!!created} transparent animationType="fade" onRequestClose={() => setCreated(null)}>
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>Seller created</Text>
            <Text style={styles.popupMessage}>
              Company code: {created?.companyCode || created?.sellerCode}{'\n'}
              Username: {created?.username}{'\n'}
              The seller must open the app link and create a new password before login.
            </Text>
            {!!created?.inviteLink && <Text style={styles.meta}>{created.inviteLink}</Text>}
            <Text style={styles.meta}>
              {created?.emailSent
                ? 'Email sent with the username, application link, and reset password link.'
                : 'Email was not sent. Use WhatsApp or SMS to share the reset link.'}
            </Text>
            <TouchableOpacity style={styles.shareButton} onPress={() => openContact(created?.whatsappUrl)}>
              <Text style={styles.shareButtonText}>Send WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={() => openContact(created?.smsUrl)}>
              <Text style={styles.shareButtonText}>Send SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.popupButton}
              onPress={() => {
                const sellerId = created?.id;
                const freeAccount = created?.plan === 'FREE';
                setCreated(null);
                if (sellerId && !freeAccount) navigation.navigate('ActivatePayment', { sellerId });
                else navigation.navigate('SellerList');
              }}
            >
              <Text style={styles.popupButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const PlanOption = ({ title, amount, selected, onPress }: { title: string; amount: string; selected: boolean; onPress: () => void }) => (
  <TouchableOpacity style={[styles.plan, selected && styles.planActive]} onPress={onPress}>
    <Text style={[styles.planTitle, selected && styles.planTitleActive]}>{title}</Text>
    <Text style={[styles.planAmount, selected && styles.planTitleActive]}>{amount}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.md },
  card: { padding: spacing.md, marginBottom: spacing.md },
  section: { fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm, color: colors.textPrimary },
  planRow: { flexDirection: 'row', gap: spacing.md },
  plan: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, backgroundColor: colors.white },
  planActive: { borderColor: colors.primary, backgroundColor: '#E3F2FD' },
  planTitle: { fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  planTitleActive: { color: colors.primary },
  planAmount: { marginTop: 4, color: colors.textSecondary },
  preview: { marginTop: spacing.md, color: colors.textSecondary },
  cancel: { marginTop: spacing.sm },
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
  meta: { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.sm, textAlign: 'center' },
  shareButton: {
    backgroundColor: colors.gray100,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  shareButtonText: { color: colors.primary, fontWeight: typography.fontWeight.semibold },
  popupButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  popupButtonText: { color: colors.white, fontWeight: typography.fontWeight.semibold },
});

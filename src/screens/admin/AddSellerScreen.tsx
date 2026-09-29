import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Input } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useCreateAdminSellerMutation } from '../../store/api/platformAdminApi';
import { PlanType } from '../../types/platformAdmin.types';

const EMAIL_RE = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export const AddSellerScreen = ({ navigation }: any) => {
  const [createSeller, { isLoading }] = useCreateAdminSellerMutation();
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [plan, setPlan] = useState<PlanType>('MONTHLY');

  const amount = plan === 'YEARLY' ? '5389.20' : '499.00';
  const error = useMemo(() => {
    if (ownerName.trim().length < 2) return 'Owner name is required';
    if (!/^[0-9]{10}$/.test(mobile)) return 'Mobile must be 10 digits';
    if (email.trim() && !EMAIL_RE.test(email.trim())) return 'Invalid email format';
    if (businessName.trim().length < 2) return 'Business name is required';
    if (businessAddress.trim().length < 4) return 'Business address is required';
    if (area.trim().length < 2) return 'Area is required';
    if (city.trim().length < 2) return 'City is required';
    if (!/^[0-9]{6}$/.test(pincode)) return 'Pincode must be 6 digits';
    return '';
  }, [ownerName, mobile, email, businessName, businessAddress, area, city, pincode]);

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
        pincode,
        plan,
      }).unwrap();
      Alert.alert(
        'Seller created',
        `Company code: ${seller.companyCode || seller.sellerCode}\nShare this code with buyers so they join this seller only.`,
        [{ text: 'Continue', onPress: () => navigation.navigate('ActivatePayment', { sellerId: seller.id }) }]
      );
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
        <Input label="Mobile *" value={mobile} onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, '').slice(0, 10))} keyboardType="numeric" />
        <Input label="Alternate mobile" value={alternateMobile} onChangeText={(t) => setAlternateMobile(t.replace(/[^0-9]/g, '').slice(0, 10))} keyboardType="numeric" />
        <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>2. Business</Text>
        <Input label="Business name *" value={businessName} onChangeText={setBusinessName} />
        <Input label="Address *" value={businessAddress} onChangeText={setBusinessAddress} />
        <Input label="Area *" value={area} onChangeText={setArea} />
        <Input label="City *" value={city} onChangeText={setCity} />
        <Input label="Pincode *" value={pincode} onChangeText={(t) => setPincode(t.replace(/[^0-9]/g, '').slice(0, 6))} keyboardType="numeric" />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>3. Plan</Text>
        <View style={styles.planRow}>
          <PlanOption title="Monthly" amount="₹499.00" selected={plan === 'MONTHLY'} onPress={() => setPlan('MONTHLY')} />
          <PlanOption title="Yearly" amount="₹5,389.20" selected={plan === 'YEARLY'} onPress={() => setPlan('YEARLY')} />
        </View>
        <Text style={styles.preview}>Selected: {plan} • Amount due ₹{amount} • Payment Pending</Text>
      </Card>

      <Button title={isLoading ? 'Creating…' : 'Create Seller & Continue to Payment'} onPress={handleCreate} loading={isLoading} fullWidth />
      <Button title="Cancel" variant="outline" onPress={() => navigation.goBack()} style={styles.cancel} fullWidth />
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
});

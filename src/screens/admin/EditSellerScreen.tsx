import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Card, Input, Loading, StatusPill } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetAdminSellerQuery, useUpdateAdminSellerMutation } from '../../store/api/platformAdminApi';

const EMAIL_RE = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export const EditSellerScreen = ({ navigation, route }: any) => {
  const sellerId = route?.params?.sellerId;
  const { data: seller, isLoading } = useGetAdminSellerQuery(sellerId, { skip: !sellerId });
  const [updateSeller, { isLoading: saving }] = useUpdateAdminSellerMutation();
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [changeNote, setChangeNote] = useState('');

  useEffect(() => {
    if (!seller) return;
    setOwnerName(seller.ownerName || '');
    setMobile(seller.mobile || '');
    setAlternateMobile(seller.alternateMobile || '');
    setEmail(seller.email || '');
    setBusinessName(seller.businessName || '');
    setBusinessAddress(seller.businessAddress || '');
    setArea(seller.area || '');
    setCity(seller.city || '');
    setPincode(seller.pincode || '');
  }, [seller]);

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

  const handleSave = async () => {
    if (error) {
      Alert.alert('Check details', error);
      return;
    }
    try {
      await updateSeller({
        id: sellerId,
        body: {
          ownerName: ownerName.trim(),
          mobile,
          alternateMobile: alternateMobile || undefined,
          email: email.trim() || undefined,
          businessName: businessName.trim(),
          businessAddress: businessAddress.trim(),
          area: area.trim(),
          city: city.trim(),
          pincode,
          plan: seller?.plan || 'MONTHLY',
          changeNote: changeNote || undefined,
        },
      }).unwrap();
      Alert.alert('Saved', 'Seller details updated.', [
        { text: 'OK', onPress: () => navigation.navigate('SellerDetail', { sellerId }) },
      ]);
    } catch (e: any) {
      Alert.alert('Failed', e?.data?.message || e?.message || 'Could not update seller');
    }
  };

  if (isLoading || !seller) {
    return <Loading fullScreen message="Loading seller..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Edit Seller</Text>
      <Text style={styles.subtitle}>Identity and business only. Subscription and payments stay read-only.</Text>

      <Card style={styles.card}>
        <Text style={styles.readonly}>Seller ID: {seller.sellerCode}</Text>
        <StatusPill label={seller.subscriptionStatus} />
        <Input label="Owner name *" value={ownerName} onChangeText={setOwnerName} />
        <Input label="Mobile *" value={mobile} onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, '').slice(0, 10))} keyboardType="numeric" />
        <Input label="Alternate mobile" value={alternateMobile} onChangeText={(t) => setAlternateMobile(t.replace(/[^0-9]/g, '').slice(0, 10))} keyboardType="numeric" />
        <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Business name *" value={businessName} onChangeText={setBusinessName} />
        <Input label="Address *" value={businessAddress} onChangeText={setBusinessAddress} />
        <Input label="Area *" value={area} onChangeText={setArea} />
        <Input label="City *" value={city} onChangeText={setCity} />
        <Input label="Pincode *" value={pincode} onChangeText={(t) => setPincode(t.replace(/[^0-9]/g, '').slice(0, 6))} keyboardType="numeric" />
        <Input label="Change note" value={changeNote} onChangeText={setChangeNote} />
      </Card>

      <Button title={saving ? 'Saving…' : 'Confirm & Save'} onPress={handleSave} loading={saving} fullWidth />
      <Button title="Cancel" variant="outline" onPress={() => navigation.goBack()} style={styles.cancel} fullWidth />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.md },
  card: { padding: spacing.md, marginBottom: spacing.md },
  readonly: { color: colors.textSecondary, marginBottom: spacing.sm },
  cancel: { marginTop: spacing.sm },
});

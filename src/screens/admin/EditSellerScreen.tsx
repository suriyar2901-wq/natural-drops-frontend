import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AddressMatchFields, Button, Card, DatePicker, Input, Loading, StatusPill } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetAdminSellerQuery, useUpdateAdminSellerMutation } from '../../store/api/platformAdminApi';

const EMAIL_RE = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export const EditSellerScreen = ({ navigation, route }: any) => {
  const sellerId = route?.params?.sellerId;
  const { data: seller, isLoading } = useGetAdminSellerQuery(sellerId, { skip: !sellerId });
  const [updateSeller, { isLoading: saving }] = useUpdateAdminSellerMutation();
  const [ownerName, setOwnerName] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [addressMatched, setAddressMatched] = useState(false);
  const [changeNote, setChangeNote] = useState('');

  useEffect(() => {
    if (!seller) return;
    setOwnerName(seller.ownerName || '');
    setGender(seller.gender || '');
    setDateOfBirth(seller.dateOfBirth || '');
    setAadhaarNumber(seller.aadhaarNumber || '');
    setMobile(seller.mobile || '');
    setAlternateMobile(seller.alternateMobile || '');
    setEmail(seller.email || '');
    setBusinessName(seller.businessName || '');
    setBusinessAddress(seller.businessAddress || '');
    setArea(seller.area || '');
    setCity(seller.city || '');
    setPincode(seller.pincode || '');
    setAddressMatched(!!(seller.area && seller.city && seller.pincode));
  }, [seller]);

  const error = useMemo(() => {
    if (ownerName.trim().length < 2) return 'Owner name is required';
    if (!gender) return 'Gender is required';
    if (!dateOfBirth) return 'Date of birth is required';
    if (!/^[0-9]{12}$/.test(aadhaarNumber)) return 'Aadhaar number must be 12 digits';
    if (!/^[0-9]{10}$/.test(mobile)) return 'Mobile must be 10 digits';
    if (email.trim() && !EMAIL_RE.test(email.trim())) return 'Invalid email format';
    if (businessName.trim().length < 2) return 'Shop name is required';
    if (businessAddress.trim().length < 4) return 'Business address is required';
    if (!addressMatched) return 'Pick an area suggestion so city and pincode match';
    return '';
  }, [ownerName, gender, dateOfBirth, aadhaarNumber, mobile, email, businessName, businessAddress, addressMatched]);

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
          gender,
          dateOfBirth,
          aadhaarNumber,
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
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>ADMIN / SELLERS</Text>
          <Text style={styles.title}>Edit Seller</Text>
          <Text style={styles.subtitle}>Update identity, contact and business. Subscription and payments stay separate.</Text>
        </View>
        <StatusPill label={seller.sellerCode} />
      </View>

      <Card style={styles.card}>
        <Text style={styles.section}>Seller Identity</Text>
        <Text style={styles.readonly}>Seller ID: {seller.sellerCode}</Text>
        <Input label="Owner name *" value={ownerName} onChangeText={setOwnerName} />
        <Text style={styles.fieldLabel}>Gender *</Text>
        <View style={styles.choiceRow}>
          {(['Male', 'Female', 'Other'] as const).map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.choice, gender === option && styles.choiceActive]}
              onPress={() => setGender(option)}
            >
              <Text style={[styles.choiceText, gender === option && styles.choiceTextActive]}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <DatePicker label="Date of birth *" value={dateOfBirth} onChange={setDateOfBirth} maxDate={new Date().toISOString().slice(0, 10)} />
        <Input
          label="Aadhaar number *"
          value={aadhaarNumber}
          onChangeText={(text) => setAadhaarNumber(text.replace(/[^0-9]/g, '').slice(0, 12))}
          keyboardType="numeric"
          placeholder="12-digit Aadhaar number"
        />
      </Card>
      <Card style={styles.card}>
        <Text style={styles.section}>Contact Details</Text>
        <Input label="Primary mobile *" value={mobile} onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, '').slice(0, 10))} keyboardType="numeric" />
        <Input label="Alternate mobile" value={alternateMobile} onChangeText={(t) => setAlternateMobile(t.replace(/[^0-9]/g, '').slice(0, 10))} keyboardType="numeric" />
        <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      </Card>
      <Card style={styles.card}>
        <Text style={styles.section}>Business Details</Text>
        <Input label="Shop name *" value={businessName} onChangeText={setBusinessName} />
        <Input label="Business address *" value={businessAddress} onChangeText={setBusinessAddress} />
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  kicker: { color: '#0F766E', fontSize: 11, fontWeight: typography.fontWeight.bold },
  section: { fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm, color: colors.textPrimary },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.md },
  card: { padding: spacing.md, marginBottom: spacing.md },
  readonly: { color: colors.textSecondary, marginBottom: spacing.sm },
  fieldLabel: { marginTop: spacing.sm, marginBottom: spacing.xs, color: colors.textPrimary, fontWeight: typography.fontWeight.medium },
  choiceRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  choice: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  choiceActive: { borderColor: colors.primary, backgroundColor: '#E3F2FD' },
  choiceText: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  choiceTextActive: { color: colors.primary },
  cancel: { marginTop: spacing.sm },
});

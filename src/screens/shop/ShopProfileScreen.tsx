import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetShopCompanyQuery, useGetShopProfileQuery, useSaveShopProfileMutation } from '../../store/api/shopApi';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

export const ShopProfileScreen = () => {
  const { data, isLoading } = useGetShopProfileQuery();
  const { data: company } = useGetShopCompanyQuery();
  const [saveProfile, { isLoading: saving }] = useSaveShopProfileMutation();
  const [form, setForm] = useState({
    businessName: '',
    address: '',
    ownerName: '',
    altMobile: '',
    email: '',
    qrData: '',
  });
  useEffect(() => {
    if (!data) {
      return;
    }
    setForm({
      businessName: data.businessName || '',
      address: data.address || '',
      ownerName: data.ownerName || '',
      altMobile: data.altMobile || '',
      email: data.email || '',
      qrData: data.qrData || '',
    });
  }, [data]);

  if (isLoading) {
    return <Loading fullScreen message="Loading shop profile..." />;
  }

  const save = async () => {
    if (!form.businessName.trim()) {
      showErrorToast('Business name is required');
      return;
    }
    try {
      await saveProfile(form).unwrap();
      showSuccessToast('Shop profile saved');
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not save shop profile');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Shop Profile / QR</Text>
      {!!company?.companyCode && (
        <Card style={styles.card}>
          <Text style={styles.title}>Company code</Text>
          <Text style={styles.code}>{company.companyCode}</Text>
          <Text>Share this code with buyers. They will see only your products.</Text>
        </Card>
      )}
      <Card style={styles.card}>
        <Input label="Business name" value={form.businessName} onChangeText={(value) => setForm({ ...form, businessName: value })} />
        <Input label="Owner name" value={form.ownerName} onChangeText={(value) => setForm({ ...form, ownerName: value })} />
        <Input label="Address" value={form.address} onChangeText={(value) => setForm({ ...form, address: value })} />
        <Input label="Alternate mobile" value={form.altMobile} keyboardType="number-pad" onChangeText={(value) => setForm({ ...form, altMobile: value })} />
        <Input label="Email" value={form.email} onChangeText={(value) => setForm({ ...form, email: value })} />
        <Input label="UPI / QR text" value={form.qrData} onChangeText={(value) => setForm({ ...form, qrData: value })} placeholder="upi://pay?pa=shop@upi or image data URL" />
        {form.qrData?.startsWith('data:image') && (
          <Image source={{ uri: form.qrData }} style={styles.qr} resizeMode="contain" />
        )}
        <Button title={saving ? 'Saving…' : 'Save Shop Profile'} onPress={save} />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.md },
  card: { padding: spacing.md, marginBottom: spacing.md },
  code: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary, marginBottom: spacing.sm },
  qr: { width: 180, height: 180, alignSelf: 'center', marginVertical: spacing.md },
});

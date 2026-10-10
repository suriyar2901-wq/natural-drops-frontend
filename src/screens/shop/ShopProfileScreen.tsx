import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'qrcode';
import { Button, Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { useGetShopCompanyQuery, useGetShopProfileQuery, useSaveShopProfileMutation } from '../../store/api/shopApi';
import { pickProfileImage } from '../../utils/imageUtils';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

export const ShopProfileScreen = () => {
  const { width } = useWindowDimensions();
  const twoCol = width >= 760;
  const { data, isLoading } = useGetShopProfileQuery();
  const { data: company } = useGetShopCompanyQuery();
  const [saveProfile, { isLoading: saving }] = useSaveShopProfileMutation();
  const [editing, setEditing] = useState(false);
  const [shopName, setShopName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [qrData, setQrData] = useState('');
  const [temporaryQr, setTemporaryQr] = useState('');
  const [uploadingQr, setUploadingQr] = useState(false);

  useEffect(() => {
    if (editing) {
      return;
    }
    setShopName(data?.businessName || '');
    setUpiId(data?.upiId || '');
    setQrData(data?.qrData && data.qrData.startsWith('data:image') ? data.qrData : '');
  }, [data, editing]);

  useEffect(() => {
    const payload = upiId.trim()
      ? `upi://pay?pa=${encodeURIComponent(upiId.trim())}&pn=${encodeURIComponent(shopName.trim() || 'Shop')}`
      : `Natural Drops ${company?.companyCode || 'SHOP'}`;
    let active = true;
    QRCode.toDataURL(payload, {
      width: 280,
      margin: 1,
      color: { dark: '#0232AA', light: '#FFFFFF' },
    }).then((image) => {
      if (active) {
        setTemporaryQr(image);
      }
    }).catch(() => {
      if (active) {
        setTemporaryQr('');
      }
    });
    return () => {
      active = false;
    };
  }, [upiId, shopName, company?.companyCode]);

  if (isLoading) {
    return <Loading fullScreen message="Loading shop profile..." />;
  }

  const shownQr = qrData || temporaryQr;

  const shopBody = (nextQr = qrData) => ({
    ...(data || {}),
    businessName: shopName.trim(),
    upiId: upiId.trim(),
    qrData: nextQr,
    openTime: undefined,
    closeTime: undefined,
    openDays: undefined,
    leaveDates: undefined,
    showHoursToBuyer: undefined,
  });

  const uploadQr = async () => {
    const image = await pickProfileImage();
    if (!image) {
      return;
    }
    if (shopName.trim().length < 2) {
      showErrorToast('Shop name is required before saving the QR photo');
      return;
    }
    setUploadingQr(true);
    try {
      await saveProfile(shopBody(image)).unwrap();
      setQrData(image);
      showSuccessToast('QR photo saved');
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not save the QR photo');
    } finally {
      setUploadingQr(false);
    }
  };

  const save = async () => {
    if (shopName.trim().length < 2) {
      showErrorToast('Shop name is required');
      return;
    }
    if (upiId.trim() && !/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
      showErrorToast('Enter a valid UPI ID, for example shop@upi');
      return;
    }
    try {
      await saveProfile(shopBody()).unwrap();
      setEditing(false);
      showSuccessToast('Shop profile saved');
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not save shop profile');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{editing ? 'Edit shop profile' : 'Shop profile'}</Text>
            <Text style={styles.subtitle}>Seller</Text>
          </View>
          {!editing && (
            <Button title="Edit" onPress={() => setEditing(true)} variant="outline" size="small" style={styles.editButton} />
          )}
        </View>

        <View style={styles.section}>
          {editing ? (
            <>
              <Input label="Shop name" value={shopName} onChangeText={setShopName} />
              <Input
                label="UPI ID"
                value={upiId}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="example shop@upi"
                onChangeText={setUpiId}
              />
              {!!company?.companyCode && (
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>Company code</Text>
                  <Text style={styles.infoValue}>{company.companyCode}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.grid}>
              <View style={[styles.identityCell, !twoCol && styles.stack]}>
                <Text style={styles.identityLabel}>Shop name</Text>
                <Text style={styles.identityValue}>{shopName || 'Not specified'}</Text>
              </View>
              <View style={[styles.identityCell, !twoCol && styles.stack]}>
                <Text style={styles.identityLabel}>Company code</Text>
                <Text style={styles.identityValue}>{company?.companyCode || 'Not specified'}</Text>
              </View>
              <View style={[styles.infoCell, !twoCol && styles.stack]}>
                <Text style={styles.infoLabel}>UPI ID</Text>
                <Text style={styles.infoValue}>{upiId || 'Not specified'}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.blockTitle}>Payment QR</Text>
          {shownQr ? (
            <Image source={{ uri: shownQr }} style={styles.qr} resizeMode="contain" />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code-outline" size={48} color={colors.primary} />
            </View>
          )}
          <Text style={styles.qrNote}>
            {qrData
              ? 'This is the QR photo you uploaded.'
              : upiId.trim()
                ? 'Temporary QR from your UPI ID. Upload a QR photo to replace it.'
                : 'Temporary QR. Add a UPI ID or upload your payment QR photo.'}
          </Text>
          <Button
            title={uploadingQr ? 'Uploading…' : 'Upload QR photo'}
            onPress={uploadQr}
            variant="outline"
            disabled={uploadingQr || saving}
          />
        </View>

        {editing && (
          <View style={styles.buttonRow}>
            <Button title="Cancel" variant="outline" onPress={() => setEditing(false)} style={styles.actionButton} disabled={saving} />
            <Button title={saving ? 'Saving…' : 'Save changes'} onPress={save} style={styles.actionButton} disabled={saving} />
          </View>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, alignItems: 'center' },
  card: { width: '100%', maxWidth: 760, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  headerText: { flex: 1 },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  subtitle: { marginTop: spacing.xs, fontSize: typography.fontSize.sm, color: colors.primary, fontWeight: typography.fontWeight.bold },
  editButton: { minWidth: 72 },
  section: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  blockTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  infoCell: {
    flexGrow: 1,
    flexBasis: '100%',
    minHeight: 72,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  stack: { flexBasis: '100%' },
  infoLabel: { fontSize: typography.fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  infoValue: { fontSize: typography.fontSize.lg, color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  identityCell: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 84,
    backgroundColor: colors.blue50,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.blue100,
    padding: spacing.md,
  },
  identityLabel: { fontSize: typography.fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  identityValue: { fontSize: typography.fontSize.xl, color: colors.textPrimary, fontWeight: typography.fontWeight.bold },
  qr: { width: 220, height: 220, alignSelf: 'center', backgroundColor: colors.white, borderRadius: borderRadius.xs },
  qrPlaceholder: {
    width: 220,
    height: 220,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue50,
    borderRadius: borderRadius.xs,
  },
  qrNote: { textAlign: 'center', color: colors.textSecondary, marginVertical: spacing.sm, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  actionButton: { flex: 1 },
});

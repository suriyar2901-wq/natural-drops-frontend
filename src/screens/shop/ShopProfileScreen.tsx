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
  const [deliveryPerKm, setDeliveryPerKm] = useState('');
  const [shopLat, setShopLat] = useState('');
  const [shopLng, setShopLng] = useState('');

  useEffect(() => {
    if (editing) {
      return;
    }
    setShopName(data?.businessName || '');
    setUpiId(data?.upiId || '');
    setQrData(data?.qrData && data.qrData.startsWith('data:image') ? data.qrData : '');
    setDeliveryPerKm(
      data?.deliveryChargePerKm != null && data.deliveryChargePerKm !== ''
        ? String(data.deliveryChargePerKm)
        : ''
    );
    setShopLat(data?.latitude != null ? String(data.latitude) : '');
    setShopLng(data?.longitude != null ? String(data.longitude) : '');
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

  const shopBody = (nextQr = qrData) => {
    const perKm = deliveryPerKm.trim() === '' ? 0 : Number(deliveryPerKm);
    const lat = shopLat.trim() === '' ? null : Number(shopLat);
    const lng = shopLng.trim() === '' ? null : Number(shopLng);
    return {
      ...(data || {}),
      businessName: shopName.trim(),
      upiId: upiId.trim(),
      qrData: nextQr,
      deliveryChargePerKm: Number.isFinite(perKm) ? perKm : 0,
      latitude: lat != null && Number.isFinite(lat) ? lat : null,
      longitude: lng != null && Number.isFinite(lng) ? lng : null,
      openTime: undefined,
      closeTime: undefined,
      openDays: undefined,
      leaveDates: undefined,
      showHoursToBuyer: undefined,
    };
  };

  const uploadQr = async () => {
    if (!editing) {
      return;
    }
    const image = await pickProfileImage();
    if (!image) {
      return;
    }
    setQrData(image);
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
    if (deliveryPerKm.trim() && (Number.isNaN(Number(deliveryPerKm)) || Number(deliveryPerKm) < 0)) {
      showErrorToast('Delivery charge per km must be 0 or more');
      return;
    }
    if ((shopLat.trim() && Number.isNaN(Number(shopLat))) || (shopLng.trim() && Number.isNaN(Number(shopLng)))) {
      showErrorToast('Enter valid shop latitude and longitude');
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
              <Input
                label="Delivery charge per km (₹)"
                value={deliveryPerKm}
                keyboardType="decimal-pad"
                placeholder="e.g. 10"
                onChangeText={(text) => setDeliveryPerKm(text.replace(/[^0-9.]/g, ''))}
              />
              <Text style={styles.qrNote}>
                Buyers are charged this rate × distance from your shop. Add shop map coordinates for accurate km.
              </Text>
              <Input
                label="Shop latitude (optional)"
                value={shopLat}
                keyboardType="decimal-pad"
                placeholder="e.g. 11.9401"
                onChangeText={setShopLat}
              />
              <Input
                label="Shop longitude (optional)"
                value={shopLng}
                keyboardType="decimal-pad"
                placeholder="e.g. 79.4861"
                onChangeText={setShopLng}
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
              <View style={[styles.infoCell, !twoCol && styles.stack]}>
                <Text style={styles.infoLabel}>Delivery / km</Text>
                <Text style={styles.infoValue}>
                  {deliveryPerKm ? `₹${deliveryPerKm} per km` : 'Free / not set'}
                </Text>
              </View>
              <View style={[styles.infoCell, !twoCol && styles.stack]}>
                <Text style={styles.infoLabel}>Shop map point</Text>
                <Text style={styles.infoValue}>
                  {shopLat && shopLng ? `${shopLat}, ${shopLng}` : 'Not set (1 km minimum used)'}
                </Text>
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
            {editing
              ? 'Choose a new QR photo, then press Save changes.'
              : qrData
                ? 'This is the QR photo you uploaded. Press Edit to change it.'
                : 'Press Edit to change the payment QR.'}
          </Text>
          {editing && (
            <Button
              title="Upload QR photo"
              onPress={uploadQr}
              variant="outline"
              disabled={saving}
            />
          )}
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

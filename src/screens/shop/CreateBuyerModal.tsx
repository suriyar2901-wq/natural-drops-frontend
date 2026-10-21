import React, { useRef, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../components/common';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { useCreateShopBuyerMutation, useGetShopCompanyQuery, useLazyLookupPincodeQuery } from '../../store/api/shopApi';
import { openContact } from '../../utils/openContact';

type PincodeSuggestion = {
  pincode: string;
  name: string;
  displayName: string;
  city: string;
  district: string;
  state: string;
};

type InviteResult = {
  username: string;
  inviteLink: string;
  shareMessage: string;
  whatsappUrl: string;
  smsUrl: string;
  emailSent: boolean;
  sellerEmailSent: boolean;
};

const emptyForm = {
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
};

export const CreateBuyerModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const { data: company } = useGetShopCompanyQuery();
  const [createBuyer, { isLoading: creating }] = useCreateShopBuyerMutation();
  const [lookupPincode] = useLazyLookupPincodeQuery();
  const lookupSeq = useRef(0);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [pincodeSuggestions, setPincodeSuggestions] = useState<PincodeSuggestion[]>([]);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [selectedArea, setSelectedArea] = useState('');

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyPincodeLocation = (suggestion: PincodeSuggestion, hideList = false) => {
    setForm((prev) => ({
      ...prev,
      pincode: suggestion.pincode,
      city: suggestion.city,
      district: suggestion.district,
      state: suggestion.state,
    }));
    setSelectedArea(suggestion.displayName);
    setPincodeError('');
    if (hideList) {
      setPincodeSuggestions([]);
    }
  };

  const handlePincodeChange = async (text: string) => {
    const cleanPincode = text.replace(/[^0-9]/g, '').slice(0, 6);
    const seq = lookupSeq.current + 1;
    lookupSeq.current = seq;
    setForm((prev) => ({ ...prev, pincode: cleanPincode, city: '', district: '', state: '' }));
    setPincodeError('');
    setPincodeSuggestions([]);
    setSelectedArea('');
    if (cleanPincode.length !== 6) {
      return;
    }
    setPincodeLoading(true);
    try {
      const result = await lookupPincode(cleanPincode).unwrap();
      if (lookupSeq.current !== seq) {
        return;
      }
      const suggestions = result?.suggestions || [];
      setPincodeSuggestions(suggestions);
      if (suggestions.length > 0) {
        applyPincodeLocation(suggestions[0]);
      } else {
        setPincodeError('This pincode is not valid. Check the 6 digits and try again.');
      }
    } catch (error: any) {
      if (lookupSeq.current !== seq) {
        return;
      }
      setPincodeError(error?.data?.message || 'Could not check this pincode. Try again.');
    } finally {
      if (lookupSeq.current === seq) {
        setPincodeLoading(false);
      }
    }
  };

  const openShare = (url?: string) => {
    openContact(url);
  };

  const closeForm = () => {
    setFormError('');
    onClose();
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
      onClose();
      setInvite(result);
      setForm(emptyForm);
      setPincodeSuggestions([]);
      setPincodeError('');
    } catch (error: any) {
      const message = error?.data?.message || error?.message || 'Could not create buyer';
      setFormError(message);
      Alert.alert('Cannot create buyer', message);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={closeForm}>
        <View style={styles.popupOverlay}>
          <View style={styles.formCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.formHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.dropMark}>
                  <View style={styles.dropMarkInner} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.popupTitle}>Add customer</Text>
                  <Text style={styles.popupSubtitle}>Invite a buyer to your shop</Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeForm} style={styles.closeButton} accessibilityLabel="Close">
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sectionLabel}>Shop</Text>
              <Text style={styles.meta}>
                Company details are filled from your shop. The buyer maps to {company?.companyCode || 'your company'}.
              </Text>
              <Input label="Company name" value={company?.companyName || ''} editable={false} />
              <Input label="Company code" value={company?.companyCode || ''} editable={false} />

              <Text style={styles.sectionLabel}>Contact</Text>
              <Input label="Buyer name *" value={form.fullName} onChangeText={(text) => setField('fullName', text)} placeholder="Full name" />
              <Input label="Username *" value={form.username} onChangeText={(text) => setField('username', text)} placeholder="At least 3 letters" autoCapitalize="none" />
              <Input label="Mobile *" value={form.phone} onChangeText={(text) => setField('phone', text.replace(/[^0-9]/g, '').slice(0, 10))} placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} />
              <Input label="Email *" value={form.email} onChangeText={(text) => setField('email', text)} placeholder="Buyer email" autoCapitalize="none" keyboardType="email-address" />

              <Text style={styles.sectionLabel}>Address</Text>
              <Input label="House / door no *" value={form.houseDoorNo} onChangeText={(text) => setField('houseDoorNo', text)} />
              <Input label="Street / area *" value={form.streetArea} onChangeText={(text) => setField('streetArea', text)} />
              <Input
                label="Pincode *"
                value={form.pincode}
                onChangeText={handlePincodeChange}
                placeholder="Enter 6-digit pincode"
                error={pincodeError}
                maxLength={6}
                keyboardType="number-pad"
                autoCapitalize="none"
              />
              {pincodeLoading && <Text style={styles.lookupStatus}>Checking pincode…</Text>}
              {pincodeSuggestions.length > 0 && (
                <View style={styles.suggestionBox}>
                  <Text style={styles.suggestionTitle}>Address suggestions</Text>
                  {pincodeSuggestions.map((item) => {
                    const selected = selectedArea === item.displayName;
                    return (
                      <TouchableOpacity
                        key={item.displayName}
                        style={[styles.suggestionItem, selected && styles.suggestionItemOn]}
                        onPress={() => applyPincodeLocation(item, true)}
                      >
                        <Text style={[styles.suggestionText, selected && styles.suggestionTextOn]}>{item.displayName}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <Input label="City *" value={form.city} onChangeText={(text) => setField('city', text)} placeholder="Auto from pincode" />
              <Input label="District *" value={form.district} onChangeText={(text) => setField('district', text)} placeholder="Auto from pincode" />
              <Input label="State *" value={form.state} onChangeText={(text) => setField('state', text)} placeholder="Auto from pincode" />
              {!!formError && <Text style={styles.error}>{formError}</Text>}
            </ScrollView>

            <View style={styles.footer}>
              <Button title="Cancel" onPress={closeForm} variant="outline" style={styles.footerBtn} />
              <Button
                title={creating ? 'Creating…' : 'Create buyer'}
                onPress={handleCreate}
                disabled={creating}
                style={styles.footerBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!invite} transparent animationType="fade" onRequestClose={() => setInvite(null)}>
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={40} color={colors.success} />
            </View>
            <Text style={styles.popupTitleCenter}>Buyer created</Text>
            <Text style={styles.popupMessage}>
              Username: {invite?.username}{'\n'}
              The buyer must open the app link and create a new password before login.
            </Text>
            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={2}>{invite?.inviteLink}</Text>
            </View>
            <Text style={styles.metaCenter}>
              {invite?.emailSent ? 'Email sent to the buyer. ' : 'Buyer email was not sent. '}
              {invite?.sellerEmailSent ? 'A copy was emailed to you.' : ''}
            </Text>
            <TouchableOpacity style={styles.shareButtonPrimary} onPress={() => openShare(invite?.whatsappUrl)}>
              <Ionicons name="logo-whatsapp" size={18} color={colors.white} />
              <Text style={styles.shareButtonPrimaryText}>Send WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={() => openShare(invite?.smsUrl)}>
              <Text style={styles.shareButtonText}>Send SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.popupButton} onPress={() => setInvite(null)}>
              <Text style={styles.popupButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray200,
    marginBottom: spacing.sm,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sheet,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    paddingTop: spacing.sm,
    overflow: 'hidden',
    ...shadows.xl,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  dropMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropMarkInner: {
    width: 14,
    height: 14,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
    borderBottomLeftRadius: 7,
    transform: [{ rotate: '45deg' }],
  },
  formContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  popupSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  popupTitleCenter: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  lookupStatus: { color: colors.primary, marginTop: -8, marginBottom: spacing.sm },
  suggestionBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray50,
    marginTop: -4,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  suggestionTitle: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  suggestionItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  suggestionItemOn: { backgroundColor: '#E4EAF9' },
  suggestionText: { color: colors.textPrimary },
  suggestionTextOn: { color: colors.primary, fontWeight: typography.fontWeight.semibold },
  meta: { color: colors.textSecondary, marginBottom: spacing.sm, lineHeight: 20 },
  metaCenter: { color: colors.textSecondary, marginBottom: spacing.md, textAlign: 'center', lineHeight: 20 },
  error: { color: colors.error, marginBottom: spacing.sm },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  footerBtn: { flex: 1 },
  popupCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 420,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.lg,
  },
  successIconWrap: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  popupMessage: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  linkBox: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  shareButtonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  shareButtonPrimaryText: { color: colors.white, fontWeight: typography.fontWeight.semibold },
  shareButton: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  shareButtonText: { color: colors.primary, fontWeight: typography.fontWeight.semibold },
  popupButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  popupButtonText: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
});

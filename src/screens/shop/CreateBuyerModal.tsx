import React, { useRef, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Input } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
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
      <Modal visible={visible} transparent animationType="fade" onRequestClose={closeForm}>
        <View style={styles.popupOverlay}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.popupTitle}>Create buyer</Text>
              <TouchableOpacity onPress={closeForm} style={styles.closeButton}>
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
              {pincodeLoading && <Text style={styles.lookupStatus}>Checking pincode...</Text>}
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
                        <Text style={styles.suggestionText}>{item.displayName}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
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
    </>
  );
};

const styles = StyleSheet.create({
  lookupStatus: { color: colors.primary, marginTop: -8, marginBottom: spacing.sm },
  suggestionBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    marginTop: -8,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  suggestionTitle: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  suggestionItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  suggestionItemOn: { backgroundColor: '#EFF6FF' },
  suggestionText: { color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.sm },
  error: { color: colors.error, marginBottom: spacing.sm },
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
  formContent: { paddingBottom: spacing.md },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: { color: colors.textSecondary, fontWeight: typography.fontWeight.bold },
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

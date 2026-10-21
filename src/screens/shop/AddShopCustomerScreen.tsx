import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Input } from '../../components/common';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { useCreateShopCustomerMutation, useUpdateShopCustomerMutation, useGetShopCustomerQuery } from '../../store/api/shopApi';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

export const AddShopCustomerScreen = ({ navigation, route }: any) => {
  const customerId = route?.params?.customerId as number | undefined;
  const isEdit = Boolean(customerId);
  const { data: existing } = useGetShopCustomerQuery(customerId as number, { skip: !customerId });
  const [createCustomer, { isLoading: creating }] = useCreateShopCustomerMutation();
  const [updateCustomer, { isLoading: updating }] = useUpdateShopCustomerMutation();
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    house: '',
    area: '',
    city: '',
    pin: '',
    note: '',
  });
  useEffect(() => {
    if (!existing) {
      return;
    }
    setForm({
      name: existing.name || '',
      mobile: existing.mobile || '',
      house: existing.house || '',
      area: existing.area || '',
      city: existing.city || '',
      pin: existing.pin || '',
      note: existing.note || '',
    });
  }, [existing]);

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (form.name.trim().length < 2) {
      showErrorToast('Name is required');
      return;
    }
    if (!/^[0-9]{10}$/.test(form.mobile.trim())) {
      showErrorToast('Mobile must be 10 digits');
      return;
    }
    try {
      if (isEdit && customerId) {
        await updateCustomer({ id: customerId, body: form }).unwrap();
        showSuccessToast('Customer updated');
      } else {
        await createCustomer(form).unwrap();
        showSuccessToast('Customer added');
      }
      navigation.goBack();
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not save customer');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <View style={styles.dropMark}>
          <View style={styles.dropMarkInner} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isEdit ? 'Edit customer' : 'Add customer'}</Text>
          <Text style={styles.subtitle}>
            {isEdit ? 'Update contact and address details' : 'Save a walk-in customer to your ledger'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Contact</Text>
        <Input label="Name *" value={form.name} onChangeText={(value) => setField('name', value)} />
        <Input
          label="Mobile *"
          value={form.mobile}
          keyboardType="number-pad"
          maxLength={10}
          onChangeText={(value) => setField('mobile', value.replace(/[^0-9]/g, ''))}
        />

        <Text style={styles.sectionLabel}>Address</Text>
        <Input label="House / Door" value={form.house} onChangeText={(value) => setField('house', value)} />
        <Input label="Area" value={form.area} onChangeText={(value) => setField('area', value)} />
        <Input label="City" value={form.city} onChangeText={(value) => setField('city', value)} />
        <Input
          label="PIN"
          value={form.pin}
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={(value) => setField('pin', value.replace(/[^0-9]/g, ''))}
        />

        <Text style={styles.sectionLabel}>Note</Text>
        <Input label="Note" value={form.note} onChangeText={(value) => setField('note', value)} placeholder="Optional" />

        <Button
          title={creating || updating ? 'Saving…' : 'Save customer'}
          onPress={save}
          fullWidth
          style={styles.saveBtn}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  content: { padding: spacing.md, paddingBottom: spacing['2xl'] },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  dropMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
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
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
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
  saveBtn: {
    marginTop: spacing.lg,
  },
});

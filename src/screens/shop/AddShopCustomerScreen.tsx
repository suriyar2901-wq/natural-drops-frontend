import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Card, Input } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{isEdit ? 'Edit Customer' : 'Add Customer'}</Text>
      <Card style={styles.card}>
        <Input label="Name" value={form.name} onChangeText={(value) => setField('name', value)} />
        <Input label="Mobile" value={form.mobile} keyboardType="number-pad" maxLength={10} onChangeText={(value) => setField('mobile', value.replace(/[^0-9]/g, ''))} />
        <Input label="House / Door" value={form.house} onChangeText={(value) => setField('house', value)} />
        <Input label="Area" value={form.area} onChangeText={(value) => setField('area', value)} />
        <Input label="City" value={form.city} onChangeText={(value) => setField('city', value)} />
        <Input label="PIN" value={form.pin} keyboardType="number-pad" maxLength={6} onChangeText={(value) => setField('pin', value.replace(/[^0-9]/g, ''))} />
        <Input label="Note" value={form.note} onChangeText={(value) => setField('note', value)} />
        <Button title={creating || updating ? 'Saving…' : 'Save Customer'} onPress={save} />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.md },
  card: { padding: spacing.md },
});

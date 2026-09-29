import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useCreatePhoneOrderMutation, useGetShopCustomersQuery } from '../../store/api/shopApi';
import { useGetMenuItemsQuery } from '../../store/api/menuApi';
import { formatCurrency } from '../../utils/formatters';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

type DeliveryChoice = 'Today' | 'Tomorrow' | 'Date';

type SelectedLine = {
  menuItemId: number;
  name: string;
  rate: number;
  quantity: number;
};

const toYmd = (offsetDays: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatYmd = (value: string) => {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

export const PhoneOrderScreen = ({ navigation, route }: any) => {
  const presetCustomerId = route?.params?.customerId as number | undefined;
  const { data: customers = [], isLoading: customersLoading } = useGetShopCustomersQuery();
  const { data: products = [], isLoading: productsLoading } = useGetMenuItemsQuery();
  const [createPhoneOrder, { isLoading: saving }] = useCreatePhoneOrderMutation();
  const [customerId, setCustomerId] = useState<number | undefined>(presetCustomerId);
  const [customerQuery, setCustomerQuery] = useState('');
  const [lines, setLines] = useState<SelectedLine[]>([]);
  const [draftQty, setDraftQty] = useState<Record<number, string>>({});
  const [deliveryChoice, setDeliveryChoice] = useState<DeliveryChoice>('Today');
  const [customDate, setCustomDate] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!presetCustomerId) return;
    const match = customers.find((customer) => customer.id === presetCustomerId);
    if (match) {
      setCustomerId(match.id);
      setCustomerQuery(match.name);
    }
  }, [presetCustomerId, customers]);

  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const query = customerQuery.trim();
  const showCustomerList = query.length > 0 && !(selectedCustomer && selectedCustomer.name === query);
  const customerMatches = showCustomerList
    ? customers.filter((customer) => customer.name.toLowerCase().startsWith(query.toLowerCase()))
    : [];
  const total = lines.reduce((sum, line) => sum + line.rate * line.quantity, 0);
  const today = toYmd(0);
  const deliveryDate = deliveryChoice === 'Today' ? today : deliveryChoice === 'Tomorrow' ? toYmd(1) : customDate;

  if (customersLoading || productsLoading) {
    return <Loading fullScreen message="Loading phone order..." />;
  }

  const save = async () => {
    if (!customerId) {
      showErrorToast('Type a customer name and pick one from the list');
      return;
    }
    if (lines.length === 0) {
      showErrorToast('Add at least one product');
      return;
    }
    if (deliveryChoice === 'Date' && !/^\d{4}-\d{2}-\d{2}$/.test(customDate)) {
      showErrorToast('Choose a delivery date');
      return;
    }
    if (deliveryDate < today) {
      showErrorToast('Delivery date cannot be in the past');
      return;
    }
    const delivery = deliveryChoice === 'Date' ? customDate : deliveryChoice;
    try {
      await createPhoneOrder({
        customerId,
        delivery,
        note,
        items: lines.map((line) => ({ menuItemId: line.menuItemId, quantity: line.quantity })),
      }).unwrap();
      showSuccessToast(
        deliveryChoice === 'Today'
          ? 'Phone order created for delivery today'
          : `Phone order created. Delivery on ${formatYmd(deliveryDate)}. Alert goes out one day before.`
      );
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('AdminApp', { screen: 'OrderManagement' });
      }
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not create phone order');
    }
  };

  return (
    <ScrollView
      style={[styles.container, Platform.OS === 'web' ? styles.webScroll : null]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      <Text style={styles.title}>Phone Order</Text>
      <Card style={styles.card}>
        <Input
          label="Customer"
          value={customerQuery}
          onChangeText={(value) => {
            setCustomerQuery(value);
            const exact = customers.find((customer) => customer.name.toLowerCase() === value.trim().toLowerCase());
            setCustomerId(exact ? exact.id : undefined);
          }}
          placeholder="Type the first letter of the name"
          autoCapitalize="words"
        />
        {showCustomerList && (
          <View style={styles.suggestBox}>
            {customerMatches.map((customer) => (
              <TouchableOpacity
                key={customer.id}
                style={styles.suggestRow}
                onPress={() => {
                  setCustomerId(customer.id);
                  setCustomerQuery(customer.name);
                }}
              >
                <Text style={styles.suggestName}>{customer.name}</Text>
                <Text style={styles.suggestMeta}>{customer.mobile}</Text>
              </TouchableOpacity>
            ))}
            {customerMatches.length === 0 && <Text style={styles.meta}>No customer found</Text>}
          </View>
        )}
        {customers.length === 0 && <Text style={styles.meta}>Add a shop customer first.</Text>}

        <Text style={styles.label}>Product</Text>
        <Text style={styles.meta}>Choose a product, set its quantity, then add it. Add another product the same way.</Text>
        {products.map((item) => {
          const added = lines.find((line) => line.menuItemId === item.id);
          const qtyValue = draftQty[item.id] ?? (added ? String(added.quantity) : '1');
          return (
            <View key={item.id} style={styles.productRow}>
              <View style={styles.productInfo}>
                <Text style={styles.suggestName}>{item.name}</Text>
                <Text style={styles.suggestMeta}>{formatCurrency(Number(item.rate || 0))}</Text>
              </View>
              <Input
                label="Qty"
                value={qtyValue}
                keyboardType="number-pad"
                containerStyle={styles.qtyInput}
                onChangeText={(value) => setDraftQty((prev) => ({ ...prev, [item.id]: value.replace(/[^0-9]/g, '').slice(0, 2) }))}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  const nextQty = Number(qtyValue);
                  if (!nextQty || nextQty < 1 || nextQty > 20) {
                    showErrorToast('Quantity must be between 1 and 20');
                    return;
                  }
                  setLines((prev) => {
                    const existing = prev.find((line) => line.menuItemId === item.id);
                    if (existing) {
                      return prev.map((line) => (line.menuItemId === item.id ? { ...line, quantity: nextQty } : line));
                    }
                    return [...prev, { menuItemId: item.id, name: item.name, rate: Number(item.rate || 0), quantity: nextQty }];
                  });
                }}
              >
                <Text style={styles.addButtonText}>{added ? 'Update' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <Text style={styles.label}>Selected products</Text>
        {lines.length === 0 && <Text style={styles.meta}>No products added yet.</Text>}
        {lines.map((line) => (
          <View key={line.menuItemId} style={styles.selectedRow}>
            <View style={styles.productInfo}>
              <Text style={styles.suggestName}>{line.quantity}x {line.name}</Text>
              <Text style={styles.suggestMeta}>{formatCurrency(line.rate * line.quantity)}</Text>
            </View>
            <View style={styles.qtyControls}>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setLines((prev) => prev.flatMap((item) => {
                  if (item.menuItemId !== line.menuItemId) return [item];
                  if (item.quantity <= 1) return [];
                  return [{ ...item, quantity: item.quantity - 1 }];
                }))}
              >
                <Text style={styles.stepText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{line.quantity}</Text>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setLines((prev) => prev.map((item) => (
                  item.menuItemId === line.menuItemId ? { ...item, quantity: Math.min(20, item.quantity + 1) } : item
                )))}
              >
                <Text style={styles.stepText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setLines((prev) => prev.filter((item) => item.menuItemId !== line.menuItemId))}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}
        <Text style={styles.label}>Delivery</Text>
        <View style={styles.row}>
          {(['Today', 'Tomorrow', 'Date'] as DeliveryChoice[]).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.chip, deliveryChoice === item && styles.optionActive]}
              onPress={() => setDeliveryChoice(item)}
            >
              <Text style={[styles.optionText, deliveryChoice === item && styles.optionTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {deliveryChoice === 'Date' && (
          <View style={styles.dateWrap}>
            <Text style={styles.meta}>Pick the delivery date</Text>
            {Platform.OS === 'web' ? (
              React.createElement('input', {
                type: 'date',
                min: today,
                value: customDate,
                onChange: (event: any) => setCustomDate(event.target.value),
                style: {
                  marginTop: 8,
                  width: '100%',
                  padding: 12,
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  fontSize: 16,
                },
              })
            ) : (
              <Input
                label="Date"
                value={customDate}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                onChangeText={setCustomDate}
              />
            )}
          </View>
        )}
        <Text style={styles.deliveryHint}>
          {deliveryChoice === 'Today'
            ? `Delivery on ${formatYmd(today)}.`
            : `Delivery on ${deliveryDate ? formatYmd(deliveryDate) : 'the selected date'}. Seller and buyer get an alert one day before.`}
        </Text>
        <Input label="Note" value={note} onChangeText={setNote} />
        <Text style={styles.total}>Total {formatCurrency(total)}</Text>
        <Button title={saving ? 'Creating…' : 'Create Phone Order'} onPress={save} />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  webScroll: {
    height: 'calc(100vh - 64px)',
    maxHeight: 'calc(100vh - 64px)',
    overflowY: 'auto',
  } as any,
  content: { padding: spacing.md, paddingBottom: 48 },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.md },
  card: { padding: spacing.md },
  label: { marginTop: spacing.md, marginBottom: spacing.xs, color: colors.textSecondary },
  option: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.sm, marginBottom: spacing.xs },
  chip: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { color: colors.textPrimary },
  optionTextActive: { color: colors.white, fontWeight: typography.fontWeight.semibold },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  meta: { color: colors.textSecondary },
  suggestBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.white, marginBottom: spacing.sm },
  suggestRow: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  suggestName: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  suggestMeta: { color: colors.textSecondary, marginTop: 2 },
  dateWrap: { marginTop: spacing.sm },
  deliveryHint: { marginTop: spacing.sm, color: colors.textSecondary },
  productRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.sm },
  productInfo: { flex: 1 },
  qtyInput: { width: 72, marginBottom: 0 },
  addButton: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  addButtonText: { color: colors.white, fontWeight: typography.fontWeight.semibold },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.sm, marginBottom: spacing.xs },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.white, fontWeight: typography.fontWeight.bold },
  qtyValue: { minWidth: 18, textAlign: 'center', color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  removeText: { color: colors.error, fontWeight: typography.fontWeight.semibold },
  total: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginVertical: spacing.md },
});

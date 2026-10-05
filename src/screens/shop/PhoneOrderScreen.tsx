import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, DeliverySlotFields, EmptyState, Input, Loading } from '../../components/common';
import { deliveryDateFor, isFutureDeliverySlot } from '../../components/common/DeliverySlotFields';
import { colors, spacing, typography } from '../../theme';
import { useCreatePhoneOrderMutation, useGetShopCustomersQuery } from '../../store/api/shopApi';
import { useGetMenuItemsQuery } from '../../store/api/menuApi';
import { formatClockAmPm, formatCurrency } from '../../utils/formatters';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

type SelectedLine = {
  menuItemId: number;
  name: string;
  rate: number;
  quantity: number;
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
  const [productQuery, setProductQuery] = useState('');
  const [productOpen, setProductOpen] = useState(false);
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [pickedQty, setPickedQty] = useState('1');
  const [lines, setLines] = useState<SelectedLine[]>([]);
  const [deliveryChoice, setDeliveryChoice] = useState<'Today' | 'Tomorrow' | 'Date'>('Today');
  const [customDate, setCustomDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('10:00');
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
  const productText = productQuery.trim().toLowerCase();
  const productMatches = products.filter((item) => !productText || item.name.toLowerCase().includes(productText));
  const pickedProduct = products.find((item) => item.id === pickedId);
  const total = lines.reduce((sum, line) => sum + line.rate * line.quantity, 0);
  const deliveryDate = deliveryDateFor(deliveryChoice, customDate);

  if (customersLoading || productsLoading) {
    return <Loading fullScreen message="Loading add order..." />;
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
    if (!isFutureDeliverySlot(deliveryDate, deliveryTime)) {
      showErrorToast('Choose a future delivery date and time');
      return;
    }
    try {
      await createPhoneOrder({
        customerId,
        delivery: deliveryDate,
        deliveryTime,
        note,
        items: lines.map((line) => ({ menuItemId: line.menuItemId, quantity: line.quantity })),
      }).unwrap();
      showSuccessToast(
        `Order added. Delivery on ${formatYmd(deliveryDate)} at ${formatClockAmPm(deliveryTime)}.`
      );
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('AdminApp', { screen: 'OrderManagement' });
      }
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not add order');
    }
  };

  return (
    <ScrollView
      style={[styles.container, Platform.OS === 'web' ? styles.webScroll : null]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      <Text style={styles.title}>Add Order</Text>
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

        <Input
          label="Product"
          value={productQuery}
          onChangeText={(value) => {
            setProductQuery(value);
            setProductOpen(true);
            setPickedId(null);
          }}
          onFocus={() => setProductOpen(true)}
          onBlur={() => {
            setTimeout(() => setProductOpen(false), 200);
          }}
          placeholder="Search product name"
          autoCapitalize="none"
          containerStyle={productOpen ? styles.searchInputOpen : undefined}
        />
        {productOpen && (
          <View style={styles.dropdown}>
            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {productMatches.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.dropdownRow}
                  onPress={() => {
                    const added = lines.find((line) => line.menuItemId === item.id);
                    setPickedId(item.id);
                    setPickedQty(added ? String(added.quantity) : '1');
                    setProductQuery(item.name);
                    setProductOpen(false);
                  }}
                >
                  <Text style={styles.suggestName}>{item.name}</Text>
                  <Text style={styles.dropdownPrice}>{formatCurrency(Number(item.rate || 0))}</Text>
                </TouchableOpacity>
              ))}
              {productMatches.length === 0 && <Text style={styles.dropdownEmpty}>No product found</Text>}
            </ScrollView>
          </View>
        )}
        {pickedProduct && !productOpen && (
          <View style={styles.addRow}>
            <View style={styles.productInfo}>
              <Text style={styles.suggestName}>{pickedProduct.name}</Text>
              <Text style={styles.suggestMeta}>{formatCurrency(Number(pickedProduct.rate || 0))}</Text>
            </View>
            <Input
              label="Qty"
              value={pickedQty}
              keyboardType="number-pad"
              containerStyle={styles.qtyInput}
              onChangeText={(value) => setPickedQty(value.replace(/[^0-9]/g, '').slice(0, 2))}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                const nextQty = Number(pickedQty);
                if (!nextQty || nextQty < 1 || nextQty > 20) {
                  showErrorToast('Quantity must be between 1 and 20');
                  return;
                }
                setLines((prev) => {
                  const existing = prev.find((line) => line.menuItemId === pickedProduct.id);
                  if (existing) {
                    return prev.map((line) => (line.menuItemId === pickedProduct.id ? { ...line, quantity: nextQty } : line));
                  }
                  return [...prev, {
                    menuItemId: pickedProduct.id,
                    name: pickedProduct.name,
                    rate: Number(pickedProduct.rate || 0),
                    quantity: nextQty,
                  }];
                });
                setPickedId(null);
                setProductQuery('');
                setPickedQty('1');
              }}
            >
              <Text style={styles.addButtonText}>
                {lines.some((line) => line.menuItemId === pickedProduct.id) ? 'Update' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Selected products</Text>
        {lines.length === 0 && (
          <EmptyState title="No products added yet" message="Pick a product above and set the quantity." />
        )}
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
        <DeliverySlotFields
          choice={deliveryChoice}
          onChoiceChange={setDeliveryChoice}
          customDate={customDate}
          onCustomDateChange={setCustomDate}
          time={deliveryTime}
          onTimeChange={setDeliveryTime}
        />
        <Text style={styles.deliveryHint}>Seller and buyer get an alert one day before.</Text>
        <Input label="Note" value={note} onChangeText={setNote} />
        <Text style={styles.total}>Total {formatCurrency(total)}</Text>
        <Button title={saving ? 'Adding…' : 'Add Order'} onPress={save} />
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
  searchInputOpen: { marginBottom: spacing.xs },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    maxHeight: 220,
    overflow: 'hidden',
  },
  dropdownScroll: { maxHeight: 220 },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownPrice: { color: colors.textSecondary, fontWeight: typography.fontWeight.semibold },
  dropdownEmpty: { color: colors.textSecondary, padding: spacing.md },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  productInfo: { flex: 1, justifyContent: 'center', minHeight: 44 },
  qtyInput: { width: 72, marginBottom: 0 },
  addButton: {
    height: 44,
    minWidth: 88,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  addButtonText: { color: colors.white, fontWeight: typography.fontWeight.semibold },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.sm, marginBottom: spacing.xs },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.white, fontWeight: typography.fontWeight.bold },
  qtyValue: { minWidth: 18, textAlign: 'center', color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  removeText: { color: colors.error, fontWeight: typography.fontWeight.semibold },
  total: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginVertical: spacing.md },
});

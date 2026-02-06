import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { MenuItem, Order, UpdateOrderRequest } from '../../types';
import { formatCurrency } from '../../utils/formatters';

type EditableItem = {
  menuItemId: number;
  itemName: string;
  rate: number;
  quantity: number;
};

type Props = {
  visible: boolean;
  order: Order | null;
  products: MenuItem[];
  onClose: () => void;
  onSave: (data: UpdateOrderRequest) => void;
};

const DELIVERY_CHARGE = 20;
const TAX_RATE = 0.05;

export const EditOrderModal: React.FC<Props> = ({ visible, order, products, onClose, onSave }) => {
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [items, setItems] = useState<EditableItem[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const phoneEditable = !!(order?.buyerPhone && order.buyerPhone.trim().length > 0);

  useEffect(() => {
    if (!visible || !order) return;
    setDeliveryAddress(order.deliveryAddress || order.buyerAddress || '');
    setBuyerPhone(order.buyerPhone || '');
    setItems(
      (order.items || []).map((it) => ({
        menuItemId: it.menuItemId,
        itemName: it.itemName,
        rate: Number(it.rate || 0),
        quantity: Number(it.quantity || 1),
      }))
    );
    setProductSearch('');
  }, [visible, order]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => (p.name || '').toLowerCase().includes(q));
  }, [products, productSearch]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, it) => sum + (Number(it.rate) || 0) * (Number(it.quantity) || 0), 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax + DELIVERY_CHARGE;
    return { subtotal, tax, delivery: DELIVERY_CHARGE, total };
  }, [items]);

  const updateQty = (menuItemId: number, nextQty: number) => {
    const qty = Math.max(1, Math.floor(Number(nextQty) || 1));
    setItems((prev) => prev.map((it) => (it.menuItemId === menuItemId ? { ...it, quantity: qty } : it)));
  };

  const removeItem = (menuItemId: number) => {
    setItems((prev) => prev.filter((it) => it.menuItemId !== menuItemId));
  };

  const addProductToOrder = (product: MenuItem) => {
    setItems((prev) => {
      const existing = prev.find((x) => x.menuItemId === product.id);
      if (existing) {
        return prev.map((x) =>
          x.menuItemId === product.id ? { ...x, quantity: Math.max(1, x.quantity + 1) } : x
        );
      }
      return [
        ...prev,
        {
          menuItemId: product.id,
          itemName: product.name,
          rate: Number(product.rate || 0),
          quantity: 1,
        },
      ];
    });
  };

  const handleSave = () => {
    if (!order) return;
    if (!items || items.length === 0) {
      // Keep UX simple; require at least one item
      return;
    }
    onSave({
      deliveryAddress: deliveryAddress?.trim() ? deliveryAddress.trim() : null,
      buyerPhone: phoneEditable ? (buyerPhone?.trim() ? buyerPhone.trim() : null) : undefined,
      updatedBy: 'seller',
      items: items.map((it) => ({ menuItemId: it.menuItemId, quantity: Math.max(1, it.quantity) })),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Edit Order</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
            <Text style={styles.sectionTitle}>Customer Details</Text>

            <Text style={styles.label}>Delivery Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="Enter delivery address"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.label}>Customer Phone</Text>
            <TextInput
              style={[styles.input, !phoneEditable && styles.inputDisabled]}
              value={buyerPhone}
              onChangeText={setBuyerPhone}
              placeholder={phoneEditable ? 'Enter phone number' : 'Phone not available'}
              editable={phoneEditable}
              keyboardType="phone-pad"
            />

            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Order Items</Text>
            {items.map((it) => (
              <View key={it.menuItemId} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{it.itemName}</Text>
                  <Text style={styles.itemMeta}>{formatCurrency((it.rate || 0) * (it.quantity || 1))}</Text>
                </View>
                <View style={styles.qtyBox}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQty(it.menuItemId, it.quantity - 1)}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.qtyInput}
                    value={String(it.quantity)}
                    onChangeText={(t) => updateQty(it.menuItemId, Number(t))}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQty(it.menuItemId, it.quantity + 1)}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(it.menuItemId)}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Add Product</Text>
            <TextInput
              style={styles.input}
              value={productSearch}
              onChangeText={setProductSearch}
              placeholder="Search product to add…"
            />
            <View style={styles.productList}>
              {filteredProducts.slice(0, 8).map((p) => (
                <View key={p.id} style={styles.productRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{p.name}</Text>
                    <Text style={styles.productPrice}>{formatCurrency(p.rate || 0)}</Text>
                  </View>
                  <TouchableOpacity style={styles.addBtn} onPress={() => addProductToOrder(p)}>
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.totalBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatCurrency(totals.subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax (5%)</Text>
                <Text style={styles.totalValue}>{formatCurrency(totals.tax)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Delivery</Text>
                <Text style={styles.totalValue}>{formatCurrency(totals.delivery)}</Text>
              </View>
              <View style={[styles.totalRow, styles.totalRowStrong]}>
                <Text style={styles.totalStrong}>Total</Text>
                <Text style={styles.totalStrong}>{formatCurrency(totals.total)}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.saveBtn, (!items || items.length === 0) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!items || items.length === 0}
            >
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  content: {
    maxHeight: 520,
  },
  contentInner: {
    paddingBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  inputDisabled: {
    backgroundColor: colors.gray100,
    color: colors.textSecondary,
  },
  textArea: {
    minHeight: 90,
    paddingTop: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  itemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  itemMeta: {
    marginTop: 2,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  qtyBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 18,
  },
  qtyInput: {
    width: 44,
    textAlign: 'center',
    paddingVertical: 0,
    paddingHorizontal: 6,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  removeBtn: {
    marginLeft: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: colors.error,
    fontWeight: typography.fontWeight.bold,
  },
  productList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productName: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  productPrice: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  addBtnText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  totalBox: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.gray100,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalRowStrong: {
    marginTop: 6,
    marginBottom: 0,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  totalValue: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  totalStrong: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  cancelBtn: {
    backgroundColor: colors.gray100,
  },
  cancelBtnText: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  saveBtn: {
    backgroundColor: colors.success,
  },
  saveBtnDisabled: {
    backgroundColor: colors.gray400,
  },
  saveBtnText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
});



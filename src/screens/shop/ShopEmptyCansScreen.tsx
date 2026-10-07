import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useApplyCanActionMutation, useCollectShopCansMutation, useGetCanStockQuery, useGetShopCanEventsQuery, useGetShopCustomerQuery } from '../../store/api/shopApi';
import { CAN_ENTRY_LABEL, canEventType, moneyValue } from '../../types/shop.types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

const ACTIONS = [
  { id: 'return', label: 'Return' },
  { id: 'damaged', label: 'Damaged can' },
  { id: 'missing', label: 'Missing can' },
  { id: 'replacement', label: 'Replacement' },
  { id: 'adjustment', label: 'Adjustment' },
  { id: 'deposit', label: 'Deposit' },
] as const;

type ActionId = typeof ACTIONS[number]['id'];

const HINT: Record<ActionId, string> = {
  return: 'Empty can comes back. Pending goes down and seller stock goes up.',
  damaged: 'Pending goes down. The can is not added back to seller stock.',
  missing: 'Pending goes down. The can is marked missing and is not added to stock.',
  replacement: 'Customer still keeps the same pending count. A new can leaves seller stock, and the old can is marked damaged.',
  adjustment: 'Correct this customer pending count. Seller stock does not change.',
  deposit: 'Collect or refund the can deposit for this customer. Pending cans stay the same.',
};

export const ShopEmptyCansScreen = ({ route }: any) => {
  const customerId = route?.params?.customerId as number;
  const initial = ACTIONS.some((item) => item.id === route?.params?.action) ? route.params.action as ActionId : 'return';
  const { data: customer, isLoading } = useGetShopCustomerQuery(customerId, { skip: !customerId });
  const { data: events = [] } = useGetShopCanEventsQuery(customerId, { skip: !customerId });
  const { data: stock } = useGetCanStockQuery();
  const [collectCans, { isLoading: returning }] = useCollectShopCansMutation();
  const [applyAction, { isLoading: saving }] = useApplyCanActionMutation();
  const [action, setAction] = useState<ActionId>(initial);
  const [quantity, setQuantity] = useState('1');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [direction, setDirection] = useState<'ADD' | 'REMOVE' | 'COLLECT' | 'REFUND'>('ADD');

  if (isLoading || !customer) {
    return <Loading fullScreen message="Loading empty cans..." />;
  }

  const save = async () => {
    const qty = Number(quantity);
    try {
      if (action === 'return') {
        if (!qty || qty <= 0) {
          showErrorToast('Enter a valid collect quantity');
          return;
        }
        if (qty > (customer.emptyCans || 0)) {
          showErrorToast('Cannot collect more cans than the customer holds');
          return;
        }
        await collectCans({ id: customerId, quantity: qty }).unwrap();
        showSuccessToast('Return recorded. Buyer account updated.');
      } else if (action === 'deposit') {
        if (!amount || Number(amount) <= 0) {
          showErrorToast('Enter the can deposit amount');
          return;
        }
        await applyAction({
          id: customerId,
          type: 'DEPOSIT',
          amount,
          direction: direction === 'REFUND' ? 'REFUND' : 'COLLECT',
          note,
        }).unwrap();
        showSuccessToast(direction === 'REFUND' ? 'Deposit refunded' : 'Can deposit collected');
        setAmount('');
      } else {
        if (!qty || qty <= 0) {
          showErrorToast('Enter how many cans');
          return;
        }
        const type = action === 'damaged' ? 'DAMAGED'
          : action === 'missing' ? 'MISSING'
            : action === 'replacement' ? 'REPLACEMENT'
              : 'ADJUSTMENT';
        await applyAction({
          id: customerId,
          type,
          quantity: qty,
          direction: action === 'adjustment' ? (direction === 'REMOVE' ? 'REMOVE' : 'ADD') : undefined,
          note,
        }).unwrap();
        showSuccessToast('Can entry saved');
      }
      setNote('');
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not save the can entry');
    }
  };

  const busy = returning || saving;
  const depositDirection = action === 'deposit';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Can entry</Text>
      <Card style={styles.card}>
        <Text style={styles.name}>{customer.name}</Text>
        <Text style={styles.meta}>Pending cans: {customer.emptyCans || 0}</Text>
        <Text style={styles.meta}>Deposit held: {formatCurrency(moneyValue(customer.canDeposit))}</Text>
        <Text style={styles.meta}>Deposit per can: {formatCurrency(moneyValue(stock?.depositPerCan))} · Seller stock: {stock?.totalStock || 0}</Text>
        <View style={styles.actions}>
          {ACTIONS.map((item) => {
            const selected = action === item.id;
            return (
              <TouchableOpacity key={item.id} style={[styles.chip, selected && styles.chipOn]} onPress={() => {
                setAction(item.id);
                setDirection(item.id === 'deposit' ? 'COLLECT' : 'ADD');
              }}>
                <Text style={[styles.chipText, selected && styles.chipTextOn]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.meta}>{HINT[action]}</Text>
        {action === 'adjustment' && (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.chip, direction === 'ADD' && styles.chipOn]} onPress={() => setDirection('ADD')}>
              <Text style={[styles.chipText, direction === 'ADD' && styles.chipTextOn]}>Add pending</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, direction === 'REMOVE' && styles.chipOn]} onPress={() => setDirection('REMOVE')}>
              <Text style={[styles.chipText, direction === 'REMOVE' && styles.chipTextOn]}>Remove pending</Text>
            </TouchableOpacity>
          </View>
        )}
        {depositDirection && (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.chip, direction !== 'REFUND' && styles.chipOn]} onPress={() => setDirection('COLLECT')}>
              <Text style={[styles.chipText, direction !== 'REFUND' && styles.chipTextOn]}>Collect</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, direction === 'REFUND' && styles.chipOn]} onPress={() => setDirection('REFUND')}>
              <Text style={[styles.chipText, direction === 'REFUND' && styles.chipTextOn]}>Refund</Text>
            </TouchableOpacity>
          </View>
        )}
        {depositDirection ? (
          <Input label="Can deposit amount (₹)" value={amount} keyboardType="decimal-pad" onChangeText={setAmount} />
        ) : (
          <Input label="Cans" value={quantity} keyboardType="number-pad" onChangeText={(value) => setQuantity(value.replace(/[^0-9]/g, ''))} />
        )}
        <Input label="Note" placeholder="Optional" value={note} onChangeText={setNote} />
        <Button title={busy ? 'Saving…' : 'Save'} onPress={save} disabled={busy} />
      </Card>
      {events.map((event) => {
        const type = canEventType(event);
        return (
          <Card key={event.id} style={styles.row}>
            <Text style={styles.name}>{CAN_ENTRY_LABEL[type] || event.copy}</Text>
            <Text style={styles.meta}>{event.copy}</Text>
            <Text style={styles.meta}>{formatDateTime(event.occurredAt)}</Text>
          </Card>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.md },
  card: { padding: spacing.md, marginBottom: spacing.md },
  row: { padding: spacing.md, marginBottom: spacing.sm },
  name: { fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontWeight: typography.fontWeight.semibold },
  chipTextOn: { color: colors.white },
});

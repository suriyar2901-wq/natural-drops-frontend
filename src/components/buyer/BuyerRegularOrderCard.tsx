import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { colors, typography, spacing } from '../../theme';
import { Button, Card } from '../common';
import { useGetBuyerRegularOrderQuery, usePauseBuyerRegularOrderMutation, useResumeBuyerRegularOrderMutation } from '../../store/api/orderApi';
import { replaceCart } from '../../store/slices/cartSlice';
import { formatClockAmPm } from '../../utils/formatters';
import { MenuItem } from '../../types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const BuyerRegularOrderCard = ({ navigation }: { navigation: any }) => {
  const dispatch = useDispatch();
  const { data: plan } = useGetBuyerRegularOrderQuery();
  const [pausePlan, { isLoading: pausing }] = usePauseBuyerRegularOrderMutation();
  const [resumePlan, { isLoading: resuming }] = useResumeBuyerRegularOrderMutation();

  if (!plan?.id) return null;

  const days = String(plan.weekDays || '')
    .split(',')
    .map((part: string) => DAY_LABELS[Number(part)])
    .filter(Boolean)
    .join(', ');
  const items = Array.isArray(plan.items) ? plan.items : [];

  const edit = () => {
    if (!items.length) {
      Alert.alert('No items', 'Add products in the cart and save the regular order again.');
      return;
    }
    dispatch(replaceCart(items.map((item: any) => ({
      quantity: Number(item.quantity) || 1,
      menuItem: {
        id: Number(item.menuItemId),
        name: item.itemName,
        category: 'water',
        stockQuantity: 0,
        rate: Number(item.rate) || 0,
        createdAt: '',
        updatedAt: '',
      } as MenuItem,
    }))));
    const parentNav = navigation?.getParent?.();
    if (parentNav?.navigate) parentNav.navigate('Cart', { orderKind: 'regular' });
    else navigation.navigate('Cart', { orderKind: 'regular' });
  };

  const togglePause = async () => {
    try {
      if (plan.paused) {
        await resumePlan().unwrap();
        Alert.alert('Resumed', 'Regular order will deliver on the selected days again.');
      } else {
        await pausePlan().unwrap();
        Alert.alert('Paused', 'No new regular delivery will be created until you resume.');
      }
    } catch (error: any) {
      Alert.alert('Could not update', error?.data?.message || 'Try again.');
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Regular order</Text>
      <Text style={styles.line}>{plan.paused ? 'Paused' : 'Active'}</Text>
      <Text style={styles.line}>{days || 'No days'} at {formatClockAmPm(plan.deliveryTime || '')}</Text>
      {items.map((item: any) => (
        <Text key={`${item.menuItemId}-${item.itemName}`} style={styles.line}>
          {item.itemName} x {item.quantity}
        </Text>
      ))}
      {!!plan.deliveryAddress && <Text style={styles.address}>{plan.deliveryAddress}</Text>}
      <View style={styles.actions}>
        <Button title="Edit order" onPress={edit} variant="outline" style={styles.action} />
        <Button
          title={plan.paused ? 'Resume' : 'Pause'}
          onPress={togglePause}
          loading={pausing || resuming}
          style={styles.action}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, padding: spacing.md },
  title: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.xs },
  line: { color: colors.textPrimary, marginTop: 2 },
  address: { color: colors.textSecondary, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  action: { flex: 1 },
});

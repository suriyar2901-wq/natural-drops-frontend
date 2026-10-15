import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useDispatch } from 'react-redux';
import { colors, typography, spacing } from '../../theme';
import { Button, Card } from '../common';
import { useGetBuyerRegularOrderQuery, usePauseBuyerRegularOrderMutation, useResumeBuyerRegularOrderMutation, useSkipBuyerRegularDatesMutation } from '../../store/api/orderApi';
import { replaceCart } from '../../store/slices/cartSlice';
import { formatClockAmPm } from '../../utils/formatters';
import { MenuItem } from '../../types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const isoDate = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const labelDate = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const BuyerRegularOrderCard = ({ navigation }: { navigation: any }) => {
  const dispatch = useDispatch();
  const { data: plan } = useGetBuyerRegularOrderQuery();
  const [pausePlan, { isLoading: pausing }] = usePauseBuyerRegularOrderMutation();
  const [resumePlan, { isLoading: resuming }] = useResumeBuyerRegularOrderMutation();
  const [skipDates, { isLoading: skipping }] = useSkipBuyerRegularDatesMutation();
  const [picked, setPicked] = useState<string[]>([]);

  const savedSkips = String(plan?.skipDates || '');
  useEffect(() => {
    setPicked(savedSkips.split(',').map((part) => part.trim()).filter(Boolean));
  }, [savedSkips]);

  const upcoming = useMemo(() => {
    const days = new Set(String(plan?.weekDays || '').split(',').map((part) => part.trim()));
    const dates: string[] = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    for (let offset = 0; offset < 21 && dates.length < 8; offset += 1) {
      const date = new Date(cursor);
      date.setDate(cursor.getDate() + offset);
      if (days.has(String(date.getDay()))) {
        dates.push(isoDate(date));
      }
    }
    return dates;
  }, [plan?.weekDays]);

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

  const toggleDate = (iso: string) => {
    setPicked((current) => {
      if (current.includes(iso)) {
        return current.filter((item) => item !== iso);
      }
      if (current.length >= 2) {
        Alert.alert('Two days only', 'You can skip 1 or 2 delivery days. The rest of the regular order stays active.');
        return current;
      }
      return [...current, iso];
    });
  };

  const saveSkips = async () => {
    try {
      await skipDates({ dates: picked }).unwrap();
      Alert.alert(
        picked.length ? 'Days skipped' : 'Skip cleared',
        picked.length
          ? 'Those days will not be delivered. The other regular days stay on.'
          : 'Regular delivery is back on for every selected day.',
      );
    } catch (error: any) {
      Alert.alert('Could not skip', error?.data?.message || 'Try again.');
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
          title={plan.paused ? 'Resume' : 'Pause all'}
          onPress={togglePause}
          loading={pausing || resuming}
          style={styles.action}
        />
      </View>
      <Text style={styles.skipTitle}>Skip 1 or 2 days</Text>
      <Text style={styles.address}>Leave is only for the days you pick. The regular order stays active.</Text>
      <View style={styles.dates}>
        {upcoming.map((iso) => {
          const selected = picked.includes(iso);
          return (
            <TouchableOpacity
              key={iso}
              style={[styles.dateChip, selected && styles.dateChipOn]}
              onPress={() => toggleDate(iso)}
              disabled={!!plan.paused}
            >
              <Text style={[styles.dateText, selected && styles.dateTextOn]}>{labelDate(iso)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Button
        title={skipping ? 'Saving…' : 'Save skipped days'}
        onPress={saveSkips}
        loading={skipping}
        disabled={!!plan.paused}
      />
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
  skipTitle: { marginTop: spacing.md, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.sm },
  dateChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  dateChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateText: { color: colors.textPrimary },
  dateTextOn: { color: colors.white, fontWeight: typography.fontWeight.semibold },
});

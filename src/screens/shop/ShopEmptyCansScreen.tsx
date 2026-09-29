import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useCollectShopCansMutation, useGetShopCanEventsQuery, useGetShopCustomerQuery } from '../../store/api/shopApi';
import { formatDateTime } from '../../utils/formatters';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

export const ShopEmptyCansScreen = ({ navigation, route }: any) => {
  const customerId = route?.params?.customerId as number;
  const { data: customer, isLoading } = useGetShopCustomerQuery(customerId, { skip: !customerId });
  const { data: events = [] } = useGetShopCanEventsQuery(customerId, { skip: !customerId });
  const [collectCans, { isLoading: saving }] = useCollectShopCansMutation();
  const [quantity, setQuantity] = useState('1');

  if (isLoading || !customer) {
    return <Loading fullScreen message="Loading empty cans..." />;
  }

  const save = async () => {
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      showErrorToast('Enter a valid collect quantity');
      return;
    }
    if (qty > (customer.emptyCans || 0)) {
      showErrorToast('Cannot collect more cans than the customer holds');
      return;
    }
    try {
      await collectCans({ id: customerId, quantity: qty }).unwrap();
      showSuccessToast('Return recorded. Buyer account updated.');
      navigation.goBack();
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not collect cans');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Empty Cans</Text>
      <Card style={styles.card}>
        <Text style={styles.name}>{customer.name}</Text>
        <Text style={styles.meta}>Cans still to return: {customer.emptyCans || 0}</Text>
        <Input label="Return quantity" value={quantity} keyboardType="number-pad" onChangeText={(value) => setQuantity(value.replace(/[^0-9]/g, ''))} />
        <Button title={saving ? 'Saving…' : 'Record return'} onPress={save} />
      </Card>
      {events.map((event) => (
        <Card key={event.id} style={styles.row}>
          <Text style={styles.name}>{event.copy}</Text>
          <Text style={styles.meta}>{formatDateTime(event.occurredAt)}</Text>
        </Card>
      ))}
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
});

import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Input, Loading, StatusPill } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetAdminSellerQuery, useRecordSellerPaymentMutation } from '../../store/api/platformAdminApi';
import { formatCurrency } from '../../utils/formatters';

const nowLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const ActivatePaymentScreen = ({ navigation, route }: any) => {
  const sellerId = route?.params?.sellerId;
  const { data: seller, isLoading } = useGetAdminSellerQuery(sellerId, { skip: !sellerId });
  const [recordPayment, { isLoading: saving }] = useRecordSellerPaymentMutation();
  const [method, setMethod] = useState<'UPI' | 'CASH'>('UPI');
  const [received, setReceived] = useState('');
  const [paidAt, setPaidAt] = useState(nowLocal());
  const [note, setNote] = useState('');

  const due = seller?.amount != null ? Number(seller.amount).toFixed(2) : '0.00';
  const error = useMemo(() => {
    if (!received) return 'Received amount is required';
    if (Number(received).toFixed(2) !== due) return `Amount must exactly match ${due}`;
    return '';
  }, [received, due]);

  const handleConfirm = async () => {
    if (error) {
      Alert.alert('Check payment', error);
      return;
    }
    try {
      await recordPayment({
        id: sellerId,
        method,
        receivedAmount: Number(received).toFixed(2),
        paidAt,
        note: note || undefined,
      }).unwrap();
      Alert.alert('Activated', 'Payment recorded and seller activated.', [
        { text: 'View Seller', onPress: () => navigation.replace('SellerDetail', { sellerId }) },
      ]);
    } catch (e: any) {
      Alert.alert('Failed', e?.data?.message || e?.message || 'Could not record payment');
    }
  };

  if (isLoading || !seller) {
    return <Loading fullScreen message="Loading seller..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Initial Payment & Activation</Text>
      <Card style={styles.card}>
        <Text style={styles.business}>{seller.businessName}</Text>
        <Text style={styles.meta}>{seller.sellerCode} • {seller.ownerName} • {seller.mobile}</Text>
        <Text style={styles.meta}>{seller.area}</Text>
        <StatusPill label={seller.accountStatus} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>Subscription due</Text>
        <Text style={styles.due}>{seller.plan} • {formatCurrency(seller.amount)}</Text>
        <Text style={styles.hint}>Received amount must match the due amount exactly.</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>Record payment</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.method, method === 'UPI' && styles.methodActive]} onPress={() => setMethod('UPI')}>
            <Text style={method === 'UPI' ? styles.methodTextActive : styles.methodText}>Company QR / UPI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.method, method === 'CASH' && styles.methodActive]} onPress={() => setMethod('CASH')}>
            <Text style={method === 'CASH' ? styles.methodTextActive : styles.methodText}>Cash</Text>
          </TouchableOpacity>
        </View>
        {method === 'UPI' && <Text style={styles.hint}>UPI ID: watercan@upi</Text>}
        <Input label="Received amount *" value={received} onChangeText={setReceived} keyboardType="decimal-pad" placeholder={due} />
        <Input label="Payment date & time *" value={paidAt} onChangeText={setPaidAt} />
        <Input label="Note" value={note} onChangeText={setNote} />
      </Card>

      <Button title={saving ? 'Confirming…' : 'Confirm Payment & Activate'} onPress={handleConfirm} loading={saving} fullWidth />
      <Button title="Save & Exit" variant="outline" onPress={() => navigation.navigate('SellerList')} style={styles.exit} fullWidth />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.md },
  card: { padding: spacing.md, marginBottom: spacing.md },
  business: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold },
  meta: { color: colors.textSecondary, marginTop: 2 },
  section: { fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm },
  due: { fontSize: typography.fontSize.xl, color: colors.primary, fontWeight: typography.fontWeight.bold },
  hint: { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  method: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, alignItems: 'center' },
  methodActive: { borderColor: colors.primary, backgroundColor: '#E3F2FD' },
  methodText: { color: colors.textSecondary },
  methodTextActive: { color: colors.primary, fontWeight: typography.fontWeight.semibold },
  exit: { marginTop: spacing.sm },
});

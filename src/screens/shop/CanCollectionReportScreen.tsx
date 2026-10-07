import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetCanCollectionReportQuery } from '../../store/api/shopApi';
import { CAN_ENTRY_LABEL, moneyValue } from '../../types/shop.types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const today = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const dateInputStyle = {
  width: '100%',
  border: '1px solid #E0E0E0',
  borderRadius: 8,
  padding: 10,
  fontSize: 16,
  backgroundColor: '#fff',
};

export const CanCollectionReportScreen = () => {
  const [date, setDate] = useState(today());
  const { data, isLoading, isFetching } = useGetCanCollectionReportQuery(date);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Daily can collection report</Text>
      <Text style={styles.meta}>Returned, damaged, missing, and replaced cans for the selected day.</Text>
      <Text style={styles.label}>Date</Text>
      {Platform.OS === 'web' ? (
        React.createElement('input', {
          type: 'date',
          value: date,
          onChange: (event: any) => setDate(event.target.value || today()),
          style: dateInputStyle,
        })
      ) : (
        <TextInput value={date} onChangeText={setDate} placeholder="yyyy-mm-dd" style={styles.input} />
      )}
      {isLoading || !data ? (
        <Loading message="Loading report..." />
      ) : (
        <>
          <View style={styles.summary}>
            <Count value={data.returned || 0} label="Returned" />
            <Count value={data.damaged || 0} label="Damaged" />
            <Count value={data.missing || 0} label="Missing" />
            <Count value={data.replaced || 0} label="Replaced" />
          </View>
          <Card style={styles.deposit}>
            <Text style={styles.depositValue}>{formatCurrency(moneyValue(data.depositCollected))}</Text>
            <Text style={styles.meta}>Can deposit collected on this day</Text>
          </Card>
          {isFetching ? <Text style={styles.meta}>Updating...</Text> : null}
          {(data.rows || []).length === 0 ? (
            <Card style={styles.empty}><Text style={styles.meta}>No can collection on this date.</Text></Card>
          ) : data.rows.map((row) => (
            <Card key={row.id} style={styles.row}>
              <View style={styles.top}>
                <Text style={styles.name}>{row.name || 'Customer'}</Text>
                <Text style={styles.kind}>{CAN_ENTRY_LABEL[row.eventType] || row.eventType}</Text>
              </View>
              <Text style={styles.meta}>{row.mobile}</Text>
              <Text style={styles.meta}>
                {row.eventType === 'DEPOSIT'
                  ? formatCurrency(moneyValue(row.amount))
                  : `${row.quantity || 0} can${row.quantity === 1 ? '' : 's'}`}
                {' · '}
                {formatDateTime(row.occurredAt)}
              </Text>
              {!!row.copy && <Text style={styles.meta}>{row.copy}</Text>}
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
};

const Count = ({ value, label }: { value: number; label: string }) => (
  <View style={styles.count}>
    <Text style={styles.countValue}>{value}</Text>
    <Text style={styles.countLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  label: { marginTop: spacing.md, marginBottom: spacing.xs, color: colors.textSecondary, fontWeight: typography.fontWeight.semibold },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, backgroundColor: colors.white, marginBottom: spacing.md },
  summary: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  count: { flex: 1, backgroundColor: colors.white, borderRadius: 12, paddingVertical: spacing.sm, alignItems: 'center' },
  countValue: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  countLabel: { marginTop: 2, fontSize: typography.fontSize.xs, color: colors.textSecondary, textAlign: 'center' },
  deposit: { marginTop: spacing.md, padding: spacing.md },
  depositValue: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary },
  row: { marginTop: spacing.sm, padding: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  name: { flex: 1, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  kind: { color: colors.primary, fontWeight: typography.fontWeight.bold },
  meta: { color: colors.textSecondary, marginTop: 4 },
  empty: { marginTop: spacing.md, padding: spacing.lg },
});

import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Card, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetBuyerAccountSummaryQuery } from '../../store/api/buyerAccountApi';
import { formatDateTime } from '../../utils/formatters';

export const BuyerEmptyCansScreen = () => {
  const { data, isLoading } = useGetBuyerAccountSummaryQuery();

  if (isLoading) {
    return <Loading fullScreen message="Loading empty cans..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Empty Cans</Text>
      <Card style={styles.card}>
        <Text style={styles.stat}>{data?.emptyCans || 0}</Text>
        <Text style={styles.meta}>20 litre cans still with you. Return these to the seller.</Text>
        <Text style={styles.meta}>
          Given {Math.max((data?.canEvents || []).filter((event) => event.changeAmount > 0).reduce((sum, event) => sum + event.changeAmount, 0), (data?.emptyCans || 0) + (data?.canEvents || []).filter((event) => event.changeAmount < 0).reduce((sum, event) => sum + Math.abs(event.changeAmount), 0))}
          {' • '}
          Returned {(data?.canEvents || []).filter((event) => event.changeAmount < 0).reduce((sum, event) => sum + Math.abs(event.changeAmount), 0)}
        </Text>
        {!data?.customer && (
          <Text style={styles.meta}>No shop account is linked yet. Ask the seller to add your mobile as a customer.</Text>
        )}
      </Card>
      {(data?.canEvents || []).map((event) => (
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
  stat: { fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 4 },
  row: { padding: spacing.md, marginBottom: spacing.sm },
  name: { fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
});

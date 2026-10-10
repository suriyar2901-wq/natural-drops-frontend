import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { useGetSupportContactsQuery } from '../../store/api/settingsApi';
import { Card } from './Card';
import { ContactActions } from './ContactActions';

export const SupportContactCard = ({ title = 'Contact admin' }: { title?: string }) => {
  const { data } = useGetSupportContactsQuery();
  const phone = data?.phone || data?.whatsapp || '';
  const email = data?.email || '';

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Ionicons name="headset-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.copy}>Call, message, or email for help.</Text>
        </View>
      </View>
      <View style={styles.grid}>
        <View style={styles.cell}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{phone || 'Not specified'}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{email || 'Not specified'}</Text>
        </View>
      </View>
      <ContactActions
        phone={data?.whatsapp || data?.phone}
        email={email}
        message="Hello, I need help with my Natural Drops account."
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginTop: spacing.md, marginBottom: spacing.md, padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerText: { flex: 1 },
  title: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  copy: { color: colors.textSecondary, marginTop: 2, fontSize: typography.fontSize.sm },
  grid: { gap: spacing.sm },
  cell: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  label: { fontSize: typography.fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  value: { fontSize: typography.fontSize.lg, color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
});

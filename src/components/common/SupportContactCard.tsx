import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { useGetSupportContactsQuery } from '../../store/api/settingsApi';
import { Card } from './Card';
import { ContactActions } from './ContactActions';

export const SupportContactCard = ({ title = 'Contact admin' }: { title?: string }) => {
  const { data } = useGetSupportContactsQuery();
  const phone = data?.phone || data?.whatsapp || '';
  const email = data?.email || '';

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>Use the phone, SMS, WhatsApp, and email saved in admin customer details.</Text>
      {!!phone && <Text style={styles.meta}>{phone}</Text>}
      {!!email && <Text style={styles.meta}>{email}</Text>}
      <ContactActions
        phone={data?.whatsapp || data?.phone}
        email={email}
        message="Hello, I need help with my Natural Drops account."
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  title: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  copy: { color: colors.textSecondary, marginTop: spacing.xs },
  meta: { color: colors.textPrimary, marginTop: spacing.xs },
});

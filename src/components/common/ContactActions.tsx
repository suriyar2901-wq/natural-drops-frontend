import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { contactLinks, openContact } from '../../utils/openContact';

type Props = {
  phone?: string | null;
  email?: string | null;
  message?: string;
};

export const ContactActions = ({ phone, email, message }: Props) => {
  const links = contactLinks(phone, email, message);
  const actions = [
    { key: 'call', label: 'Call', url: links.call },
    { key: 'sms', label: 'SMS', url: links.sms },
    { key: 'whatsapp', label: 'WhatsApp', url: links.whatsapp },
    { key: 'email', label: 'Email', url: links.email },
  ].filter((item) => item.url);

  if (actions.length === 0) {
    return <Text style={styles.empty}>No phone or email to contact.</Text>;
  }

  return (
    <View style={styles.row}>
      {actions.map((item) => (
        <TouchableOpacity key={item.key} style={styles.button} onPress={() => openContact(item.url)} accessibilityRole="button">
          <Text style={styles.buttonText}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  button: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.blue100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.primary, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm },
  empty: { color: colors.textSecondary, marginTop: spacing.xs },
});

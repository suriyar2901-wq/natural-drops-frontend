import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { Button } from './Button';
import { formatDateTime } from '../../utils/formatters';
import { regularNoticeLook, RegularNoticeTone } from '../../utils/regularNotice';

interface NotificationPreviewProps {
  visible: boolean;
  message: string;
  createdAt?: string;
  isRead?: boolean;
  tone?: 'default' | RegularNoticeTone;
  onClose: () => void;
  onRead?: () => void;
}

export const NotificationPreview = ({
  visible,
  message,
  createdAt,
  isRead,
  tone = 'default',
  onClose,
  onRead,
}: NotificationPreviewProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        style={[
          styles.card,
          tone !== 'default' && {
            backgroundColor: regularNoticeLook[tone].background,
            borderWidth: 2,
            borderColor: regularNoticeLook[tone].border,
          },
        ]}
      >
        {tone !== 'default' && (
          <Text style={[styles.pauseBadge, { backgroundColor: regularNoticeLook[tone].border }]}>
            {regularNoticeLook[tone].badge}
          </Text>
        )}
        <Text style={[styles.message, isRead && styles.messageRead, tone !== 'default' && { color: regularNoticeLook[tone].text, fontWeight: typography.fontWeight.semibold }]}>{message}</Text>
        {!!createdAt && <Text style={styles.time}>{formatDateTime(createdAt)}</Text>}
        <View style={styles.actions}>
          {!isRead && onRead ? (
            <Button title="Read" onPress={onRead} />
          ) : (
            <Button title="Close" variant="outline" onPress={onClose} />
          )}
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
  },
  pauseCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#EA580C',
  },
  pauseBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EA580C',
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  pauseMessage: {
    color: '#9A3412',
    fontWeight: typography.fontWeight.semibold,
  },
  message: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
    lineHeight: 22,
  },
  messageRead: {
    color: '#1F2937',
    fontWeight: typography.fontWeight.bold,
  },
  time: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
  },
  actions: {
    marginTop: spacing.md,
  },
});

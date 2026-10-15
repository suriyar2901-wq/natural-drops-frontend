import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
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
}: NotificationPreviewProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View
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
          <TouchableOpacity style={[styles.actionButton, styles.actionOutline]} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.actionOutlineText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    zIndex: 1,
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
    marginTop: spacing.sm,
    alignItems: 'flex-end',
  },
  actionButton: {
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOutline: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  actionOutlineText: {
    color: colors.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
});

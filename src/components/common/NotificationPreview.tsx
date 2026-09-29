import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { Button } from './Button';
import { formatDateTime } from '../../utils/formatters';

interface NotificationPreviewProps {
  visible: boolean;
  message: string;
  createdAt?: string;
  isRead?: boolean;
  onClose: () => void;
  onRead?: () => void;
}

export const NotificationPreview = ({
  visible,
  message,
  createdAt,
  isRead,
  onClose,
  onRead,
}: NotificationPreviewProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.card}>
        <Text style={[styles.message, isRead && styles.messageRead]}>{message}</Text>
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

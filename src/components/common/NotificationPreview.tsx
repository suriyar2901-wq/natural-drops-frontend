import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';
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

type NoticeKind = 'refund' | 'cancel' | 'delivery' | 'confirmed' | 'delivered' | 'bill' | 'general';

const kindFromMessage = (message: string): NoticeKind => {
  const text = (message || '').toLowerCase();
  if (text.includes('refund')) return 'refund';
  if (text.includes('cancel')) return 'cancel';
  if (text.includes('delivered')) return 'delivered';
  if (text.includes('delivery') || text.includes('tomorrow') || text.includes('on the way')) {
    return 'delivery';
  }
  if (text.includes('confirm')) return 'confirmed';
  if (text.includes('bill')) return 'bill';
  return 'general';
};

const kindMeta: Record<
  NoticeKind,
  { title: string; icon: keyof typeof Ionicons.glyphMap; tint: string; soft: string }
> = {
  refund: {
    title: 'Refund update',
    icon: 'cash-outline',
    tint: '#1565C0',
    soft: '#E3F2FD',
  },
  cancel: {
    title: 'Order canceled',
    icon: 'close-circle-outline',
    tint: '#C62828',
    soft: '#FFEBEE',
  },
  delivery: {
    title: 'Delivery reminder',
    icon: 'bicycle-outline',
    tint: colors.primary,
    soft: '#E4EAF9',
  },
  confirmed: {
    title: 'Order confirmed',
    icon: 'checkmark-circle-outline',
    tint: '#2E7D32',
    soft: '#E8F5E9',
  },
  delivered: {
    title: 'Order delivered',
    icon: 'cube-outline',
    tint: '#2E7D32',
    soft: '#E8F5E9',
  },
  bill: {
    title: 'Bill update',
    icon: 'receipt-outline',
    tint: '#EF6C00',
    soft: '#FFF3E0',
  },
  general: {
    title: 'Notification',
    icon: 'notifications-outline',
    tint: colors.primary,
    soft: '#E4EAF9',
  },
};

export const NotificationPreview = ({
  visible,
  message,
  createdAt,
  isRead,
  tone = 'default',
  onClose,
}: NotificationPreviewProps) => {
  const kind = useMemo(() => kindFromMessage(message), [message]);
  const meta = kindMeta[kind];
  const customTone = tone !== 'default' ? regularNoticeLook[tone] : null;
  const tint = customTone?.border || meta.tint;
  const soft = customTone?.background || meta.soft;
  const title = customTone?.badge || meta.title;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
        />
        <View
          style={[
            styles.card,
            shadows.md,
            customTone && {
              backgroundColor: customTone.background,
              borderColor: customTone.border,
              borderWidth: 1.5,
            },
          ]}
          accessibilityRole="summary"
          accessibilityLabel={title}
        >
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: soft }]}>
              <Ionicons
                name={customTone ? 'information-circle-outline' : meta.icon}
                size={22}
                color={tint}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: tint }]} numberOfLines={1}>
                {title}
              </Text>
              {!isRead && (
                <View style={styles.newChip}>
                  <Text style={styles.newChipText}>New</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.iconClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.message,
              isRead && styles.messageRead,
              customTone && { color: customTone.text, fontWeight: typography.fontWeight.semibold },
            ]}
          >
            {message}
          </Text>

          {!!createdAt && (
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.time}>{formatDateTime(createdAt)}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: tint }]}
            onPress={onClose}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Close notification"
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  newChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  newChipText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  iconClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
  },
  message: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
    lineHeight: 24,
  },
  messageRead: {
    color: '#1F2937',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  time: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
  },
  closeButton: {
    marginTop: spacing.lg,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  closeButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
});

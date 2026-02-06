import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { DateRangePicker, DateRangeValue } from './DateRangePicker';

export type DateRangeModalValue = DateRangeValue;

type Props = {
  visible: boolean;
  initialValue: DateRangeModalValue;
  onApply: (value: DateRangeModalValue) => void;
  onClose: () => void;
};

const toLocalYmd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const DateRangeModal: React.FC<Props> = ({ visible, initialValue, onApply, onClose }) => {
  const [draft, setDraft] = useState<DateRangeModalValue>(initialValue);

  useEffect(() => {
    if (visible) setDraft(initialValue);
  }, [visible, initialValue]);

  const preview = useMemo(() => {
    if (!draft.startDate || !draft.endDate) return 'Select a start and end date';
    return `${toLocalYmd(draft.startDate)} → ${toLocalYmd(draft.endDate)}`;
  }, [draft.startDate, draft.endDate]);

  const canApply = !!draft.startDate && !!draft.endDate;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Select Date Range</Text>
              <Text style={styles.subtitle}>Choose start and end dates</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <DateRangePicker value={draft} onChange={setDraft} />
          </View>

          <View style={styles.previewPill}>
            <Text style={styles.previewText}>📅 {preview}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.applyBtn, !canApply && styles.applyBtnDisabled]}
              onPress={() => onApply(draft)}
              disabled={!canApply}
            >
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  pickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  previewPill: {
    marginTop: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  previewText: {
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  cancelBtn: {
    backgroundColor: colors.gray100,
  },
  cancelText: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  applyBtn: {
    backgroundColor: colors.primary,
  },
  applyBtnDisabled: {
    backgroundColor: colors.gray400,
  },
  applyText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
});



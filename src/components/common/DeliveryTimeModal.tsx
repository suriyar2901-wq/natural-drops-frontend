import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface DeliveryTimeModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (totalSeconds: number) => void; // Now accepts total seconds
}

export const DeliveryTimeModal: React.FC<DeliveryTimeModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [hours, setHours] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');
  const [seconds, setSeconds] = useState<string>('');

  // Preset times in HH:MM:SS format
  const presetTimes = [
    { label: '00:10:00', seconds: 600 },   // 10 minutes
    { label: '00:20:00', seconds: 1200 },  // 20 minutes
    { label: '00:30:00', seconds: 1800 },  // 30 minutes
    { label: '01:00:00', seconds: 3600 },  // 1 hour
    { label: '02:00:00', seconds: 7200 },  // 2 hours
  ];

  const handlePresetSelect = (presetLabel: string) => {
    setSelectedPreset(presetLabel);
    setHours('');
    setMinutes('');
    setSeconds('');
  };

  const handleHoursInput = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    if (numericValue === '' || (parseInt(numericValue, 10) >= 0 && parseInt(numericValue, 10) <= 23)) {
      setHours(numericValue);
      setSelectedPreset(null);
    }
  };

  const handleMinutesInput = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    if (numericValue === '' || (parseInt(numericValue, 10) >= 0 && parseInt(numericValue, 10) <= 59)) {
      setMinutes(numericValue);
      setSelectedPreset(null);
    }
  };

  const handleSecondsInput = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    if (numericValue === '' || (parseInt(numericValue, 10) >= 0 && parseInt(numericValue, 10) <= 59)) {
      setSeconds(numericValue);
      setSelectedPreset(null);
    }
  };

  const parseTimeString = (timeStr: string): { h: number; m: number; s: number } | null => {
    // Parse HH:MM:SS format
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const s = parseInt(parts[2], 10);
      if (!isNaN(h) && !isNaN(m) && !isNaN(s) && h >= 0 && m >= 0 && m <= 59 && s >= 0 && s <= 59) {
        return { h, m, s };
      }
    }
    return null;
  };

  const handleConfirm = () => {
    let totalSeconds: number;
    
    if (selectedPreset) {
      // Use preset time
      const preset = presetTimes.find(p => p.label === selectedPreset);
      if (preset) {
        totalSeconds = preset.seconds;
      } else {
        Alert.alert('Invalid Selection', 'Please select a valid preset time.');
        return;
      }
    } else if (hours || minutes || seconds) {
      // Calculate from custom input
      const h = parseInt(hours || '0', 10);
      const m = parseInt(minutes || '0', 10);
      const s = parseInt(seconds || '0', 10);
      
      if (isNaN(h) || isNaN(m) || isNaN(s) || h < 0 || m < 0 || m > 59 || s < 0 || s > 59) {
        Alert.alert('Invalid Time', 'Please enter valid time values:\n- Hours: 0-23\n- Minutes: 0-59\n- Seconds: 0-59');
        return;
      }
      
      if (h === 0 && m === 0 && s === 0) {
        Alert.alert('Invalid Time', 'Please enter a time greater than 00:00:00.');
        return;
      }
      
      totalSeconds = (h * 3600) + (m * 60) + s;
    } else {
      Alert.alert('Select Time', 'Please select a preset time or enter a custom time (HH:MM:SS).');
      return;
    }

    onConfirm(totalSeconds);
    // Reset state
    setSelectedPreset(null);
    setHours('');
    setMinutes('');
    setSeconds('');
  };

  const handleClose = () => {
    setSelectedPreset(null);
    setHours('');
    setMinutes('');
    setSeconds('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalTopRow}>
            <View>
              <Text style={styles.modalTitle}>Set Delivery Time</Text>
              <Text style={styles.modalSubtitle}>Choose how long until delivery</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} accessibilityLabel="Close">
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.presetContainer}>
            <Text style={styles.presetLabel}>Quick Select:</Text>
            <View style={styles.presetButtons}>
              {presetTimes.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[
                    styles.presetButton,
                    selectedPreset === preset.label && styles.presetButtonActive,
                  ]}
                  onPress={() => handlePresetSelect(preset.label)}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      selectedPreset === preset.label && styles.presetButtonTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                  <Text
                    style={[
                      styles.presetButtonSubtext,
                      selectedPreset === preset.label && styles.presetButtonSubtextActive,
                    ]}
                  >
                    {Math.round(preset.seconds / 60)} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.customContainer}>
            <Text style={styles.customLabel}>Or enter custom time (HH:MM:SS):</Text>
            <View style={styles.timeInputContainer}>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>Hours</Text>
                <TextInput
                  style={styles.timeInput}
                  value={hours}
                  onChangeText={handleHoursInput}
                  placeholder="00"
                  keyboardType="numeric"
                  maxLength={2}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>Minutes</Text>
                <TextInput
                  style={styles.timeInput}
                  value={minutes}
                  onChangeText={handleMinutesInput}
                  placeholder="00"
                  keyboardType="numeric"
                  maxLength={2}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>Seconds</Text>
                <TextInput
                  style={styles.timeInput}
                  value={seconds}
                  onChangeText={handleSecondsInput}
                  placeholder="00"
                  keyboardType="numeric"
                  maxLength={2}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
            {(hours || minutes || seconds) && (
              <Text style={styles.timePreview}>
                Preview: {String(hours || 0).padStart(2, '0')}:{String(minutes || 0).padStart(2, '0')}:{String(seconds || 0).padStart(2, '0')}
              </Text>
            )}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, !(selectedPreset || hours || minutes || seconds) && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!(selectedPreset || hours || minutes || seconds)}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 400,
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
  },
  closeButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  presetContainer: {
    marginBottom: spacing.lg,
  },
  presetLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  presetButton: {
    width: '48%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  presetButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  presetButtonTextActive: {
    color: colors.white,
  },
  presetButtonSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  presetButtonSubtextActive: {
    color: colors.white,
    opacity: 0.9,
  },
  customContainer: {
    marginBottom: spacing.lg,
  },
  customLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeInputGroup: {
    width: 86,
    alignItems: 'center',
  },
  timeInputLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    textAlign: 'center',
    width: '100%',
  },
  timeSeparator: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginHorizontal: spacing.xs,
  },
  timePreview: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.gray200,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.gray300,
  },
  confirmButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
});


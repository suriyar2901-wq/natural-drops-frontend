import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../theme';

type DialogButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type DialogState = {
  title: string;
  message?: string;
  buttons: DialogButton[];
};

let listener: ((state: DialogState | null) => void) | null = null;

export const showAppDialog = (title: string, message?: string, buttons?: DialogButton[]) => {
  listener?.({
    title: title || 'Message',
    message,
    buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
  });
};

export const AppDialogHost = () => {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  useEffect(() => {
    listener = setDialog;
    return () => {
      if (listener === setDialog) listener = null;
    };
  }, []);

  const close = (button?: DialogButton) => {
    setDialog(null);
    button?.onPress?.();
  };

  return (
    <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(dialog?.buttons.find((button) => button.style === 'cancel') || dialog?.buttons[0])}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{dialog?.title}</Text>
          {!!dialog?.message && <Text style={styles.message}>{dialog.message}</Text>}
          <View style={styles.actions}>
            {dialog?.buttons.map((button, index) => {
              const label = button.text || 'OK';
              const destructive = button.style === 'destructive';
              const cancel = button.style === 'cancel';
              return (
                <TouchableOpacity
                  key={`${label}-${index}`}
                  style={[styles.button, cancel && styles.cancelButton, destructive && styles.destructiveButton, !cancel && !destructive && styles.primaryButton]}
                  onPress={() => close(button)}
                >
                  <Text style={[styles.buttonText, cancel && styles.cancelText]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  message: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.fontSize.base,
    lineHeight: 22,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  button: {
    borderRadius: borderRadius.full,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: { backgroundColor: colors.primary },
  destructiveButton: { backgroundColor: colors.error },
  cancelButton: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: colors.white, fontWeight: typography.fontWeight.bold },
  cancelText: { color: colors.textPrimary },
});

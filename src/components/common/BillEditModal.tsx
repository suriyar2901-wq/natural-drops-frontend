import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { Button } from './Button';
import { Input } from './Input';
import { Order, PaymentStatus } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface BillEditModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onSave: (finalBillAmount: number, billingNotes: string) => void;
  isLoading?: boolean;
}

export const BillEditModal: React.FC<BillEditModalProps> = ({
  visible,
  order,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [finalBillAmount, setFinalBillAmount] = useState<string>('');
  const [billingNotes, setBillingNotes] = useState<string>('');

  useEffect(() => {
    if (order) {
      // Initialize with existing bill amount or order total
      setFinalBillAmount(order.finalBillAmount?.toString() || order.total.toString());
      setBillingNotes(order.billingNotes || '');
    }
  }, [order, visible]);

  const handleSave = () => {
    const amount = parseFloat(finalBillAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }
    if (order && amount > order.total) {
      // This will be validated on backend, but show warning
      return;
    }
    onSave(amount, billingNotes.trim());
  };

  const handleClose = () => {
    setFinalBillAmount('');
    setBillingNotes('');
    onClose();
  };

  if (!order) return null;

  // Prevent editing bill for delivered orders
  const isDelivered = order.status === 'delivered';
  const amount = parseFloat(finalBillAmount) || 0;
  const isValid = !isNaN(amount) && amount > 0 && amount <= order.total && !isDelivered;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Add / Edit Bill</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {isDelivered && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>
                  ⚠️ This order is already delivered. Bill cannot be edited.
                </Text>
              </View>
            )}
            <View style={styles.orderInfo}>
              <Text style={styles.label}>Order ID</Text>
              <Text style={styles.value}>#{order.id}</Text>
            </View>

            <View style={styles.orderInfo}>
              <Text style={styles.label}>Customer Name</Text>
              <Text style={styles.value}>{order.buyerName}</Text>
            </View>

            <View style={styles.orderInfo}>
              <Text style={styles.label}>Original Order Amount</Text>
              <Text style={styles.originalAmount}>{formatCurrency(order.total)}</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Final Bill Amount *</Text>
              <TextInput
                style={[styles.amountInput, !isValid && amount > 0 && styles.amountInputError]}
                value={finalBillAmount}
                onChangeText={setFinalBillAmount}
                placeholder="Enter final bill amount"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.gray400}
                editable={!isDelivered}
              />
              {amount > order.total && (
                <Text style={styles.errorText}>
                  Bill amount cannot exceed original order total ({formatCurrency(order.total)})
                </Text>
              )}
              {amount <= 0 && finalBillAmount !== '' && (
                <Text style={styles.errorText}>Bill amount must be greater than 0</Text>
              )}
            </View>

            <View style={styles.paymentStatusPreview}>
              <Text style={styles.previewLabel}>Payment Status:</Text>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>
                  {amount === order.total
                    ? '🟢 PAID'
                    : amount === 0
                    ? '🔴 UNPAID'
                    : '🟡 PARTIALLY PAID'}
                </Text>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Billing Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={billingNotes}
                onChangeText={setBillingNotes}
                placeholder="Add any notes about discounts, adjustments, etc."
                multiline
                numberOfLines={4}
                placeholderTextColor={colors.gray400}
                textAlignVertical="top"
                editable={!isDelivered}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Cancel"
              onPress={handleClose}
              variant="outline"
              style={styles.cancelButton}
            />
            <Button
              title={isDelivered ? "Read Only" : (isLoading ? "Saving..." : "Save Bill")}
              onPress={handleSave}
              disabled={!isValid || isLoading || isDelivered}
              style={styles.saveButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    ...Platform.select({
      web: {
        maxWidth: 500,
        alignSelf: 'center',
        borderRadius: 20,
        marginBottom: 20,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.lg,
  },
  orderInfo: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  originalAmount: {
    fontSize: typography.fontSize.lg,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  inputContainer: {
    marginTop: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.fontSize.lg,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  amountInputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  paymentStatusPreview: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  previewBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  previewBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    minHeight: 100,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    color: '#856404',
    fontWeight: typography.fontWeight.medium,
  },
});


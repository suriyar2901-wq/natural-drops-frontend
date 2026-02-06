import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, Platform, ActivityIndicator } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { APP_CONFIG } from '../../utils/constants';
import { useGetCustomerContactNumberQuery, useGetCustomerSupportEmailQuery } from '../../store/api/settingsApi';

interface CustomerServiceModalProps {
  visible: boolean;
  message: string;
  onClose: () => void;
}

export const CustomerServiceModal: React.FC<CustomerServiceModalProps> = ({
  visible,
  message,
  onClose,
}) => {
  // Fetch customer support details from backend
  const { data: supportPhone, isLoading: phoneLoading } = useGetCustomerContactNumberQuery();
  const { data: supportEmail, isLoading: emailLoading } = useGetCustomerSupportEmailQuery();

  // Fallback to constants if backend values are not available
  const phoneNumber = supportPhone && supportPhone.trim() 
    ? `+91 ${supportPhone}` 
    : APP_CONFIG.supportPhone;
  const emailAddress = supportEmail && supportEmail.trim()
    ? supportEmail
    : APP_CONFIG.supportEmail;

  const isLoading = phoneLoading || emailLoading;

  const handleCall = () => {
    const phone = phoneNumber.replace(/\s/g, ''); // Remove spaces
    const telUrl = `tel:${phone}`;
    
    Linking.canOpenURL(telUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(telUrl);
        } else {
          console.warn('Phone dialer not available');
        }
      })
      .catch((err) => {
        console.error('Error opening phone dialer:', err);
      });
  };

  const handleEmail = () => {
    const emailUrl = `mailto:${emailAddress}`;
    
    Linking.canOpenURL(emailUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(emailUrl);
        } else {
          console.warn('Email client not available');
        }
      })
      .catch((err) => {
        console.error('Error opening email client:', err);
      });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Account Access</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.message}>{message}</Text>

            <View style={styles.contactSection}>
              <Text style={styles.contactTitle}>Need Help?</Text>
              <Text style={styles.contactSubtitle}>Contact our Customer Service team</Text>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading contact details...</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity style={styles.callButton} onPress={handleCall}>
                    <Text style={styles.callButtonIcon}>📞</Text>
                    <Text style={styles.callButtonText}>Call Customer Service</Text>
                    <Text style={styles.callButtonPhone}>{phoneNumber}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.emailButton} onPress={handleEmail}>
                    <Text style={styles.emailButtonIcon}>📧</Text>
                    <Text style={styles.emailButtonText}>Email Support</Text>
                    <Text style={styles.emailButtonEmail}>{emailAddress}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.okButton} onPress={onClose}>
              <Text style={styles.okButtonText}>OK</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.bold,
  },
  content: {
    padding: spacing.lg,
  },
  message: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  contactSection: {
    marginTop: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  contactTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  contactSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  callButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  callButtonIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  callButtonText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  callButtonPhone: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    opacity: 0.9,
  },
  emailButton: {
    backgroundColor: colors.gray100,
    borderRadius: spacing.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emailButtonIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  emailButtonText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  emailButtonEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  okButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  okButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});


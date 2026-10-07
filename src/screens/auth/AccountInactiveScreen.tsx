import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';
import { Button } from '../../components/common';
import { APP_CONFIG } from '../../utils/constants';
import { useAuth } from '../../hooks';
import { useGetCustomerContactNumberQuery, useGetCustomerSupportEmailQuery } from '../../store/api/settingsApi';

export const AccountInactiveScreen = ({ navigation }: any) => {
  const { logout, user } = useAuth();
  
  // CRITICAL: If user is actually active, redirect to app immediately
  React.useEffect(() => {
    if (user) {
      // Treat undefined, null, or true as active. Only explicit false means inactive.
      const isActiveBoolean = user.isActive !== false;
      const shouldBeActive = user.role === 'admin' || isActiveBoolean;
      
      if (shouldBeActive) {
        console.log('✅ User account is ACTIVE, redirecting to app:', {
          username: user.username,
          role: user.role,
          isActive: user.isActive,
        });
        // User is actually active - redirect to appropriate app
        if (user.role === 'seller' || user.role === 'admin') {
          navigation.replace('AdminApp');
        } else {
          navigation.replace('BuyerApp');
        }
      }
    }
  }, [user, navigation]);
  
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

  const handleCallSupport = () => {
    const phone = phoneNumber.replace(/\s/g, '');
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

  const handleEmailSupport = () => {
    const emailUrl = `mailto:${emailAddress}?subject=Account Reactivation Request`;
    
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

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Account Deactivated</Text>

        {/* Message */}
        <Text style={styles.message}>
          Your account is deactivated. Please contact customer care.
        </Text>

        <Text style={styles.subMessage}>
          Your account has been deactivated by the administrator. Please contact customer care to reactivate your account.
        </Text>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Contact Customer Care</Text>
          
          <Button
            title="Call Customer Care"
            onPress={handleCallSupport}
            variant="primary"
            fullWidth
            style={styles.contactButton}
          />

          <Button
            title="Email Support"
            onPress={handleEmailSupport}
            variant="secondary"
            fullWidth
            style={styles.contactButton}
          />

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading contact details...</Text>
            </View>
          ) : (
            <View style={styles.contactInfo}>
              <Text style={styles.contactInfoText}>
                Phone: {phoneNumber}
              </Text>
              <Text style={styles.contactInfoText}>
                Email: {emailAddress}
              </Text>
            </View>
          )}
        </View>

        {/* Logout Button */}
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="text"
          fullWidth
          style={styles.logoutButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.fontSize.lg,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 24,
  },
  subMessage: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  contactSection: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  contactTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  contactButton: {
    marginBottom: spacing.md,
  },
  contactInfo: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  contactInfoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  logoutButton: {
    marginTop: spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing.md,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});


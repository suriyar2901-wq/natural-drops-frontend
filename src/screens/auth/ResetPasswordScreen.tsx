import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Modal, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { Button, Input } from '../../components/common';
import { useResetPasswordMutation } from '../../store/api/authApi';
import { validators, validationMessages } from '../../utils/validators';

export const ResetPasswordScreen = ({ navigation, route }: any) => {
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [token, setToken] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ 
    token?: string;
    otp?: string;
    newPassword?: string; 
    confirmPassword?: string;
  }>({});
  const [popup, setPopup] = useState<{ title: string; message: string; goLogin?: boolean } | null>(null);

  // Detect platform and handle token from URL (for web)
  const isMobile = Platform.OS !== 'web';
  const routeParams = route?.params || {};

  useEffect(() => {
    // For web, try to get token from URL query params or hash
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Try URL search params first (e.g., ?token=xxx)
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token');
      if (tokenFromUrl) {
        console.log('✅ Token found in URL query params:', tokenFromUrl);
        setToken(tokenFromUrl);
      }
      
      // Also check hash params (for React Navigation deep linking)
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const tokenFromHash = hashParams.get('token');
        if (tokenFromHash) {
          console.log('✅ Token found in URL hash:', tokenFromHash);
          setToken(tokenFromHash);
        }
      }
    }

    // Get token/OTP from route params if available (React Navigation)
    if (routeParams?.token) {
      console.log('✅ Token from route params:', routeParams.token);
      setToken(routeParams.token);
    }
    if (routeParams?.otp) {
      console.log('✅ OTP from route params:', routeParams.otp);
      setOtp(routeParams.otp);
    }
  }, [routeParams]);

  const validate = () => {
    const newErrors: { 
      token?: string;
      otp?: string;
      newPassword?: string; 
      confirmPassword?: string;
    } = {};

    // Either token or OTP must be provided
    if (!token && !otp) {
      if (isMobile) {
        newErrors.otp = 'OTP is required';
      } else {
        newErrors.token = 'Token is required';
      }
    }

    if (!validators.required(newPassword)) {
      newErrors.newPassword = validationMessages.required;
    } else if (!validators.password(newPassword)) {
      newErrors.newPassword = validationMessages.password;
    }

    if (!validators.required(confirmPassword)) {
      newErrors.confirmPassword = validationMessages.required;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validate()) {
      return;
    }

    try {
      await resetPassword({
        token: token || undefined,
        otp: otp || undefined,
        newPassword,
        confirmPassword,
      }).unwrap();

      setPopup({
        title: 'Password reset successful',
        message: 'Your password has been reset successfully. Please login with your new password.',
        goLogin: true,
      });
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to reset password. Please try again.';
      const expired = errorMessage.toLowerCase().includes('expired');
      setPopup({
        title: expired ? 'Link expired' : 'Password reset failed',
        message: expired
          ? 'This reset link is valid for 15 minutes only. Please ask for a new invite link.'
          : errorMessage,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            This link is valid for 15 minutes. Enter a new password to continue.
          </Text>
        </View>

        <View style={styles.form}>
          {isMobile ? (
            <Input
              label="OTP Code"
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter the 6-digit OTP code"
              keyboardType="number-pad"
              maxLength={6}
              error={errors.otp}
              helperText="Enter the 6-digit OTP code sent to your email"
            />
          ) : (
            <Input
              label="Reset Token"
              value={token}
              onChangeText={setToken}
              placeholder="Enter the reset token from your email"
              autoCapitalize="none"
              error={errors.token}
              helperText="Enter the token from the password reset email link"
            />
          )}

          <Input
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter your new password"
            secureTextEntry
            showPasswordToggle
            error={errors.newPassword}
            helperText="Must be at least 8 characters with at least one letter and one number"
          />

          <Input
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your new password"
            secureTextEntry
            showPasswordToggle
            error={errors.confirmPassword}
          />

          <Button
            title="Reset Password"
            onPress={handleResetPassword}
            loading={isLoading}
            fullWidth
            style={styles.submitButton}
          />

          <Button
            title="Back to Login"
            onPress={() => navigation.replace('Login')}
            variant="text"
            fullWidth
            style={styles.backButton}
          />
        </View>
      </ScrollView>

      <Modal visible={!!popup} transparent animationType="fade" onRequestClose={() => setPopup(null)}>
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>{popup?.title}</Text>
            <Text style={styles.popupMessage}>{popup?.message}</Text>
            <TouchableOpacity
              style={styles.popupButton}
              onPress={() => {
                const goLogin = popup?.goLogin;
                setPopup(null);
                if (goLogin) {
                  navigation.replace('Login');
                }
              }}
            >
              <Text style={styles.popupButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  submitButton: {
    marginTop: spacing.md,
  },
  backButton: {
    marginTop: spacing.sm,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  popupCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    width: '100%',
    maxWidth: 400,
    padding: spacing.lg,
  },
  popupTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  popupMessage: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  popupButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  popupButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});


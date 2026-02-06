import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { Button, Input } from '../../components/common';
import { useAuth } from '../../hooks';
import { useChangePasswordMutation } from '../../store/api/authApi';
import { validators, validationMessages } from '../../utils/validators';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

/**
 * Change Password Screen
 * 
 * SECURITY NOTES:
 * - NO automatic API calls on screen load
 * - Password fields are ALWAYS empty on load
 * - API is called ONLY when user clicks "Change Password" button
 * - Current password is NEVER fetched or displayed
 * - Explicitly clears password fields on mount to prevent auto-fill
 */
export const ChangePasswordScreen = ({ navigation }: any) => {
  const { logout } = useAuth();
  // Mutation - does NOT auto-fetch, only called on button click
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  
  // Always start with empty password fields - never pre-fill
  // This ensures security - no password data is stored or displayed
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ 
    oldPassword?: string; 
    newPassword?: string; 
    confirmPassword?: string;
  }>({});
  
  // Refs to clear input values if browser auto-fills them
  const oldPasswordRef = useRef<any>(null);
  const newPasswordRef = useRef<any>(null);
  const confirmPasswordRef = useRef<any>(null);
  
  // Clear password fields on mount to prevent auto-fill
  // This runs once when screen loads to ensure fields are empty
  useEffect(() => {
    // Explicitly clear all password fields on mount
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    
    // Use setTimeout to ensure DOM is ready (for web browser auto-fill prevention)
    const clearTimer = setTimeout(() => {
      // Clear input refs if they exist (for web browser auto-fill prevention)
      if (oldPasswordRef.current) {
        try {
          oldPasswordRef.current.setNativeProps?.({ text: '' });
          // Also try direct value clearing for web
          if (Platform.OS === 'web' && oldPasswordRef.current) {
            oldPasswordRef.current.value = '';
          }
        } catch (e) {
          // Ignore errors
        }
      }
      if (newPasswordRef.current) {
        try {
          newPasswordRef.current.setNativeProps?.({ text: '' });
          if (Platform.OS === 'web' && newPasswordRef.current) {
            newPasswordRef.current.value = '';
          }
        } catch (e) {
          // Ignore errors
        }
      }
      if (confirmPasswordRef.current) {
        try {
          confirmPasswordRef.current.setNativeProps?.({ text: '' });
          if (Platform.OS === 'web' && confirmPasswordRef.current) {
            confirmPasswordRef.current.value = '';
          }
        } catch (e) {
          // Ignore errors
        }
      }
    }, 100);
    
    return () => clearTimeout(clearTimer);
  }, []); // Empty dependency array - runs only on mount

  const validate = () => {
    const newErrors: { 
      oldPassword?: string; 
      newPassword?: string; 
      confirmPassword?: string;
    } = {};

    if (!validators.required(oldPassword)) {
      newErrors.oldPassword = validationMessages.required;
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

  const handleChangePassword = async () => {
    // Clear previous errors
    setErrors({});
    
    if (!validate()) {
      return;
    }

    try {
      await changePassword({
        oldPassword,
        newPassword,
        confirmPassword,
      }).unwrap();

      // Show success toast
      showSuccessToast('Your password has been changed successfully. Please login again.');
      
      // Wait a moment for toast to be visible, then logout and navigate
      setTimeout(async () => {
        await logout();
        navigation.replace('Login');
      }, 1500);
    } catch (error: any) {
      // Extract error message from API response
      let errorMessage = 'Failed to change password. Please try again.';
      
      // RTK Query error structure: error.data contains the error details
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.data?.data?.message) {
        // Nested error structure
        errorMessage = error.data.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Check if it's a wrong current password error (401 or specific message)
      const isWrongPassword = error?.status === 401 || 
                              error?.data?.status === 401 ||
                              errorMessage.toLowerCase().includes('current password') ||
                              errorMessage.toLowerCase().includes('incorrect');
      
      if (isWrongPassword) {
        // Set error on current password field for clear user feedback
        setErrors({
          oldPassword: 'The current password you entered is incorrect. Please try again.',
        });
        // Also show toast for additional visibility
        showErrorToast('The current password you entered is incorrect. Please try again.');
      } else {
        // For other errors, show toast only
        showErrorToast(errorMessage);
      }
      
      // Do NOT clear password fields - user stays on screen with their input
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>Enter your current password and choose a new one</Text>
        </View>

        <View style={styles.form}>
          <Input
            ref={oldPasswordRef}
            label="Current Password"
            value={oldPassword}
            onChangeText={(text) => {
              setOldPassword(text);
              // Clear error when user starts typing
              if (errors.oldPassword) {
                setErrors({ ...errors, oldPassword: undefined });
              }
            }}
            placeholder="Enter your current password"
            secureTextEntry
            showPasswordToggle
            error={errors.oldPassword}
            autoComplete="off"
            autoCorrect={false}
            textContentType="none"
            keyboardType="default"
            autoCapitalize="none"
            importantForAutofill="no"
            name="current-password-change"
            id="current-password-change"
          />

          <Input
            ref={newPasswordRef}
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter your new password"
            secureTextEntry
            showPasswordToggle
            error={errors.newPassword}
            helperText="Must be at least 8 characters with at least one letter and one number"
            autoComplete="new-password"
            autoCorrect={false}
            textContentType="none"
            autoCapitalize="none"
            importantForAutofill="no"
            name="new-password-change"
            id="new-password-change"
          />

          <Input
            ref={confirmPasswordRef}
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your new password"
            secureTextEntry
            showPasswordToggle
            error={errors.confirmPassword}
            autoComplete="new-password"
            autoCorrect={false}
            textContentType="none"
            autoCapitalize="none"
            importantForAutofill="no"
            name="confirm-password-change"
            id="confirm-password-change"
          />

          <Button
            title="Change Password"
            onPress={handleChangePassword}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
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
});


import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { Button, Input } from '../../components/common';
import { useForgotPasswordMutation } from '../../store/api/authApi';
import { validators, validationMessages } from '../../utils/validators';
import { showSuccessToast } from '../../utils/toast';

export const ForgotPasswordScreen = ({ navigation }: any) => {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string }>({});

  const validate = () => {
    const newErrors: { email?: string } = {};

    if (!validators.required(email)) {
      newErrors.email = validationMessages.required;
    } else if (!validators.email(email)) {
      newErrors.email = validationMessages.email;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleForgotPassword = async () => {
    if (!validate()) {
      return;
    }

    try {
      await forgotPassword({ email }).unwrap();

      // Show success toast with user-friendly message
      // Auto-dismisses after 3-4 seconds (configured in toast utility)
      showSuccessToast('Password reset instructions have been sent to your email.');

      // Optionally redirect to Login screen after a short delay
      // This gives user time to see the toast message
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (error: any) {
      // Always show success message (security best practice - prevent email enumeration)
      // Do NOT reveal whether email exists or not
      showSuccessToast('Password reset instructions have been sent to your email.');

      // Optionally redirect to Login screen after a short delay
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you instructions to reset your password
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />

          <Button
            title="Send Reset Instructions"
            onPress={handleForgotPassword}
            loading={isLoading}
            fullWidth
            style={styles.submitButton}
          />

          <Button
            title="Back to Login"
            onPress={() => navigation.goBack()}
            variant="text"
            fullWidth
            style={styles.backButton}
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
  backButton: {
    marginTop: spacing.sm,
  },
});


import React, { useState } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { Button, Input } from '../../components/common';
import { useForgotPasswordMutation } from '../../store/api/authApi';
import { validators, validationMessages } from '../../utils/validators';
import { showSuccessToast } from '../../utils/toast';

export const ForgotPasswordScreen = ({ navigation }: any) => {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [username, setUsername] = useState('');
  const [errors, setErrors] = useState<{ username?: string }>({});

  const validate = () => {
    const newErrors: { username?: string } = {};
    const value = username.trim();
    if (!validators.required(value)) {
      newErrors.username = validationMessages.required;
    } else if (value.includes('@')) {
      newErrors.username = 'Enter the username, not the email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleForgotPassword = async () => {
    if (!validate()) {
      return;
    }

    try {
      await forgotPassword({ username: username.trim() }).unwrap();
      showSuccessToast('Reset password link sent to the email saved on this username.');
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (error: any) {
      Alert.alert('Could not send reset link', error?.data?.message || error?.message || 'Try again.');
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
            Enter the account username. The reset password link is sent to the email saved on that account.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            keyboardType="default"
            autoCapitalize="none"
            autoComplete="username"
            error={errors.username}
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


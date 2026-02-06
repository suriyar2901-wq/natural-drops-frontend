import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Card, Input, Button, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import {
  useGetCustomerContactNumberQuery,
  useUpdateCustomerContactNumberMutation,
  useGetCustomerSupportEmailQuery,
  useUpdateCustomerSupportEmailMutation,
} from '../../store/api/settingsApi';

const onlyDigits = (v: string) => v.replace(/[^0-9]/g, '');

export const AppSettingsScreen = () => {
  const { data: phoneData, isLoading: phoneLoading, isFetching: phoneFetching, refetch: refetchPhone } = useGetCustomerContactNumberQuery();
  const [updatePhone, { isLoading: savingPhone }] = useUpdateCustomerContactNumberMutation();
  
  const { data: emailData, isLoading: emailLoading, isFetching: emailFetching, refetch: refetchEmail } = useGetCustomerSupportEmailQuery();
  const [updateEmail, { isLoading: savingEmail }] = useUpdateCustomerSupportEmailMutation();

  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  useEffect(() => {
    if (typeof phoneData === 'string') {
      setPhone(onlyDigits(phoneData));
    }
  }, [phoneData]);

  useEffect(() => {
    if (typeof emailData === 'string') {
      setEmail(emailData);
    }
  }, [emailData]);

  const phoneError = useMemo(() => {
    if (!phoneTouched) return '';
    const d = onlyDigits(phone);
    if (!d) return 'Phone number is required';
    if (d.length !== 10) return 'Phone number must be 10 digits';
    return '';
  }, [phone, phoneTouched]);

  const emailError = useMemo(() => {
    if (!emailTouched) return '';
    const trimmed = email.trim();
    if (!trimmed) return 'Email is required';
    const emailRegex = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(trimmed)) return 'Invalid email format';
    return '';
  }, [email, emailTouched]);

  const handleSavePhone = async () => {
    setPhoneTouched(true);
    const digits = onlyDigits(phone);
    if (digits.length !== 10) {
      Alert.alert('Invalid Phone', 'Customer Contact Number must be exactly 10 digits.');
      return;
    }
    try {
      await updatePhone({ phone: digits }).unwrap();
      Alert.alert('Success', 'Customer contact number updated successfully.');
      refetchPhone();
    } catch (e: any) {
      Alert.alert('Failed', e?.data?.message || e?.message || 'Failed to update customer contact number.');
    }
  };

  const handleSaveEmail = async () => {
    setEmailTouched(true);
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Invalid Email', 'Customer Support Email is required.');
      return;
    }
    const emailRegex = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    try {
      await updateEmail({ email: trimmed }).unwrap();
      Alert.alert('Success', 'Customer support email updated successfully.');
      refetchEmail();
    } catch (e: any) {
      Alert.alert('Failed', e?.data?.message || e?.message || 'Failed to update customer support email.');
    }
  };

  const isLoading = phoneLoading || emailLoading;
  const isSaving = savingPhone || savingEmail;
  const isFetching = phoneFetching || emailFetching;

  if (isLoading) {
    return <Loading fullScreen message="Loading settings..." />;
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>App Settings</Text>
        <Text style={styles.subtitle}>Manage app-wide settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Support Phone Number</Text>
          <Text style={styles.sectionHint}>
            This number will be shown in the buyer app header as the customer support call button.
          </Text>

          <Input
            label="Customer Support Phone Number"
            value={phone}
            onChangeText={(t) => {
              setPhoneTouched(true);
              setPhone(onlyDigits(t).slice(0, 10));
            }}
            keyboardType="numeric"
            placeholder="Enter 10-digit number"
            error={phoneError}
          />

          <Button
            title={savingPhone ? 'Saving…' : 'Save Phone'}
            onPress={handleSavePhone}
            loading={savingPhone}
            fullWidth
            style={styles.saveButton}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Support Email ID</Text>
          <Text style={styles.sectionHint}>
            This email will be shown in the buyer app for customer support contact.
          </Text>

          <Input
            label="Customer Support Email ID"
            value={email}
            onChangeText={(t) => {
              setEmailTouched(true);
              setEmail(t);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="support@example.com"
            error={emailError}
          />

          <Button
            title={savingEmail ? 'Saving…' : 'Save Email'}
            onPress={handleSaveEmail}
            loading={savingEmail}
            fullWidth
            style={styles.saveButton}
          />
        </View>

        {(isFetching || isSaving) && (
          <Text style={styles.helperText}>Updating…</Text>
        )}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  card: {
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  section: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  helperText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  saveButton: {
    marginTop: spacing.md,
  },
});



import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, Input, Button, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import {
  useGetCustomerContactNumberQuery,
  useUpdateCustomerContactNumberMutation,
  useGetCustomerSupportEmailQuery,
  useUpdateCustomerSupportEmailMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from '../../store/api/settingsApi';

const onlyDigits = (v: string) => v.replace(/[^0-9]/g, '');

export const AppSettingsScreen = () => {
  const { data: phoneData, isLoading: phoneLoading, isFetching: phoneFetching, refetch: refetchPhone } = useGetCustomerContactNumberQuery();
  const [updatePhone, { isLoading: savingPhone }] = useUpdateCustomerContactNumberMutation();
  
  const { data: emailData, isLoading: emailLoading, isFetching: emailFetching, refetch: refetchEmail } = useGetCustomerSupportEmailQuery();
  const [updateEmail, { isLoading: savingEmail }] = useUpdateCustomerSupportEmailMutation();
  const { data: allSettings } = useGetSettingsQuery();
  const [updateSettings, { isLoading: savingPlatform }] = useUpdateSettingsMutation();

  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [adminName, setAdminName] = useState('Platform Admin');
  const [adminMobile, setAdminMobile] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportWhatsapp, setSupportWhatsapp] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [notifyActivation, setNotifyActivation] = useState(true);
  const [notifyPayments, setNotifyPayments] = useState(true);
  const [notifyFailedPayments, setNotifyFailedPayments] = useState(true);
  const [notifyExpiry, setNotifyExpiry] = useState(true);

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

  useEffect(() => {
    if (!allSettings) return;
    setAdminName(allSettings.adminName || 'Platform Admin');
    setAdminMobile(onlyDigits(allSettings.adminMobile || ''));
    setAdminEmail(allSettings.adminEmail || '');
    setSupportPhone(onlyDigits(allSettings.supportPhone || ''));
    setSupportWhatsapp(onlyDigits(allSettings.supportWhatsapp || ''));
    setSupportEmail(allSettings.supportEmail || '');
    setNotifyActivation(allSettings.notifyActivation !== 'false');
    setNotifyPayments(allSettings.notifyPayments !== 'false');
    setNotifyFailedPayments(allSettings.notifyFailedPayments !== 'false');
    setNotifyExpiry(allSettings.notifyExpiry !== 'false');
  }, [allSettings]);

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
  const handleSavePlatform = async (payload: Record<string, string>, success: string) => {
    try {
      await updateSettings(payload).unwrap();
      Alert.alert('Success', success);
    } catch (e: any) {
      Alert.alert('Failed', e?.data?.message || e?.message || 'Could not save settings');
    }
  };

  const isSaving = savingPhone || savingEmail || savingPlatform;
  const isFetching = phoneFetching || emailFetching;

  if (isLoading) {
    return <Loading fullScreen message="Loading settings..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
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

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Admin Profile</Text>
        <Input label="Admin name *" value={adminName} onChangeText={setAdminName} />
        <Input label="Admin mobile *" value={adminMobile} onChangeText={(t) => setAdminMobile(onlyDigits(t).slice(0, 10))} keyboardType="numeric" />
        <Input label="Admin email *" value={adminEmail} onChangeText={setAdminEmail} keyboardType="email-address" autoCapitalize="none" />
        <Button
          title="Save Profile"
          onPress={() => {
            if (adminName.trim().length < 2 || onlyDigits(adminMobile).length !== 10) {
              Alert.alert('Invalid Profile', 'Name and a 10-digit mobile are required.');
              return;
            }
            handleSavePlatform({ adminName: adminName.trim(), adminMobile, adminEmail: adminEmail.trim() }, 'Admin profile saved.');
          }}
          loading={savingPlatform}
          fullWidth
          style={styles.saveButton}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Seller Help Contacts</Text>
        <Text style={styles.sectionHint}>Shown as platform support for sellers.</Text>
        <Input label="Support phone" value={supportPhone} onChangeText={(t) => setSupportPhone(onlyDigits(t).slice(0, 10))} keyboardType="numeric" />
        <Input label="WhatsApp" value={supportWhatsapp} onChangeText={(t) => setSupportWhatsapp(onlyDigits(t).slice(0, 10))} keyboardType="numeric" />
        <Input label="Support email" value={supportEmail} onChangeText={setSupportEmail} keyboardType="email-address" autoCapitalize="none" />
        <Button
          title="Save Support Contacts"
          onPress={() => handleSavePlatform({
            supportPhone,
            supportWhatsapp,
            supportEmail: supportEmail.trim(),
          }, 'Support contacts saved.')}
          loading={savingPlatform}
          fullWidth
          style={styles.saveButton}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Subscription Plans</Text>
        <Text style={styles.sectionHint}>Reference prices used for new sellers and renewals. Tax treatment: pending.</Text>
        <Text style={styles.planLine}>Monthly — ₹499.00 / month</Text>
        <Text style={styles.planLine}>Yearly — ₹5,389.20 / year (10% off ₹5,988.00)</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        <ToggleRow label="Seller Activation" value={notifyActivation} onPress={() => setNotifyActivation(!notifyActivation)} />
        <ToggleRow label="Subscription Payments" value={notifyPayments} onPress={() => setNotifyPayments(!notifyPayments)} />
        <ToggleRow label="Failed Payments" value={notifyFailedPayments} onPress={() => setNotifyFailedPayments(!notifyFailedPayments)} />
        <ToggleRow label="Subscription Expiry / Expired" value={notifyExpiry} onPress={() => setNotifyExpiry(!notifyExpiry)} />
        <Text style={styles.sectionHint}>Seller dashboard shows a 5-day expiry reminder. After they renew, that reminder is cleared.</Text>
        <Button
          title="Save Notifications"
          onPress={() => handleSavePlatform({
            notifyActivation: String(notifyActivation),
            notifyPayments: String(notifyPayments),
            notifyFailedPayments: String(notifyFailedPayments),
            notifyExpiry: String(notifyExpiry),
            notifySevenDayReminder: 'true',
          }, 'Notification preferences saved.')}
          loading={savingPlatform}
          fullWidth
          style={styles.saveButton}
        />
      </Card>
    </ScrollView>
  );
};

const ToggleRow = ({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) => (
  <TouchableOpacity style={styles.toggleRow} onPress={onPress}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <Text style={styles.toggleValue}>{value ? 'On' : 'Off'}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    padding: spacing.lg,
    marginBottom: spacing.md,
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
  planLine: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  toggleLabel: {
    color: colors.textPrimary,
  },
  toggleValue: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
});



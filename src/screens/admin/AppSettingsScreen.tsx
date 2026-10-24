import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const [expiryReminderDays, setExpiryReminderDays] = useState('5');
  const [subscriptionRequired, setSubscriptionRequired] = useState(true);
  const [monthlyAmount, setMonthlyAmount] = useState('499.00');
  const [yearlyAmount, setYearlyAmount] = useState('5389.20');
  const [daysOpen, setDaysOpen] = useState(false);
  const [editing, setEditing] = useState<'phone' | 'email' | 'profile' | 'support' | 'subscription' | 'notify' | null>(null);
  const snapshot = useRef<Record<string, string | boolean> | null>(null);

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
    setExpiryReminderDays(allSettings.expiryReminderDays || '5');
    setSubscriptionRequired(allSettings.subscriptionRequired !== 'false');
    setMonthlyAmount(allSettings.planMonthlyAmount || '499.00');
    setYearlyAmount(allSettings.planYearlyAmount || '5389.20');
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

  const currentValues = () => ({
    phone, email, adminName, adminMobile, adminEmail, supportPhone, supportWhatsapp, supportEmail,
    notifyActivation, notifyPayments, notifyFailedPayments, notifyExpiry, expiryReminderDays, subscriptionRequired,
    monthlyAmount, yearlyAmount,
  });

  const beginEdit = (section: NonNullable<typeof editing>) => {
    snapshot.current = currentValues();
    setDaysOpen(false);
    setEditing(section);
  };

  const cancelEdit = () => {
    const saved = snapshot.current;
    if (saved) {
      setPhone(String(saved.phone || ''));
      setEmail(String(saved.email || ''));
      setAdminName(String(saved.adminName || ''));
      setAdminMobile(String(saved.adminMobile || ''));
      setAdminEmail(String(saved.adminEmail || ''));
      setSupportPhone(String(saved.supportPhone || ''));
      setSupportWhatsapp(String(saved.supportWhatsapp || ''));
      setSupportEmail(String(saved.supportEmail || ''));
      setNotifyActivation(saved.notifyActivation !== false);
      setNotifyPayments(saved.notifyPayments !== false);
      setNotifyFailedPayments(saved.notifyFailedPayments !== false);
      setNotifyExpiry(saved.notifyExpiry !== false);
      setExpiryReminderDays(String(saved.expiryReminderDays || '5'));
      setSubscriptionRequired(saved.subscriptionRequired !== false);
      setMonthlyAmount(String(saved.monthlyAmount || '499.00'));
      setYearlyAmount(String(saved.yearlyAmount || '5389.20'));
    }
    setDaysOpen(false);
    setEditing(null);
  };

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
      setEditing(null);
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
      setEditing(null);
      refetchEmail();
    } catch (e: any) {
      Alert.alert('Failed', e?.data?.message || e?.message || 'Failed to update customer support email.');
    }
  };

  const isLoading = phoneLoading || emailLoading;
  const handleSavePlatform = async (payload: Record<string, string>, success: string) => {
    try {
      await updateSettings(payload).unwrap();
      setEditing(null);
      setDaysOpen(false);
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
        <Text style={styles.subtitle}>Details stay locked. Click Edit, change the values, then Save.</Text>

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
            editable={editing === 'phone'}
          />

          <SectionActions
            editing={editing === 'phone'}
            saveTitle={savingPhone ? 'Saving…' : 'Save'}
            loading={savingPhone}
            onEdit={() => beginEdit('phone')}
            onCancel={cancelEdit}
            onSave={handleSavePhone}
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
            editable={editing === 'email'}
          />

          <SectionActions
            editing={editing === 'email'}
            saveTitle={savingEmail ? 'Saving…' : 'Save'}
            loading={savingEmail}
            onEdit={() => beginEdit('email')}
            onCancel={cancelEdit}
            onSave={handleSaveEmail}
          />
        </View>

        {(isFetching || isSaving) && (
          <Text style={styles.helperText}>Updating…</Text>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Admin Profile</Text>
        <Input label="Admin name *" value={adminName} onChangeText={setAdminName} editable={editing === 'profile'} />
        <Input label="Admin mobile *" value={adminMobile} onChangeText={(t) => setAdminMobile(onlyDigits(t).slice(0, 10))} keyboardType="numeric" editable={editing === 'profile'} />
        <Input label="Admin email *" value={adminEmail} onChangeText={setAdminEmail} keyboardType="email-address" autoCapitalize="none" editable={editing === 'profile'} />
        <SectionActions
          editing={editing === 'profile'}
          saveTitle="Save"
          loading={savingPlatform}
          onEdit={() => beginEdit('profile')}
          onCancel={cancelEdit}
          onSave={() => {
            if (adminName.trim().length < 2 || onlyDigits(adminMobile).length !== 10) {
              Alert.alert('Invalid Profile', 'Name and a 10-digit mobile are required.');
              return;
            }
            handleSavePlatform({ adminName: adminName.trim(), adminMobile, adminEmail: adminEmail.trim() }, 'Admin profile saved.');
          }}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Seller Help Contacts</Text>
        <Text style={styles.sectionHint}>Shown as platform support for sellers.</Text>
        <Input label="Support phone" value={supportPhone} onChangeText={(t) => setSupportPhone(onlyDigits(t).slice(0, 10))} keyboardType="numeric" editable={editing === 'support'} />
        <Input label="WhatsApp" value={supportWhatsapp} onChangeText={(t) => setSupportWhatsapp(onlyDigits(t).slice(0, 10))} keyboardType="numeric" editable={editing === 'support'} />
        <Input label="Support email" value={supportEmail} onChangeText={setSupportEmail} keyboardType="email-address" autoCapitalize="none" editable={editing === 'support'} />
        <SectionActions
          editing={editing === 'support'}
          saveTitle="Save"
          loading={savingPlatform}
          onEdit={() => beginEdit('support')}
          onCancel={cancelEdit}
          onSave={() => handleSavePlatform({
            supportPhone,
            supportWhatsapp,
            supportEmail: supportEmail.trim(),
          }, 'Support contacts saved.')}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Subscription Plans</Text>
        <Text style={styles.sectionHint}>On: only a seller with an active subscription can work. Off: a seller can work without subscribing, and a new seller will not see the subscription popup.</Text>
        <ToggleRow label="Subscription required" value={subscriptionRequired} disabled={editing !== 'subscription'} onPress={() => setSubscriptionRequired(!subscriptionRequired)} />
        <Input
          label="Monthly amount (₹)"
          value={monthlyAmount}
          editable={editing === 'subscription'}
          keyboardType="decimal-pad"
          onChangeText={(text) => setMonthlyAmount(text.replace(/[^0-9.]/g, ''))}
        />
        <Input
          label="Yearly amount (₹)"
          value={yearlyAmount}
          editable={editing === 'subscription'}
          keyboardType="decimal-pad"
          onChangeText={(text) => setYearlyAmount(text.replace(/[^0-9.]/g, ''))}
        />
        <SectionActions
          editing={editing === 'subscription'}
          saveTitle="Save"
          loading={savingPlatform}
          onEdit={() => beginEdit('subscription')}
          onCancel={cancelEdit}
          onSave={() => {
            const monthly = Number(monthlyAmount);
            const yearly = Number(yearlyAmount);
            if (!monthly || monthly <= 0 || !yearly || yearly <= 0) {
              Alert.alert('Invalid amount', 'Enter a monthly and yearly amount greater than 0.');
              return;
            }
            handleSavePlatform({
              subscriptionRequired: String(subscriptionRequired),
              planMonthlyAmount: monthly.toFixed(2),
              planYearlyAmount: yearly.toFixed(2),
            }, 'Subscription plan saved.');
          }}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        <ToggleRow label="Seller Activation" value={notifyActivation} disabled={editing !== 'notify'} onPress={() => setNotifyActivation(!notifyActivation)} />
        <ToggleRow label="Subscription Payments" value={notifyPayments} disabled={editing !== 'notify'} onPress={() => setNotifyPayments(!notifyPayments)} />
        <ToggleRow label="Failed Payments" value={notifyFailedPayments} disabled={editing !== 'notify'} onPress={() => setNotifyFailedPayments(!notifyFailedPayments)} />
        <ToggleRow label="Subscription Expiry / Expired" value={notifyExpiry} disabled={editing !== 'notify'} onPress={() => setNotifyExpiry(!notifyExpiry)} />
        <Text style={styles.sectionHint}>Choose how many days before expiry the seller dashboard shows the reminder. After they renew, that reminder is cleared.</Text>
        <Text style={styles.toggleLabel}>Remind before expiry</Text>
        <TouchableOpacity style={styles.dayButton} disabled={editing !== 'notify'} onPress={() => editing === 'notify' && setDaysOpen((open) => !open)}>
          <Text style={styles.dayValue}>{expiryReminderDays} days</Text>
          <Text style={styles.dayCaret}>{daysOpen ? '▴' : '▾'}</Text>
        </TouchableOpacity>
        {daysOpen && (
          <View style={styles.dayMenu}>
            {['1', '2', '3', '5', '7', '10', '15', '30'].map((days) => (
              <TouchableOpacity
                key={days}
                style={styles.dayOption}
                onPress={() => {
                  setExpiryReminderDays(days);
                  setDaysOpen(false);
                }}
              >
                <Text style={days === expiryReminderDays ? styles.dayOptionActive : styles.toggleLabel}>{days} days</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <SectionActions
          editing={editing === 'notify'}
          saveTitle="Save"
          loading={savingPlatform}
          onEdit={() => beginEdit('notify')}
          onCancel={cancelEdit}
          onSave={() => handleSavePlatform({
            notifyActivation: String(notifyActivation),
            notifyPayments: String(notifyPayments),
            notifyFailedPayments: String(notifyFailedPayments),
            notifyExpiry: String(notifyExpiry),
            expiryReminderDays,
          }, 'Notification preferences saved.')}
        />
      </Card>
    </ScrollView>
  );
};

const ToggleRow = ({ label, value, onPress, disabled }: { label: string; value: boolean; onPress: () => void; disabled?: boolean }) => (
  <TouchableOpacity style={styles.toggleRow} disabled={disabled} onPress={onPress}>
    <Text style={[styles.toggleLabel, disabled && styles.lockedText]}>{label}</Text>
    <Text style={styles.toggleValue}>{value ? 'On' : 'Off'}</Text>
  </TouchableOpacity>
);

const SectionActions = ({
  editing,
  saveTitle,
  loading,
  onEdit,
  onCancel,
  onSave,
}: {
  editing: boolean;
  saveTitle: string;
  loading?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) => (
  editing ? (
    <View style={styles.actionRow}>
      <Button title="Cancel" variant="outline" onPress={onCancel} style={styles.actionButton} />
      <Button title={saveTitle} onPress={onSave} loading={loading} style={styles.actionButton} />
    </View>
  ) : (
    <TouchableOpacity style={styles.editButton} onPress={onEdit}>
      <Text style={styles.editButtonText}>Edit</Text>
    </TouchableOpacity>
  )
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
  editButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  editButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  lockedText: {
    color: colors.textSecondary,
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
  dayButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  dayValue: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  dayCaret: { color: colors.textSecondary },
  dayMenu: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginBottom: spacing.sm },
  dayOption: { paddingHorizontal: spacing.md, paddingVertical: 10 },
  dayOptionActive: { color: colors.primary, fontWeight: typography.fontWeight.bold },
  toggleValue: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
});



import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Button } from '../../components/common';
import { borderRadius, colors, typography, spacing } from '../../theme';

export const SuggestionLetterScreen = ({ navigation }: any) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      // Handle success
      setSubject('');
      setMessage('');
    }, 1000);
  };

  const isFormValid = subject.trim().length > 0 && message.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {/* Content Container with Clean White Background */}
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Suggestion Letter</Text>
            <Text style={styles.headerSubtitle}>
              Share your feedback and suggestions with us
            </Text>
          </View>

          {/* Main Content Card */}
          <View style={styles.card}>
            <View style={styles.form}>
              {/* Subject Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Subject *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter subject"
                placeholderTextColor="#666666"
                value={subject}
                onChangeText={setSubject}
                maxLength={100}
              />
              </View>

              {/* Message Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Message *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write your suggestion or feedback here..."
                placeholderTextColor="#666666"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                maxLength={1000}
              />
                <Text style={styles.characterCount}>
                  {message.length} / 1000 characters
                </Text>
              </View>

              {/* Info Section */}
              <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>Tips</Text>
                <Text style={styles.infoText}>
                  • Be specific and clear in your suggestions{'\n'}
                  • Include relevant details that can help us improve{'\n'}
                  • Your feedback is valuable to us
                </Text>
              </View>

              {/* Submit Button */}
              <View style={styles.buttonContainer}>
                <Button
                  title="Submit Suggestion"
                  onPress={handleSubmit}
                  disabled={!isFormValid || isSubmitting}
                  loading={isSubmitting}
                  style={styles.submitButton}
                  fullWidth
                />
              </View>
            </View>
          </View>
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
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  // Content Container - Black background with white text
  contentContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    minHeight: '100%',
  },
  header: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.fontSize.titleLg,
    lineHeight: typography.lineHeight.titleLg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.body,
    fontWeight: typography.fontWeight.medium,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 0,
    padding: 0,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.bodySm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.gray100,
    minHeight: 52,
    fontWeight: typography.fontWeight.normal,
  },
  textArea: {
    minHeight: 150,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
    backgroundColor: colors.gray100,
    color: colors.textPrimary,
  },
  characterCount: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'right',
    fontWeight: typography.fontWeight.medium,
  },
  infoSection: {
    backgroundColor: colors.blue50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.bodySm,
    fontWeight: typography.fontWeight.normal,
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minHeight: 52,
    paddingVertical: spacing.md,
  },
});


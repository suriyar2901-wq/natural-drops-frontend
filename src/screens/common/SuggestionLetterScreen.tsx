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
import { comfortableColors } from '../../theme/comfortableColors';
import { typography, spacing } from '../../theme';

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
                <Text style={styles.infoTitle}>💡 Tips</Text>
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
    backgroundColor: '#000000', // Black background
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#000000', // Black background
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  // Content Container - Black background with white text
  contentContainer: {
    backgroundColor: '#000000', // Black background
    borderRadius: 16,
    padding: spacing.lg,
    minHeight: '100%',
  },
  header: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#333333', // Dark gray border
  },
  headerTitle: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF', // White text
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.base,
    color: '#E5E5E5', // Light gray text
    lineHeight: 22,
    fontWeight: typography.fontWeight.medium,
  },
  card: {
    backgroundColor: '#000000', // Black background
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
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#FFFFFF', // White text
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#333333', // Dark gray border
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: '#FFFFFF', // White text
    backgroundColor: '#1A1A1A', // Dark gray background for inputs
    minHeight: 48,
    fontWeight: typography.fontWeight.normal,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    } as any),
  },
  textArea: {
    minHeight: 150,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
    backgroundColor: '#1A1A1A', // Dark gray background
    color: '#FFFFFF', // White text
  },
  characterCount: {
    fontSize: typography.fontSize.sm,
    color: '#B0B0B0', // Light gray text
    marginTop: spacing.xs,
    textAlign: 'right',
    fontWeight: typography.fontWeight.medium,
  },
  infoSection: {
    backgroundColor: '#1A1A1A', // Dark gray background
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5', // Indigo accent
  },
  infoTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF', // White text
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: '#E5E5E5', // Light gray text
    lineHeight: 22,
    fontWeight: typography.fontWeight.normal,
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
  submitButton: {
    backgroundColor: '#4F46E5', // Indigo button
    borderRadius: 8,
    paddingVertical: spacing.md,
    ...(Platform.OS !== 'web' && {
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    }),
    ...(Platform.OS === 'web' && {
      boxShadow: `0 2px 8px rgba(79, 70, 229, 0.4)`,
    } as any),
  },
});


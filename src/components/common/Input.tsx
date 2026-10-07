import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ViewStyle, TextInputProps } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  containerStyle,
  secureTextEntry,
  showPasswordToggle = false,
  ...textInputProps
}, ref) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = React.useRef<TextInput>(null);

  // Expose ref methods
  useImperativeHandle(ref, () => inputRef.current as TextInput);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        <TextInput
          {...textInputProps}
          ref={inputRef}
          style={[
            styles.input,
            isFocused && styles.inputFocused,
            error && styles.inputError,
            showPasswordToggle && styles.inputWithToggle,
          ]}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          placeholderTextColor={colors.textSecondary}
        />
        {showPasswordToggle && secureTextEntry && (
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={togglePasswordVisibility}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            <Text style={styles.passwordToggleText}>{isPasswordVisible ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.bodySm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.space12,
    minHeight: 52,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.body,
    color: colors.textPrimary,
    backgroundColor: colors.gray100,
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputWithToggle: {
    paddingRight: spacing.xl + spacing.lg,
  },
  passwordToggle: {
    position: 'absolute',
    right: spacing.sm,
    top: 0,
    bottom: 0,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordToggleText: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  error: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
});


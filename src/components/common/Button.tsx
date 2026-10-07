import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const blocked = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      onPress={onPress}
      disabled={blocked}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.button,
        size === 'small' ? styles.buttonSmall : styles.buttonDefault,
        fullWidth && styles.fullWidth,
        surfaceStyle(variant, pressed, !!hovered, disabled),
        style,
      ]}
    >
      <View style={styles.content}>
        {loading && (
          <ActivityIndicator color={variant === 'primary' && !disabled ? colors.white : colors.primary} />
        )}
        <Text style={[styles.text, size === 'small' && styles.textSmall, labelStyle(variant, disabled), textStyle]}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
};

const surfaceStyle = (variant: string, pressed: boolean, hovered: boolean, disabled: boolean): ViewStyle => {
  if (disabled) {
    return { backgroundColor: colors.gray200 };
  }
  if (variant === 'secondary') {
    return { backgroundColor: pressed || hovered ? '#D5DEF4' : colors.blue100 };
  }
  if (variant === 'outline') {
    return {
      backgroundColor: pressed || hovered ? colors.blue50 : 'transparent',
      borderWidth: 2,
      borderColor: colors.primary,
    };
  }
  if (variant === 'text') {
    return { backgroundColor: pressed || hovered ? colors.blue50 : 'transparent' };
  }
  return { backgroundColor: pressed ? colors.primaryDark : hovered ? colors.primaryLight : colors.primary };
};

const labelStyle = (variant: string, disabled: boolean): TextStyle => {
  if (disabled) return { color: colors.textSecondary };
  if (variant === 'primary') return { color: colors.white };
  return { color: colors.primary };
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as object : {}),
  },
  buttonDefault: {
    minHeight: 52,
  },
  buttonSmall: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  text: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.button,
    fontWeight: typography.fontWeight.semibold,
  },
  textSmall: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.bodySm,
  },
});

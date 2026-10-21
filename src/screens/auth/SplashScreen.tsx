import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { useAuth } from '../../hooks';
import { WaterDropLoader } from '../../components/common/WaterDropLoader';

export const SplashScreen = () => {
  const { checkAuth, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Navigation is handled by AppNavigator based on auth state
  }, [isAuthenticated, isLoading]);

  return (
    <View style={styles.container} accessibilityLabel="Thanni Can loading">
      <View style={styles.glow} pointerEvents="none" />
      <WaterDropLoader size="large" style={styles.loader} />
      <Text style={styles.title}>Thanni Can</Text>
      <Text style={styles.subtitle}>Fresh water, on the way</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: spacing.xl,
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(2, 50, 170, 0.06)',
    ...(Platform.OS === 'web'
      ? ({ filter: 'blur(40px)' } as any)
      : null),
  },
  loader: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    letterSpacing: -0.4,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
});

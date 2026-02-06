import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { useAuth } from '../../hooks';

export const SplashScreen = () => {
  const { checkAuth, isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Navigation will be handled by AppNavigator based on auth state
  }, [isAuthenticated, isLoading]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Natural Drops</Text>
      <Text style={styles.subtitle}>Pure Water Delivery</Text>
      <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.white,
    marginBottom: spacing.xl,
  },
  loader: {
    marginTop: spacing.xl,
  },
});


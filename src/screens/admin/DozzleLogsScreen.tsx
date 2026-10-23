import React from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Loading } from '../../components/common';
import { borderRadius, colors, spacing, typography } from '../../theme';
import { useGetDozzleLogsConfigQuery, useGetSettingsQuery } from '../../store/api/settingsApi';
import { showErrorAlert } from '../../utils/alert';

/**
 * Admin screen to open Dozzle (Docker log viewer) for backend + frontend containers.
 */
export const DozzleLogsScreen = () => {
  const { data, isLoading, isError, refetch, isFetching } = useGetDozzleLogsConfigQuery();
  const { data: settings } = useGetSettingsQuery();

  const envOverride = (process.env.EXPO_PUBLIC_DOZZLE_URL || '').trim();
  const dozzleUrl = envOverride || data?.dozzleUrl || settings?.dozzleUrl || 'http://localhost:8082';

  const openDozzle = async () => {
    const url = (dozzleUrl || '').trim();
    if (!url) {
      showErrorAlert('Dozzle URL is not configured. Set it in App Settings or DOZZLE_URL.');
      return;
    }
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
      const can = await Linking.canOpenURL(url);
      if (!can) {
        showErrorAlert(`Cannot open ${url}. Check that Dozzle is running.`);
        return;
      }
      await Linking.openURL(url);
    } catch {
      showErrorAlert('Could not open Dozzle. Is docker compose up and Dozzle on port 8082?');
    }
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading log viewer config..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.title}>Live Logs (Dozzle)</Text>
        <Text style={styles.subtitle}>
          Watch backend and frontend Docker container logs in real time. Use this when live users hit errors.
        </Text>

        {isError && (
          <Text style={styles.warn}>
            Could not load config from API. Using default / settings URL below.
          </Text>
        )}

        <View style={styles.row}>
          <Text style={styles.label}>Dozzle URL</Text>
          <Text style={styles.value} selectable>
            {dozzleUrl}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Backend container</Text>
          <Text style={styles.value}>{data?.services?.backend || 'natural-drops-backend'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Frontend container</Text>
          <Text style={styles.value}>{data?.services?.frontend || 'natural-drops-frontend'}</Text>
        </View>

        <Button
          title="Open Dozzle Logs"
          onPress={openDozzle}
          fullWidth
          style={styles.openBtn}
        />
        <Button
          title={isFetching ? 'Refreshing…' : 'Refresh config'}
          variant="outline"
          onPress={() => refetch()}
          fullWidth
          style={styles.refreshBtn}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>How to run</Text>
        <Text style={styles.step}>1. In Natural-Drops folder: docker compose up -d --build</Text>
        <Text style={styles.step}>2. Open Dozzle at http://localhost:8082 (or your live DOZZLE_URL)</Text>
        <Text style={styles.step}>3. Select natural-drops-backend for API errors</Text>
        <Text style={styles.step}>4. Filter / search for ERROR or Exception</Text>
        <Text style={styles.hint}>
          Tip: Change Dozzle URL anytime under More → App Settings → Dozzle logs.
        </Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { padding: spacing.lg, marginBottom: spacing.md },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
  warn: {
    color: colors.error,
    marginBottom: spacing.sm,
    fontSize: typography.fontSize.sm,
  },
  row: { marginBottom: spacing.sm },
  label: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  value: {
    marginTop: 2,
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  openBtn: { marginTop: spacing.md },
  refreshBtn: { marginTop: spacing.sm },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  step: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  hint: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
  },
});

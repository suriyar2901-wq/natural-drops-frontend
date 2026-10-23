import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Loading } from '../../components/common';
import { borderRadius, colors, spacing, typography } from '../../theme';
import { useGetDozzleLogsConfigQuery, useGetSettingsQuery } from '../../store/api/settingsApi';
import { useAuth } from '../../hooks';
import { showErrorAlert } from '../../utils/alert';

const DEFAULT_DOZZLE = 'http://localhost:8082';

/**
 * Dozzle live logs page.
 * Web deep link: https://natural-drops-frontend.vercel.app/Logs
 */
export const DozzleLogsScreen = () => {
  const { isAuthenticated } = useAuth();
  const envOverride = (process.env.EXPO_PUBLIC_DOZZLE_URL || '').trim();

  const { data, isLoading, isError, refetch, isFetching } = useGetDozzleLogsConfigQuery(undefined, {
    skip: !isAuthenticated,
  });
  const { data: settings } = useGetSettingsQuery(undefined, { skip: !isAuthenticated });

  const dozzleUrl = useMemo(
    () => envOverride || data?.dozzleUrl || settings?.dozzleUrl || DEFAULT_DOZZLE,
    [envOverride, data?.dozzleUrl, settings?.dozzleUrl]
  );

  const [embedFailed, setEmbedFailed] = useState(false);
  const canEmbed =
    Platform.OS === 'web' &&
    !!dozzleUrl &&
    !dozzleUrl.includes('localhost') &&
    !embedFailed;

  useEffect(() => {
    setEmbedFailed(false);
  }, [dozzleUrl]);

  const openDozzle = async () => {
    const url = (dozzleUrl || '').trim();
    if (!url) {
      showErrorAlert('Dozzle URL is not configured. Set EXPO_PUBLIC_DOZZLE_URL or App Settings.');
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
      showErrorAlert('Could not open Dozzle. Check DOZZLE_URL / EXPO_PUBLIC_DOZZLE_URL.');
    }
  };

  if (isAuthenticated && isLoading && !envOverride) {
    return <Loading fullScreen message="Loading log viewer config..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <Card style={styles.card}>
          <Text style={styles.title}>Live Logs (Dozzle)</Text>
          <Text style={styles.subtitle}>
            Open this page at /Logs to watch backend and frontend container logs. Configure the Dozzle
            host with EXPO_PUBLIC_DOZZLE_URL (Vercel) or App Settings → Dozzle logs.
          </Text>

          {isError && isAuthenticated && (
            <Text style={styles.warn}>API config failed — using env / default URL below.</Text>
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

          <Button title="Open Dozzle in new tab" onPress={openDozzle} fullWidth style={styles.openBtn} />
          {isAuthenticated && (
            <Button
              title={isFetching ? 'Refreshing…' : 'Refresh config'}
              variant="outline"
              onPress={() => refetch()}
              fullWidth
              style={styles.refreshBtn}
            />
          )}
        </Card>

        {Platform.OS === 'web' && !canEmbed && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>How to see live Dozzle here</Text>
            <Text style={styles.step}>1. Run Dozzle on your server (docker compose)</Text>
            <Text style={styles.step}>2. Set Vercel env EXPO_PUBLIC_DOZZLE_URL=https://your-dozzle-host</Text>
            <Text style={styles.step}>3. Redeploy frontend, then open /Logs again</Text>
            <Text style={styles.hint}>
              Localhost Dozzle cannot be embedded from Vercel — use “Open Dozzle in new tab” or a public Dozzle URL.
            </Text>
          </Card>
        )}
      </ScrollView>

      {canEmbed && (
        <View style={styles.embedWrap}>
          {/* @ts-expect-error web iframe */}
          <iframe
            title="Dozzle logs"
            src={dozzleUrl}
            style={{ border: 'none', width: '100%', height: '100%', minHeight: 480 }}
            onError={() => setEmbedFailed(true)}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 0 },
  content: { padding: spacing.md, paddingBottom: spacing.md },
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
  embedWrap: {
    flex: 1,
    minHeight: 480,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
});

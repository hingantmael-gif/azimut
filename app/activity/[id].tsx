import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import { ActivityRouteMap } from '../../src/ui/ActivityRouteMap';
import { formatDuration, formatPace } from '../../src/engines/core';
import {
  PLAN_MATCH_TITLE,
  planMatchDetailLines,
  planMatchExplanation,
  planMatchHeadline,
} from '../../src/engines/compliancePresentation';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { PrimaryButton } from '../../src/ui/primitives';
import { AppScrollView } from '../../src/ui/scrolling';

/** Détail activité — carte GPS, FC, allure, fidélité au plan */
export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const activityId = typeof id === 'string' ? decodeURIComponent(id) : '';
  const activity = state.activities.find(
    (a) => a.id === activityId || a.id === id,
  );
  const analysis = state.analyses.find((x) => x.activityId === activity?.id);

  if (!activity) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Activité introuvable</Text>
        <PrimaryButton
          label="Retour à l’accueil"
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    );
  }

  const pace =
    activity.avgPaceSecPerKm ??
    (activity.distanceM > 0
      ? activity.movingSec / (activity.distanceM / 1000)
      : undefined);
  const hrSeries = activity.streams?.heartrate ?? [];
  const avgHr =
    activity.avgHr ??
    (hrSeries.length
      ? Math.round(hrSeries.reduce((s, v) => s + v, 0) / hrSeries.length)
      : undefined);
  const maxHr =
    activity.maxHr ?? (hrSeries.length ? Math.max(...hrSeries) : undefined);
  const altSeries = activity.streams?.altitude ?? [];
  let elevationGain: number | undefined;
  if (altSeries.length > 1) {
    let gain = 0;
    for (let i = 1; i < altSeries.length; i++) {
      const d = altSeries[i] - altSeries[i - 1];
      if (d > 0) gain += d;
    }
    elevationGain = Math.round(gain);
  }
  const hasGps = (activity.streams?.latlng?.length ?? 0) >= 2;

  const dateLabel = new Date(activity.startDate).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <ActivityRouteMap latlng={activity.streams?.latlng ?? []} height={280} />
      {!hasGps ? (
        <Text style={styles.gpsHint}>
          Pas de tracé GPS dans ce fichier — les stats restent disponibles ci-dessous.
        </Text>
      ) : null}

      <View style={styles.body}>
        <Text style={styles.sportTag}>
          {(activity.sport ?? 'run') === 'run'
            ? 'Course'
            : activity.sport === 'bike'
              ? 'Vélo'
              : activity.sport === 'swim'
                ? 'Natation'
                : 'Séance'}
        </Text>
        <Text style={styles.title}>{activity.name}</Text>
        <Text style={styles.date}>{dateLabel}</Text>

        <View style={styles.stats}>
          <View style={[styles.stat, styles.statTintA]}>
            <Text style={styles.statV}>{(activity.distanceM / 1000).toFixed(2)}</Text>
            <Text style={styles.statL}>Distance (km)</Text>
          </View>
          <View style={[styles.stat, styles.statTintB]}>
            <Text style={styles.statV}>{formatDuration(activity.movingSec)}</Text>
            <Text style={styles.statL}>Temps en mouvement</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statV}>{pace != null ? formatPace(pace) : '—'}</Text>
            <Text style={styles.statL}>Allure moy.</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statV}>{formatDuration(activity.elapsedSec)}</Text>
            <Text style={styles.statL}>Temps total</Text>
          </View>
          <View style={[styles.stat, styles.statTintC]}>
            <Text style={styles.statV}>{avgHr != null ? `${avgHr}` : '—'}</Text>
            <Text style={styles.statL}>FC moy. (bpm)</Text>
          </View>
          <View style={[styles.stat, styles.statTintC]}>
            <Text style={styles.statV}>{maxHr != null ? `${maxHr}` : '—'}</Text>
            <Text style={styles.statL}>FC max (bpm)</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statV}>
              {elevationGain != null ? `${elevationGain}` : '—'}
            </Text>
            <Text style={styles.statL}>D+</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statV}>
              {analysis ? `${analysis.compliance.total}%` : '—'}
            </Text>
            <Text style={styles.statL}>vs plan</Text>
          </View>
        </View>

        {analysis ? (
          <View style={styles.complianceBox}>
            <Text style={styles.complianceTitle}>{PLAN_MATCH_TITLE}</Text>
            <Text style={styles.complianceHeadline}>
              {analysis.compliance.total}% — {planMatchHeadline(analysis.compliance.total)}
            </Text>
            <Text style={styles.complianceExplain}>
              {planMatchExplanation(analysis.compliance)}
            </Text>
            {planMatchDetailLines(analysis.compliance).map((line) => (
              <View key={line.label} style={styles.complianceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.complianceRowLabel}>
                    {line.label} · {line.pct}%
                  </Text>
                  <Text style={styles.complianceRowHint}>{line.hint}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {activity.laps && activity.laps.length > 0 ? (
          <View style={styles.lapsBox}>
            <Text style={styles.complianceTitle}>Tours</Text>
            {activity.laps.slice(0, 12).map((lap) => (
              <Text key={lap.index} style={styles.lapLine}>
                Tour {lap.index + 1} · {(lap.distanceM / 1000).toFixed(2)} km ·{' '}
                {formatDuration(lap.elapsedSec)}
                {lap.avgHr != null ? ` · FC ${lap.avgHr}` : ''}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </AppScrollView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary },
    gpsHint: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: `${colors.warn}33`,
      color: colors.warn,
      fontSize: 13,
    },
    body: { padding: spacing.md },
    sportTag: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accentLight,
      color: colors.accentDark,
      fontWeight: '800',
      fontSize: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.pill,
      marginBottom: 8,
    },
    title: { fontSize: 22, fontWeight: '800', color: colors.text },
    date: {
      marginTop: 4,
      color: colors.textMuted,
      fontSize: 14,
      textTransform: 'capitalize',
    },
    stats: {
      marginTop: spacing.lg,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    stat: {
      width: '47%',
      flexGrow: 1,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statTintA: {
      backgroundColor: `${colors.success}18`,
      borderColor: `${colors.success}55`,
    },
    statTintB: {
      backgroundColor: `${colors.sleep}18`,
      borderColor: `${colors.sleep}55`,
    },
    statTintC: {
      backgroundColor: `${colors.danger}18`,
      borderColor: `${colors.danger}55`,
    },
    statV: { fontSize: 22, fontWeight: '800', color: colors.text },
    statL: { marginTop: 2, fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    complianceBox: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.accentLight,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    complianceTitle: { fontWeight: '800', color: colors.accentDark, marginBottom: 4 },
    complianceHeadline: {
      fontWeight: '800',
      fontSize: 15,
      color: colors.text,
      marginBottom: 6,
    },
    complianceExplain: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: spacing.sm,
    },
    complianceRow: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    complianceRowLabel: { fontWeight: '700', fontSize: 13, color: colors.text },
    complianceRowHint: { marginTop: 2, fontSize: 12, color: colors.textMuted, lineHeight: 16 },
    complianceLine: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
    lapsBox: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    lapLine: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
    missing: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.md,
    },
    missingText: { color: colors.textMuted, fontSize: 16 },
  });
}

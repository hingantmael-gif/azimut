import { useAmbientSport } from '../../src/theme/AmbientSport';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../src/ui/Text';
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
import {
  exportActivityToStrava,
  shareActivityRecap,
} from '../../src/engines/stravaExport';
import { buildCoachLines } from '../../src/engines/activityAnalysis';
import { ActivityCharts } from '../../src/ui/ActivityCharts';
import { findSimilarPaceCompare } from '../../src/engines/paceCompare';
import { compareSessionVsPlan } from '../../src/engines/progressiveLearning';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { PrimaryButton, SecondaryButton } from '../../src/ui/primitives';
import { AppScrollView } from '../../src/ui/scrolling';

/** Détail activité — carte GPS, FC, allure, fidélité au plan */
export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [sharing, setSharing] = useState(false);
  const [stravaBusy, setStravaBusy] = useState(false);
  const activityId = typeof id === 'string' ? decodeURIComponent(id) : '';
  const activity = state.activities.find(
    (a) => a.id === activityId || a.id === id,
  );
  const analysis = state.analyses.find((x) => x.activityId === activity?.id);
  useAmbientSport(activity?.sport ?? 'run');
  const coachLines = useMemo(
    () => (activity ? buildCoachLines(activity, analysis) : []),
    [activity, analysis],
  );

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
  const gpsPoints = activity.streams?.latlng?.length ?? 0;
  const hasGps = gpsPoints >= 1;
  const isLiveMova = (activity.id.startsWith('mova-live-') || activity.id.startsWith('azimut-live-'));
  const paceCompare = findSimilarPaceCompare(activity, state.activities);
  const vsPlanLearn = compareSessionVsPlan(activity, state.plan);

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
      <ActivityRouteMap
        latlng={activity.streams?.latlng ?? []}
        height={hasGps ? 340 : 220}
        zoomControl={false}
        emptyLabel={
          isLiveMova
            ? 'Aucun point GPS enregistré pour cette sortie'
            : 'Pas de tracé GPS — stats ci-dessous'
        }
      />
      {!hasGps ? (
        <Text style={styles.gpsHint}>
          {isLiveMova
            ? 'Le GPS n’a pas pu enregistrer de position. Distance et chrono restent ci-dessous.'
            : 'Pas de tracé GPS dans ce fichier — les stats restent disponibles ci-dessous.'}
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

        {coachLines.length > 0 ? (
          <View style={styles.complianceBox}>
            <Text style={styles.complianceTitle}>Analyse du coach</Text>
            {coachLines.map((line) => (
              <Text key={line} style={styles.coachLine}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}

        <ActivityCharts activity={activity} sport={activity.sport} />

        {paceCompare || vsPlanLearn ? (
          <View style={styles.complianceBox}>
            <Text style={styles.complianceTitle}>Comparaison d’allure</Text>
            {paceCompare ? (
              <Text style={styles.complianceExplain}>{paceCompare.summary}</Text>
            ) : null}
            {vsPlanLearn ? (
              <Text style={styles.complianceExplain}>{vsPlanLearn.note}</Text>
            ) : null}
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

        <View style={styles.shareWrap}>
          <PrimaryButton
            label={stravaBusy ? 'Préparation Strava…' : 'Envoyer vers Strava'}
            onPress={() => {
              if (stravaBusy) return;
              setStravaBusy(true);
              void exportActivityToStrava(activity, {
                profile: state.profile,
              }).then((r) => {
                if (r === 'paywall') {
                  router.push('/settings/subscription');
                }
              }).finally(() => setStravaBusy(false));
            }}
          />
          <View style={{ height: spacing.sm }} />
          <SecondaryButton
            label={sharing ? 'Partage…' : 'Partager ma séance'}
            onPress={() => {
              if (sharing) return;
              setSharing(true);
              void shareActivityRecap(activity).finally(() => setSharing(false));
            }}
          />
          <View style={{ height: spacing.sm }} />
          <SecondaryButton
            label="Voir toutes mes activités"
            onPress={() => router.push('/activities')}
          />
        </View>
      </View>
    </AppScrollView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
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
    coachLine: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 4 },
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
    shareWrap: { marginTop: spacing.lg },
    insightMuted: {
      marginTop: spacing.sm,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
    },
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

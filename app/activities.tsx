import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/store/AppContext';
import { formatDuration } from '../src/engines/core';
import { useThemeColors } from '../src/theme/ThemeContext';
import { radii, spacing } from '../src/theme/tokens';
import type { ColorPalette } from '../src/theme/palettes';
import { AppScrollView } from '../src/ui/scrolling';
import { SportAtmosphereBanner } from '../src/ui/SportAtmosphereBanner';
import { ATMOSPHERE_IMAGES } from '../src/constants/sportVisuals';

/** Liste des activités enregistrées (depuis le profil) */
export default function ActivitiesScreen() {
  const { state } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const activities = state.activities;

  return (
    <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={styles.bannerPad}>
        <SportAtmosphereBanner
          source={ATMOSPHERE_IMAGES.run}
          title="Tes sorties"
          subtitle="Imports Strava et séances enregistrées"
          height={140}
        />
      </View>
      <Text style={styles.intro}>
        Sorties récentes que tu as enregistrées ou importées.
      </Text>

      {activities.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aucune activité</Text>
          <Text style={styles.emptySub}>
            Enregistre une sortie ou importe-la depuis Strava pour la retrouver ici.
          </Text>
        </View>
      ) : (
        activities.map((a) => {
          const analysis = state.analyses.find((x) => x.activityId === a.id);
          const dateStr = new Date(a.startDate).toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
          return (
            <Pressable
              key={a.id}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/activity/[id]',
                  params: { id: a.id },
                })
              }
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {a.name}
                </Text>
                <Text style={styles.cardOpen}>›</Text>
              </View>
              <Text style={styles.cardDate}>{dateStr}</Text>
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statV}>
                    {(a.distanceM / 1000).toFixed(2).replace('.', ',')} km
                  </Text>
                  <Text style={styles.statL}>Distance</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statV}>{formatDuration(a.movingSec)}</Text>
                  <Text style={styles.statL}>Durée</Text>
                </View>
                {analysis ? (
                  <View style={styles.stat}>
                    <Text style={styles.statV}>{analysis.compliance.total}%</Text>
                    <Text style={styles.statL}>vs plan</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })
      )}
    </AppScrollView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary },
    bannerPad: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
    },
    intro: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    empty: {
      margin: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyTitle: {
      fontWeight: '800',
      fontSize: 16,
      color: colors.text,
    },
    emptySub: {
      marginTop: 6,
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
    },
    card: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    cardTitle: {
      flex: 1,
      fontWeight: '800',
      fontSize: 16,
      color: colors.text,
    },
    cardOpen: {
      fontSize: 22,
      color: colors.textMuted,
      lineHeight: 22,
    },
    cardDate: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textMuted,
    },
    stats: {
      flexDirection: 'row',
      marginTop: spacing.sm,
      gap: spacing.md,
    },
    stat: { minWidth: 72 },
    statV: { fontWeight: '800', fontSize: 15, color: colors.text },
    statL: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  });
}

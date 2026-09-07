import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Body, Muted, PrimaryButton, Screen, Title } from '../src/ui/primitives';
import { formatDuration, formatPace } from '../src/engines/core';
import { formatRaceTime } from '../src/engines/athleteProfile';
import {
  hasAnySportReference,
  predictBikeFromProfile,
  predictRunFromProfile,
  predictSwimFromProfile,
  predictTriathlonFromProfile,
} from '../src/engines/multiSportPrediction';
import { useApp } from '../src/store/AppContext';
import { useThemeColors } from '../src/theme/ThemeContext';
import { radii, spacing } from '../src/theme/tokens';
import type { ColorPalette } from '../src/theme/palettes';
import { AppScrollView } from '../src/ui/scrolling';
import { SportAtmosphereBanner } from '../src/ui/SportAtmosphereBanner';
import { ATMOSPHERE_IMAGES } from '../src/constants/sportVisuals';

type TabId = 'run' | 'swim' | 'bike' | 'triathlon';

const TABS: { id: TabId; label: string }[] = [
  { id: 'run', label: 'Course' },
  { id: 'swim', label: 'Natation' },
  { id: 'bike', label: 'Vélo' },
  { id: 'triathlon', label: 'Triathlon' },
];

const TAB_ATMOSPHERE: Record<
  TabId,
  { source: (typeof ATMOSPHERE_IMAGES)[keyof typeof ATMOSPHERE_IMAGES]; title: string; subtitle: string }
> = {
  run: {
    source: ATMOSPHERE_IMAGES.run,
    title: 'Course',
    subtitle: 'Athlètes au premier plan — prédictions depuis tes chronos',
  },
  swim: {
    source: ATMOSPHERE_IMAGES.swim,
    title: 'Natation',
    subtitle: 'Bassin & eau libre — modèle CSS',
  },
  bike: {
    source: ATMOSPHERE_IMAGES.bike,
    title: 'Vélo',
    subtitle: 'CLM & gran fondo — FTP + physique',
  },
  triathlon: {
    source: ATMOSPHERE_IMAGES.triathlon,
    title: 'Triathlon',
    subtitle: 'Somme des trois disciplines',
  },
};

const MISS_LABEL = { swim: 'natation', bike: 'vélo', run: 'course' } as const;

/** Prédiction multi-disciplines — aucune estimation sans chrono saisi. */
export default function RacePredictorScreen() {
  const { state } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const o = state.profile.onboarding;
  const weightKg = state.profile.weightKg;
  const [tab, setTab] = useState<TabId>('run');

  const runRows = useMemo(() => predictRunFromProfile(o), [o]);
  const swimRows = useMemo(() => predictSwimFromProfile(o), [o]);
  const bikeRows = useMemo(
    () => predictBikeFromProfile(o, { weightKg }),
    [o, weightKg],
  );
  const triRows = useMemo(
    () => predictTriathlonFromProfile(o, { weightKg }),
    [o, weightKg],
  );
  const hasData = hasAnySportReference(o);

  return (
    <Screen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Title>Prédiction de course</Title>
        <Muted style={{ marginTop: 6, lineHeight: 20 }}>
          Chaque discipline a son modèle : course (Riegel/VDOT), natation (CSS),
          vélo (FTP + physique). Uniquement depuis vos chronos — sans saisie,
          aucune estimation.
        </Muted>

        <View style={{ marginTop: spacing.md }}>
          <SportAtmosphereBanner
            source={TAB_ATMOSPHERE[tab].source}
            title={TAB_ATMOSPHERE[tab].title}
            subtitle={TAB_ATMOSPHERE[tab].subtitle}
          />
        </View>

        {!hasData ? (
          <View style={styles.empty}>
            <Body style={{ color: colors.text }}>Aucune donnée de performance</Body>
            <Muted style={{ marginTop: 8, lineHeight: 20 }}>
              Ajoutez au moins un chrono (ex. 5 km, 100 m nage, 40 km vélo ou FTP)
              pour débloquer les prédictions.
            </Muted>
            <View style={{ marginTop: spacing.md }}>
              <PrimaryButton
                label="Renseigner mes chronos"
                onPress={() => router.push('/settings/sports-data')}
              />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.tabs}>
              {TABS.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setTab(t.id)}
                  style={[styles.tab, tab === t.id && styles.tabActive]}
                >
                  <Text
                    style={[styles.tabText, tab === t.id && styles.tabTextActive]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {tab === 'run' ? (
              runRows.length === 0 ? (
                <EmptyDiscipline
                  styles={styles}
                  colors={colors}
                  message="Ajoutez un chrono course (5 km iconique, 10 km…)."
                  onPress={() => router.push('/settings/sports-data')}
                />
              ) : (
                <>
                  <Muted style={{ marginBottom: 4, fontSize: 12, lineHeight: 17 }}>
                    Modèle hybride Riegel + Cameron + Daniels (VDOT), corrigé selon
                    le volume hebdo.
                  </Muted>
                  {runRows.map((p) => (
                    <View key={p.key} style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Body>{p.distanceLabel}</Body>
                        <Muted style={{ marginTop: 2 }}>
                          {p.isMeasured ? 'Saisi' : 'Estimé'} ·{' '}
                          {formatPace(p.paceSecPerKm)}
                        </Muted>
                      </View>
                      <Body>{formatDuration(p.predictedSec)}</Body>
                    </View>
                  ))}
                </>
              )
            ) : null}

            {tab === 'swim' ? (
              swimRows.length === 0 ? (
                <EmptyDiscipline
                  styles={styles}
                  colors={colors}
                  message="Ajoutez un chrono (idéal 200 m + 400 m pour le CSS)."
                  onPress={() => router.push('/settings/sports-data')}
                />
              ) : (
                <>
                  <Muted style={{ marginBottom: 4, fontSize: 12, lineHeight: 17 }}>
                    Critical Swim Speed + facteurs d’allure par distance (bassin /
                    eau libre).
                  </Muted>
                  {swimRows.map((p) => (
                    <View key={p.key} style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Body>{p.distanceLabel}</Body>
                        <Muted style={{ marginTop: 2 }}>
                          {p.isMeasured ? 'Saisi' : 'Estimé'} ·{' '}
                          {formatRaceTime(p.paceSecPerKm)}
                          /100 m
                        </Muted>
                      </View>
                      <Body>{formatDuration(p.predictedSec)}</Body>
                    </View>
                  ))}
                </>
              )
            ) : null}

            {tab === 'bike' ? (
              bikeRows.length === 0 ? (
                <EmptyDiscipline
                  styles={styles}
                  colors={colors}
                  message="Ajoutez un chrono CLM (20/40 km) ou votre FTP."
                  onPress={() => router.push('/settings/sports-data')}
                />
              ) : (
                <>
                  <Muted style={{ marginBottom: 4, fontSize: 12, lineHeight: 17 }}>
                    FTP + physique plat (air / roulage). Intensité selon durée —
                    pas le même modèle que la course.
                  </Muted>
                  {bikeRows.map((p) => (
                    <View key={p.key} style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Body>{p.distanceLabel}</Body>
                        <Muted style={{ marginTop: 2 }}>
                          {p.isMeasured ? 'Saisi' : 'Estimé'}
                          {p.avgKmh != null && p.avgKmh > 0
                            ? ` · ${p.avgKmh} km/h`
                            : ''}
                        </Muted>
                      </View>
                      <Body>{formatDuration(p.predictedSec)}</Body>
                    </View>
                  ))}
                </>
              )
            ) : null}

            {tab === 'triathlon' ? (
              <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                {triRows.map((t) => (
                  <View key={t.formatId} style={styles.triCard}>
                    <Body style={{ fontWeight: '800' }}>{t.formatLabel}</Body>
                    {t.complete && t.totalSec != null ? (
                      <>
                        <Text style={styles.triTotal}>
                          Total estimé · {formatDuration(t.totalSec)}
                        </Text>
                        <Muted style={{ marginTop: 6 }}>
                          Nage {formatDuration(t.swimSec!)} · Vélo{' '}
                          {formatDuration(t.bikeSec!)} · Course{' '}
                          {formatDuration(t.runSec!)}
                        </Muted>
                        <Muted style={{ marginTop: 4, fontSize: 11 }}>
                          Hors transitions T1/T2
                        </Muted>
                      </>
                    ) : (
                      <Muted style={{ marginTop: 8, lineHeight: 18 }}>
                        Estimation incomplete — manque :{' '}
                        {t.missing.map((m) => MISS_LABEL[m]).join(', ')}. Renseignez
                        chaque discipline dans Données sportives.
                      </Muted>
                    )}
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              style={styles.link}
              onPress={() => router.push('/settings/sports-data')}
            >
              <Text style={styles.linkText}>Modifier mes chronos</Text>
            </Pressable>
          </>
        )}
      </AppScrollView>
    </Screen>
  );
}

function EmptyDiscipline({
  styles,
  colors,
  message,
  onPress,
}: {
  styles: ReturnType<typeof makeStyles>;
  colors: ColorPalette;
  message: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Muted style={{ lineHeight: 20 }}>{message}</Muted>
      <View style={{ marginTop: spacing.md }}>
        <PrimaryButton label="Données sportives" onPress={onPress} />
      </View>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    tabs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.pill,
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    tabText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    tabTextActive: { color: colors.accentDark },
    row: {
      marginTop: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.bgElevated,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    empty: {
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
    },
    triCard: {
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
    },
    triTotal: {
      marginTop: 8,
      fontSize: 18,
      fontWeight: '800',
      color: colors.accent,
    },
    link: { marginTop: spacing.lg, paddingVertical: 8 },
    linkText: {
      color: colors.accent,
      fontWeight: '700',
      fontSize: 14,
    },
  });
}

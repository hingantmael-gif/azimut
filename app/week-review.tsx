import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../src/ui/Text';
import { useRouter } from 'expo-router';
import { useApp } from '../src/store/AppContext';
import { useThemeColors } from '../src/theme/ThemeContext';
import { radii, spacing } from '../src/theme/tokens';
import type { ColorPalette } from '../src/theme/palettes';
import { buildWeekReview } from '../src/engines/weekReview';
import { FadeInUp } from '../src/ui/motion/softMotion';
import { PrimaryButton, SecondaryButton } from '../src/ui/primitives';
import { AppScrollView } from '../src/ui/scrolling';

/** Bilan hebdomadaire — charge 7 j, forme, vs semaine précédente */
export default function WeekReviewScreen() {
  const { state } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const review = useMemo(
    () =>
      buildWeekReview({
        activities: state.activities,
        plan: state.plan,
        formTsb: state.banister.formTsb,
      }),
    [state.activities, state.plan, state.banister.formTsb],
  );

  const { current, previous, loadDeltaPct, sessionsDelta, formTsb, formTrend, highlight } =
    review;

  const formLabel =
    formTrend === 'up'
      ? 'Tendance positive'
      : formTrend === 'down'
        ? 'Tendance en creux'
        : 'Tendance stable';

  const loadLabel =
    loadDeltaPct == null
      ? 'Pas de référence semaine précédente'
      : loadDeltaPct > 0
        ? `+${loadDeltaPct} % vs semaine préc.`
        : loadDeltaPct < 0
          ? `${loadDeltaPct} % vs semaine préc.`
          : 'Charge égale à la semaine préc.';

  return (
    <AppScrollView
      style={styles.root}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
    >
      <FadeInUp>
        <Text style={styles.kicker}>7 derniers jours</Text>
        <Text style={styles.title}>Bilan hebdomadaire</Text>
        <Text style={styles.sub}>{highlight}</Text>
      </FadeInUp>

      <FadeInUp delay={60}>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statN}>{current.load}</Text>
            <Text style={styles.statL}>Charge (TRIMP)</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statN}>
              {current.sessionsDone}/{current.sessionsPlanned || '—'}
            </Text>
            <Text style={styles.statL}>Séances faites / prévues</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statN}>{current.km}</Text>
            <Text style={styles.statL}>Kilomètres</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statN}>{current.hours}</Text>
            <Text style={styles.statL}>Heures</Text>
          </View>
        </View>
      </FadeInUp>

      <FadeInUp delay={100}>
        <Text style={styles.section}>Forme (TSB)</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {formTsb >= 0 ? '+' : ''}
            {formTsb.toFixed(0)} · {formLabel}
          </Text>
          <Text style={styles.cardMeta}>
            Fitness {state.banister.fitness.toFixed(0)} · Fatigue{' '}
            {state.banister.fatigue.toFixed(0)}
          </Text>
        </View>
      </FadeInUp>

      <FadeInUp delay={140}>
        <Text style={styles.section}>Vs semaine précédente</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{loadLabel}</Text>
          <Text style={styles.cardMeta}>
            Avant : charge {previous.load} · {previous.sessionsDone} séance
            {previous.sessionsDone > 1 ? 's' : ''} · {previous.km} km
          </Text>
          <Text style={styles.cardMeta}>
            Séances :{' '}
            {sessionsDelta > 0
              ? `+${sessionsDelta}`
              : sessionsDelta < 0
                ? `${sessionsDelta}`
                : 'identique'}{' '}
            par rapport à la semaine d’avant
          </Text>
        </View>
      </FadeInUp>

      <FadeInUp delay={180}>
        <View style={styles.actions}>
          <PrimaryButton
            label="Retour à l’accueil"
            onPress={() => router.replace('/(tabs)')}
          />
          <SecondaryButton
            label="Voir le plan"
            onPress={() => router.navigate('/calendar')}
          />
        </View>
      </FadeInUp>
    </AppScrollView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
    kicker: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.accent,
    },
    title: {
      marginTop: 4,
      fontSize: 26,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -0.4,
    },
    sub: {
      marginTop: 8,
      marginBottom: spacing.lg,
      color: colors.textSecondary,
      lineHeight: 22,
      fontSize: 15,
    },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    statBox: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: colors.bg,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    statN: { fontSize: 24, fontWeight: '900', color: colors.text },
    statL: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
    section: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    card: {
      backgroundColor: colors.bg,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: { fontWeight: '800', color: colors.text, fontSize: 16 },
    cardMeta: { color: colors.textMuted, marginTop: 6, lineHeight: 20, fontSize: 13 },
    actions: { marginTop: spacing.xl, gap: spacing.sm },
  });
}

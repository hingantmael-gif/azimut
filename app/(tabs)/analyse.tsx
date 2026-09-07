import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Body, Muted, PrimaryButton, Screen, Subtitle, Title } from '../../src/ui/primitives';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import {
  formatRankLabel,
  normalizeTier,
  xpProgressInLevel,
} from '../../src/engines/rankedLadder';
import {
  PLAN_MATCH_TITLE,
  planMatchDetailLines,
  planMatchExplanation,
  planMatchHeadline,
} from '../../src/engines/compliancePresentation';
import { AppScrollView } from '../../src/ui/scrolling';
import { formatCompactNumber } from '../../src/utils/formatCompactNumber';
import { SportAtmosphereBanner } from '../../src/ui/SportAtmosphereBanner';
import { ATMOSPHERE_IMAGES } from '../../src/constants/sportVisuals';

/** CDC §2 + §3 — Progrès, conformité, outils avancés */
export default function ProgressScreen() {
  const { state } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const last = state.analyses[0];
  const locked = state.profile.achievements.filter((a) => !a.unlockedAt);
  const r = state.profile.ranked;
  const tier = normalizeTier(r.tier);
  const div = r.division !== undefined ? r.division : 3;
  const xpBar = xpProgressInLevel(r.xp);

  return (
    <Screen style={{ paddingTop: spacing.md }}>
      <AppScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Title>Progrès</Title>

        <Muted>Prévu vs réalisé, charge, badges — complexité masquée au quotidien.</Muted>

        <View style={{ marginTop: spacing.md }}>
          <SportAtmosphereBanner
            source={ATMOSPHERE_IMAGES.run}
            title="Ta progression"
            subtitle="Course, vélo, natation — le même suivi, des athlètes au premier plan"
          />
        </View>

        <View style={styles.block}>
          <Subtitle>Classement</Subtitle>

          <Body>
            {formatRankLabel(tier, div)} · Niveau {r.level} ·{' '}
            {r.xp.toLocaleString('fr-FR')} XP
          </Body>
          <Muted>
            Progression niveau : {xpBar.xpIntoLevel}/{xpBar.xpForNext} XP
          </Muted>
          <Body>Série : {r.streakWeeks} semaine(s)</Body>
          <PrimaryButton label="Voir le classement" onPress={() => router.push('/ranked')} />
        </View>

        <View style={styles.block}>
          <Subtitle>Profil sportif</Subtitle>
          <Body>
            Volume :{' '}
            {state.profile.onboarding?.weeklyKmAvg
              ? `${state.profile.onboarding.weeklyKmAvg} km/sem`
              : 'Non renseigné'}
          </Body>
          <PrimaryButton
            label="Mettre à jour le profil"
            onPress={() => router.push('/settings/athlete-profile')}
          />
        </View>

        <View style={styles.block}>
          <Subtitle>Charge (Banister)</Subtitle>

          <Body>Fitness : {state.banister.fitness.toFixed(1)}</Body>

          <Body>Fatigue : {state.banister.fatigue.toFixed(1)}</Body>

          <Body>Forme / TSB : {state.banister.formTsb.toFixed(1)}</Body>
        </View>

        <View style={styles.block}>
          <Subtitle>{PLAN_MATCH_TITLE}</Subtitle>

          {last ? (
            <>
              <Body>
                {last.compliance.total}% — {planMatchHeadline(last.compliance.total)}
              </Body>

              <Muted>{planMatchExplanation(last.compliance)}</Muted>

              {planMatchDetailLines(last.compliance).map((line) => (
                <Muted key={line.label}>
                  {line.label} : {line.pct}% — {line.hint}
                </Muted>
              ))}
            </>
          ) : (
            <Muted>Importez une activité (Strava ou simulation) pour comparer au plan.</Muted>
          )}
        </View>

        <View style={styles.block}>
          <Subtitle>Depuis le début</Subtitle>

          <Body>
            {formatCompactNumber(state.lifetime.totalKm, { empty: '0' })} km
          </Body>

          <Body>
            {formatCompactNumber(state.lifetime.totalSessions, { empty: '0' })} séances
          </Body>

          <Body>
            {formatCompactNumber(state.lifetime.totalHours, { empty: '0' })} h d&apos;effort
          </Body>
        </View>

        <View style={styles.block}>
          <Subtitle>Badges</Subtitle>

          {state.profile.achievements.map((a) => (
            <Body key={a.id}>
              {a.unlockedAt ? '✓' : '○'} {a.title}
            </Body>
          ))}

          {locked.length > 0 ? (
            <Muted>{locked.length} badge(s) restant(s) à débloquer</Muted>
          ) : null}
        </View>

        <PrimaryButton label="Prédiction temps de course" onPress={() => router.push('/race-predictor')} />

        <PrimaryButton label="Nutrition & hydratation" onPress={() => router.push('/nutrition')} />

        <PrimaryButton label="Multi-sport / triathlon" onPress={() => router.push('/multisport')} />

        <PrimaryButton label="Récupération & mobilité" onPress={() => router.push('/recovery')} />

        <PrimaryButton label="Sécurité & alertes" onPress={() => router.push('/safety')} />
      </AppScrollView>
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    block: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bgElevated,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
  });
}

import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { SettingsRow, SettingsScreen, SettingsSection } from '../../src/ui/settings/SettingsList';
import { GOAL_LABELS } from '../../src/constants/features';
import { useApp } from '../../src/store/AppContext';
import { describePaceZoneSource } from '../../src/engines/paceZones';
import { formatVmaKmh, summarizeSportsData } from '../../src/engines/athleteProfile';
import { resolveAthletePaceZones } from '../../src/engines/workoutPresentation';
import { AppScrollView } from '../../src/ui/scrolling';
import { Text } from 'react-native';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';

const LEVEL_LABELS: Record<string, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  confirme: 'Confirmé',
};

/**
 * Hub « Mes objectifs » — résumé clair, sans doublons.
 * Édition : profil sportif (objectif / volume / niveau) ou données sportives (VMA / chronos).
 */
export default function GoalsSettingsScreen() {
  const { state } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const o = state.profile.onboarding;
  const paceZones = resolveAthletePaceZones(o, state.activities);
  const fill = useMemo(() => summarizeSportsData(o), [o]);

  const goal = o ? GOAL_LABELS[o.goal] ?? o.goal : 'Non défini';
  const levelLabel = o?.level ? LEVEL_LABELS[o.level] ?? o.level : '—';
  const volumeLabel = o?.weeklyKmAvg ? `${o.weeklyKmAvg} km/sem` : 'À compléter';
  const vmaLabel = paceZones
    ? `${formatVmaKmh(paceZones.vmaKmh)} km/h`
    : 'À compléter';
  const sportsLabel =
    fill.disciplinesWithData > 0
      ? `${fill.disciplinesWithData} discipline${fill.disciplinesWithData > 1 ? 's' : ''}`
      : 'Aucun chrono';

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Text
          style={{
            color: colors.textMuted,
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          Un résumé de ton objectif et de ton niveau. Chaque ligne ouvre
          l’écran d’édition — pas de doublon ici.
        </Text>

        <SettingsSection title="Objectif & niveau">
          <SettingsRow
            label="Objectif principal"
            value={goal}
            onPress={() => router.push('/settings/athlete-profile')}
          />
          <SettingsRow
            label="Volume & niveau"
            value={`${volumeLabel} · ${levelLabel}`}
            onPress={() => router.push('/settings/athlete-profile')}
          />
        </SettingsSection>

        <SettingsSection title="Performances">
          <SettingsRow
            label="VMA"
            value={
              paceZones
                ? `${vmaLabel} (${describePaceZoneSource(paceZones.source)})`
                : vmaLabel
            }
            onPress={() => router.push('/settings/sports-data')}
          />
          <SettingsRow
            label="Chronos, FTP, natation"
            value={sportsLabel}
            onPress={() => router.push('/settings/sports-data')}
          />
        </SettingsSection>

        <SettingsSection title="Plan">
          <SettingsRow
            label="Séances planifiées"
            value={`${state.plan.length}`}
            showChevron={false}
          />
          <SettingsRow
            label="Fonctionnalités"
            onPress={() => router.push('/settings/subscription')}
          />
        </SettingsSection>
      </AppScrollView>
    </SettingsScreen>
  );
}

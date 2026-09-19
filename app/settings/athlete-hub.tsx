import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import { GOAL_LABELS } from '../../src/constants/features';
import { formatVmaKmh, summarizeSportsData } from '../../src/engines/athleteProfile';
import { describePaceZoneSource } from '../../src/engines/paceZones';
import { resolveAthletePaceZones } from '../../src/engines/workoutPresentation';
import { AppScrollView } from '../../src/ui/scrolling';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';

type HubTab = 'objectifs' | 'donnees' | 'forme';

const TABS: ReadonlyArray<{ id: HubTab; label: string }> = [
  { id: 'objectifs', label: 'Objectifs' },
  { id: 'donnees', label: 'Données' },
  { id: 'forme', label: 'Forme' },
];

const LEVEL_LABELS: Record<string, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  confirme: 'Confirmé',
};

/**
 * Hub athlète — Objectifs | Données | Forme.
 * Remplace les entrées séparées goals / sports-data / performance / athlete-profile.
 */
export default function AthleteHubScreen() {
  const router = useRouter();
  const { state } = useApp();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<HubTab>('objectifs');

  const o = state.profile.onboarding;
  const paceZones = resolveAthletePaceZones(o, state.activities);
  const fill = useMemo(() => summarizeSportsData(o), [o]);
  const b = state.banister;

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
        <View style={styles.segmentRow}>
          {TABS.map((seg) => {
            const selected = tab === seg.id;
            return (
              <Pressable
                key={seg.id}
                onPress={() => setTab(seg.id)}
                style={[styles.segmentPill, selected && styles.segmentPillOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={seg.label}
              >
                <Text style={[styles.segmentText, selected && styles.segmentTextOn]}>
                  {seg.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'objectifs' ? (
          <>
            <Text style={styles.hint}>
              Objectif, volume et niveau — édition dans le profil sportif détaillé.
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
              <SettingsRow
                label="Éditer le profil sportif"
                value="Objectif · volume · niveau"
                onPress={() => router.push('/settings/athlete-profile')}
              />
            </SettingsSection>
            <SettingsSection title="Plan">
              <SettingsRow
                label="Séances planifiées"
                value={`${state.plan.length}`}
                showChevron={false}
              />
            </SettingsSection>
          </>
        ) : null}

        {tab === 'donnees' ? (
          <>
            <Text style={styles.hint}>
              Chronos, VMA, FTP — ouvre le détail par discipline.
            </Text>
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
              <SettingsRow
                label="Ouvrir les données sportives"
                onPress={() => router.push('/settings/sports-data')}
              />
            </SettingsSection>
          </>
        ) : null}

        {tab === 'forme' ? (
          <>
            <Text style={styles.hint}>Fitness, fatigue et forme du jour (Banister).</Text>
            <SettingsSection title="Forme actuelle">
              <SettingsRow label="Fitness" value={b.fitness.toFixed(0)} showChevron={false} />
              <SettingsRow label="Fatigue" value={b.fatigue.toFixed(0)} showChevron={false} />
              <SettingsRow
                label="Forme (TSB)"
                value={b.formTsb.toFixed(0)}
                showChevron={false}
              />
            </SettingsSection>
            <SettingsSection title="Entraînement">
              <SettingsRow
                label="Plan du jour"
                onPress={() => router.push('/(tabs)/training')}
              />
              <SettingsRow
                label="Progrès et stats"
                onPress={() => router.push('/(tabs)/analyse')}
              />
              <SettingsRow
                label="Prédiction de course"
                onPress={() => router.push('/race-predictor')}
              />
            </SettingsSection>
          </>
        ) : null}
      </AppScrollView>
    </SettingsScreen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    segmentRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
    },
    segmentPill: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: radii.md,
      backgroundColor: colors.bgElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    segmentPillOn: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
    },
    segmentTextOn: {
      color: '#fff',
    },
    hint: {
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      fontSize: 14,
      lineHeight: 20,
    },
  });
}

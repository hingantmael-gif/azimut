import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SettingsScreen, SettingsSection } from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import {
  coversBySection,
  formatPersonalBestCoverLabel,
  getProfileCover,
  isProfileCoverUnlocked,
  longestSessionKmBySport,
  profileCoverLockHint,
  type ProfileCoverDef,
} from '../../src/engines/profileCovers';
import { ProfileCoverPreview } from '../../src/ui/profile/ProfileCover';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { AppScrollView } from '../../src/ui/scrolling';
import { Chip } from '../../src/ui/primitives';
import { isTrialAccount } from '../../src/utils/demoAuth';

type CoverTab = 'styles' | 'run' | 'bike' | 'swim' | 'ranks';

const TABS: { id: CoverTab; label: string }[] = [
  { id: 'styles', label: 'Styles' },
  { id: 'run', label: 'Course à pied' },
  { id: 'bike', label: 'Vélo' },
  { id: 'swim', label: 'Natation' },
  { id: 'ranks', label: 'Rangs' },
];

/** Choix du fond de profil */
export default function ProfileCoverSettingsScreen() {
  const { state, dispatch } = useApp();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const p = state.profile;
  const selected = p.profileCoverId ?? 'free-teal';
  const sections = coversBySection();
  const current = getProfileCover(selected);
  const longestBySport = longestSessionKmBySport(state.activities);
  const longestKm = Math.max(
    longestBySport.run,
    longestBySport.bike,
    longestBySport.swim,
  );
  const [tab, setTab] = useState<CoverTab>('styles');

  const unlockOpts = {
    tier: p.ranked.tier,
    division: p.ranked.division,
    longestKm,
    longestBySport,
    unlockAll: isTrialAccount(p),
  };

  const tabList: ProfileCoverDef[] =
    tab === 'styles'
      ? sections.styles
      : tab === 'run'
        ? sections.run
        : tab === 'bike'
          ? sections.bike
          : tab === 'swim'
            ? sections.swim
            : sections.ranks;

  const tabHint =
    tab === 'styles'
      ? 'Fonds de base — dégradés et animations.'
      : tab === 'run'
        ? 'Le record s’affiche en premier, puis les paliers (5K, 10K…).'
        : tab === 'bike'
          ? 'Le record s’affiche en premier, puis les paliers (40, 100 km…).'
          : tab === 'swim'
            ? 'Le record s’affiche en premier, puis les paliers (1, 2, 5 km…).'
            : 'Un fond par palier : Bronze 3 → … → Champion.';

  const trySelect = (cover: ProfileCoverDef) => {
    const unlocked = isProfileCoverUnlocked(cover, unlockOpts);
    if (!unlocked) {
      const u = cover.unlock;
      if (u.type === 'personal_best') {
        Alert.alert(
          'Séance requise',
          `Enregistre une sortie ${u.sport === 'run' ? 'course' : u.sport === 'bike' ? 'vélo' : 'natation'} pour débloquer ce fond.`,
        );
        return;
      }
      if (u.type === 'distance') {
        const currentKm = longestBySport[u.sport] ?? 0;
        Alert.alert(
          'Séance requise',
          `Il te faut une séance ${u.sport === 'run' ? 'course' : u.sport === 'bike' ? 'vélo' : 'natation'} d’au moins ${u.minKm} km (record actuel : ${currentKm.toFixed(1)} km).`,
        );
        return;
      }
      Alert.alert(
        'Rang requis',
        `Atteins ${profileCoverLockHint(cover)} (ou plus haut) pour débloquer ce fond.`,
      );
      return;
    }
    dispatch({ type: 'UPDATE_PROFILE', patch: { profileCoverId: cover.id } });
  };

  const renderGrid = (list: ProfileCoverDef[]) => (
    <View style={styles.grid}>
      {list.map((cover) => {
        const unlocked = isProfileCoverUnlocked(cover, unlockOpts);
        const isOn = selected === cover.id;
        let sub = cover.description;
        if (!unlocked) {
          sub = `🔒 ${profileCoverLockHint(cover)}`;
        } else if (isOn) {
          sub = 'Sélectionné';
        } else if (cover.unlock.type === 'personal_best') {
          const km = longestBySport[cover.unlock.sport] ?? 0;
          const { primary, secondary } = formatPersonalBestCoverLabel(km);
          sub = `Affiche ${primary} ${secondary}`;
        }
        return (
          <Pressable key={cover.id} style={styles.cell} onPress={() => trySelect(cover)}>
            <View pointerEvents="none">
              <ProfileCoverPreview
                cover={cover}
                selected={isOn}
                personalBestKm={longestBySport}
              />
            </View>
            <Text style={styles.cellTitle} numberOfLines={1}>
              {cover.title}
            </Text>
            <Text style={styles.cellSub} numberOfLines={2}>
              {sub}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={styles.current}>
          <Text style={styles.currentLabel}>Aperçu</Text>
          <View style={styles.currentFrame}>
            <ProfileCoverPreview
              cover={current}
              selected
              personalBestKm={longestBySport}
            />
          </View>
          <Text style={styles.currentName}>{current.title}</Text>
          <Text style={styles.meta}>
            Records — course {longestBySport.run.toFixed(1)} km · vélo{' '}
            {longestBySport.bike.toFixed(1)} km · nage {longestBySport.swim.toFixed(1)} km
          </Text>
        </View>

        <SettingsSection title="Catégories">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
          >
            {TABS.map((t) => (
              <Chip
                key={t.id}
                label={t.label}
                selected={tab === t.id}
                onPress={() => setTab(t.id)}
              />
            ))}
          </ScrollView>
          <Text style={styles.hint}>{tabHint}</Text>
          <View style={styles.pad}>{renderGrid(tabList)}</View>
        </SettingsSection>
      </AppScrollView>
    </SettingsScreen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    current: {
      margin: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    currentLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    currentFrame: { borderRadius: 12, overflow: 'hidden' },
    currentName: {
      marginTop: 10,
      fontWeight: '800',
      fontSize: 16,
      color: colors.text,
    },
    meta: { marginTop: 4, fontSize: 12, color: colors.textMuted },
    tabs: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    hint: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    pad: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    cell: { width: '47%', flexGrow: 1, maxWidth: '48%' },
    cellTitle: { marginTop: 6, fontWeight: '800', fontSize: 13, color: colors.text },
    cellSub: { marginTop: 2, fontSize: 11, color: colors.textMuted, lineHeight: 14 },
  });
}

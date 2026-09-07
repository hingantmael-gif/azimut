import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../../src/ui/settings/SettingsList';
import { WatchBrandPicker } from '../../src/ui/sleep/WatchBrandPicker';
import { useApp } from '../../src/store/AppContext';
import { getWatchEntry } from '../../src/constants/watches';
import type { WatchBrandId } from '../../src/types/domain';
import { AppScrollView } from '../../src/ui/scrolling';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';
import { openWatchCompanion } from '../../src/services/sleepImport';
import { watchExportHint, watchSendLabel, canSendWorkoutToWatch } from '../../src/engines/watchExport';
import { todayWorkout } from '../../src/store/AppContext';
import { useWatchWorkoutExport } from '../../src/hooks/useGarminWorkoutExport';

/** Paramètres → Montre — marque pour sommeil + envoi de séances */
export default function WatchSettingsScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const params = useLocalSearchParams<{ change?: string | string[] }>();
  const wantsChange = (() => {
    const raw = params.change;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return v === '1' || v === 'true';
  })();
  const [changing, setChanging] = useState(wantsChange);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (wantsChange) setChanging(true);
  }, [wantsChange]);

  const watch = state.profile.watch;
  const entry = useMemo(
    () => (watch?.brandId ? getWatchEntry(watch.brandId) : null),
    [watch?.brandId],
  );
  const brandId = watch?.brandId ?? null;
  const workout = todayWorkout(state.plan);
  const { sendWorkout, WatchPicker, exporting } = useWatchWorkoutExport();

  const onSelect = (id: WatchBrandId) => {
    dispatch({ type: 'SET_WATCH', brandId: id });
    setChanging(false);
  };

  const connectCompanion = async () => {
    if (!brandId) return;
    setLinking(true);
    try {
      const res = await openWatchCompanion(brandId);
      if (!res.ok && res.error) {
        Alert.alert('Connexion', res.error);
      } else {
        Alert.alert(
          entry?.label ?? 'Montre',
          'App compagnon ouverte. Appaire ta montre en Bluetooth dans cette app si ce n’est pas déjà fait — ensuite Azimut n’a plus qu’à envoyer la séance (1 tap).',
        );
      }
    } finally {
      setLinking(false);
    }
  };

  const sendToday = () => {
    if (!workout || !canSendWorkoutToWatch(workout.discipline)) {
      Alert.alert(
        'Aucune séance',
        'Pas de séance du jour envoyable (course, vélo, natation ou musculation).',
      );
      return;
    }
    void sendWorkout(workout.id, router);
  };

  if (changing || !watch?.brandId) {
    return (
      <SettingsScreen>
        <AppScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}>
          <WatchBrandPicker
            title="Quelle montre as-tu actuellement ?"
            subtitle="Même choix pour le sommeil et l’envoi des séances (Garmin, Apple Watch…)."
            selectedId={watch?.brandId}
            onSelect={onSelect}
          />
          {watch?.brandId ? (
            <Pressable onPress={() => setChanging(false)} style={{ paddingVertical: 16 }}>
              <Text style={{ textAlign: 'center', color: colors.textMuted, fontWeight: '600' }}>
                Annuler
              </Text>
            </Pressable>
          ) : null}
        </AppScrollView>
      </SettingsScreen>
    );
  }

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.sm,
            paddingTop: spacing.md,
          }}
        >
          <Text style={{ color: colors.textMuted, lineHeight: 20 }}>
            {watchExportHint(brandId)}
          </Text>
        </View>

        <SettingsSection title="Montre actuelle">
          <SettingsRow label="Marque" value={entry?.label} showChevron={false} />
          <SettingsRow
            label="Échelle du score sommeil"
            value={entry?.scoreScaleHint}
            showChevron={false}
          />
          <SettingsRow
            label="Changer de montre"
            value="modifier"
            onPress={() => setChanging(true)}
          />
        </SettingsSection>

        <SettingsSection title="Connexion (2–3 taps max)">
          <SettingsRow
            label={linking ? 'Ouverture…' : `Ouvrir l’app ${entry?.subtitle ?? ''}`}
            value="Bluetooth / sync"
            onPress={() => void connectCompanion()}
          />
          <SettingsRow
            label={
              exporting
                ? 'Préparation…'
                : workout && canSendWorkoutToWatch(workout.discipline)
                  ? watchSendLabel(brandId)
                  : 'Envoi séance (indisponible aujourd’hui)'
            }
            value={
              workout && canSendWorkoutToWatch(workout.discipline)
                ? workout.exportedToGarmin
                  ? 'Déjà envoyée'
                  : 'Séance du jour'
                : '—'
            }
            onPress={sendToday}
          />
        </SettingsSection>

        <SettingsSection title="Sommeil">
          <SettingsRow label="Importer manuellement" onPress={() => router.push('/sleep')} />
          <SettingsRow label="Planning du sommeil" onPress={() => router.push('/sleep')} />
        </SettingsSection>
      </AppScrollView>
      {WatchPicker}
    </SettingsScreen>
  );
}

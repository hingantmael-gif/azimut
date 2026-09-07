
import { useRouter } from 'expo-router';
import { SettingsRow, SettingsScreen, SettingsSection } from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import { AppScrollView } from '../../src/ui/scrolling';

/** Ma forme — Fitness / Fatigue / TSB */
export default function PerformanceSettingsScreen() {
  const { state } = useApp();
  const router = useRouter();
  const b = state.banister;

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <SettingsSection title="Forme actuelle">
          <SettingsRow label="Fitness" value={b.fitness.toFixed(0)} showChevron={false} />
          <SettingsRow label="Fatigue" value={b.fatigue.toFixed(0)} showChevron={false} />
          <SettingsRow label="Forme (TSB)" value={b.formTsb.toFixed(0)} showChevron={false} />
        </SettingsSection>
        <SettingsSection title="Entraînement">
          <SettingsRow label="Plan du jour" onPress={() => router.push('/(tabs)/training')} />
          <SettingsRow label="Progrès et stats" onPress={() => router.push('/(tabs)/analyse')} />
          <SettingsRow label="Prédiction de course" onPress={() => router.push('/race-predictor')} />
        </SettingsSection>
      </AppScrollView>
    </SettingsScreen>
  );
}

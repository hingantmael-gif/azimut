
import { SettingsRow, SettingsScreen, SettingsSection, SettingsToggleRow } from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import type { UnitsSystem } from '../../src/types/domain';
import { AppScrollView } from '../../src/ui/scrolling';

export default function DisplaySettingsScreen() {
  const { state, dispatch } = useApp();
  const p = state.profile;

  const setUnits = (units: UnitsSystem) => {
    dispatch({ type: 'UPDATE_PROFILE', patch: { units } });
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <SettingsSection title="Unités">
          <SettingsRow
            label="Métrique (km, kg)"
            value={p.units === 'metric' ? '✓' : undefined}
            onPress={() => setUnits('metric')}
          />
          <SettingsRow
            label="Impérial (mi, lb)"
            value={p.units === 'imperial' ? '✓' : undefined}
            onPress={() => setUnits('imperial')}
          />
        </SettingsSection>

        <SettingsSection title="Carte">
          <SettingsToggleRow
            label="Afficher ma position sur la carte"
            value
            onToggle={() => undefined}
          />
        </SettingsSection>
      </AppScrollView>
    </SettingsScreen>
  );
}

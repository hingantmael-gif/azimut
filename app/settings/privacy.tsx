
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
  SettingsToggleRow,
} from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import type { ProfileVisibility } from '../../src/types/domain';
import { AppScrollView } from '../../src/ui/scrolling';

export default function PrivacySettingsScreen() {
  const { state, dispatch } = useApp();
  const p = state.profile.privacy;

  const setVisibility = (visibility: ProfileVisibility) => {
    dispatch({ type: 'UPDATE_PROFILE', patch: { privacy: { ...p, visibility } } });
  };

  const patchPrivacy = (patch: Partial<typeof p>) => {
    dispatch({ type: 'UPDATE_PROFILE', patch: { privacy: { ...p, ...patch } } });
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <SettingsSection title="Qui peut voir mon profil">
          <SettingsRow
            label="Public — volumes, évolution & aperçu programmes"
            value={p.visibility === 'public' ? '✓' : undefined}
            onPress={() => setVisibility('public')}
          />
          <SettingsRow
            label="Abonnés uniquement — comme privé sans abonnement"
            value={p.visibility === 'followers_only' ? '✓' : undefined}
            onPress={() => setVisibility('followers_only')}
          />
          <SettingsRow
            label="Privé — seuls volumes & activité sans abonnement"
            value={p.visibility === 'private' ? '✓' : undefined}
            onPress={() => setVisibility('private')}
          />
        </SettingsSection>
        <SettingsSection title="Masquer même pour les visiteurs autorisés">
          <SettingsToggleRow
            label="Masquer programmes & séances"
            value={Boolean(p.hidePrograms)}
            onToggle={() => patchPrivacy({ hidePrograms: !p.hidePrograms })}
          />
          <SettingsToggleRow
            label="Masquer temps & progression"
            value={Boolean(p.hideProgress)}
            onToggle={() => patchPrivacy({ hideProgress: !p.hideProgress })}
          />
          <SettingsToggleRow
            label="Masquer stats (volumes & activité)"
            value={Boolean(p.hideStats)}
            onToggle={() => patchPrivacy({ hideStats: !p.hideStats })}
          />
          <SettingsToggleRow
            label="Masquer fréquence cardiaque"
            value={p.hideHr}
            onToggle={() => patchPrivacy({ hideHr: !p.hideHr })}
          />
          <SettingsToggleRow
            label="Masquer poids"
            value={p.hideWeight}
            onToggle={() => patchPrivacy({ hideWeight: !p.hideWeight })}
          />
        </SettingsSection>
      </AppScrollView>
    </SettingsScreen>
  );
}

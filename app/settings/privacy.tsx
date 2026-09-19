import { useEffect, useState } from 'react';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
  SettingsToggleRow,
} from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import type { ProfileVisibility } from '../../src/types/domain';
import { AppScrollView } from '../../src/ui/scrolling';
import {
  communityGetBlocks,
  communityUnblock,
} from '../../src/api/community';
import {
  loadLocalBlocks,
  removeLocalBlock,
  applyServerBlocks,
} from '../../src/storage/communityBlocks';
import { formatUsernameDisplay } from '../../src/utils/username';

export default function PrivacySettingsScreen() {
  const { state, dispatch } = useApp();
  const p = state.profile.privacy;
  const [blocked, setBlocked] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const remote = await communityGetBlocks(state.authToken);
      if (remote?.blocked) {
        await applyServerBlocks(remote.blocked);
        if (!cancelled) setBlocked(remote.blocked.map((u) => u.toLowerCase()));
        return;
      }
      const local = await loadLocalBlocks();
      if (!cancelled) setBlocked(local);
    })();
    return () => {
      cancelled = true;
    };
  }, [state.authToken]);

  const setVisibility = (visibility: ProfileVisibility) => {
    dispatch({ type: 'UPDATE_PROFILE', patch: { privacy: { ...p, visibility } } });
  };

  const patchPrivacy = (patch: Partial<typeof p>) => {
    dispatch({ type: 'UPDATE_PROFILE', patch: { privacy: { ...p, ...patch } } });
  };

  const unblock = async (username: string) => {
    await communityUnblock(state.authToken, username);
    await removeLocalBlock(username);
    setBlocked((prev) => prev.filter((u) => u !== username));
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
        <SettingsSection title="Comptes bloqués">
          {blocked.length === 0 ? (
            <SettingsRow label="Aucun compte bloqué" />
          ) : (
            blocked.map((u) => (
              <SettingsRow
                key={u}
                label={`@${formatUsernameDisplay(u)}`}
                value="Débloquer"
                onPress={() => void unblock(u)}
              />
            ))
          )}
        </SettingsSection>
      </AppScrollView>
    </SettingsScreen>
  );
}

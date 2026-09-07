
import { SettingsRow, SettingsScreen, SettingsSection, SettingsToggleRow } from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import { AppScrollView } from '../../src/ui/scrolling';

export default function EmailPrefsScreen() {
  const { state, dispatch } = useApp();
  const n = state.profile.notifications;

  const toggle = (key: 'social' | 'eveningReminder' | 'announcements') => {
    dispatch({
      type: 'UPDATE_PROFILE',
      patch: { notifications: { ...n, [key]: !n[key] } },
    });
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <SettingsSection title="Activité">
          <SettingsToggleRow
            label="Kudos et commentaires"
            value={n.social}
            onToggle={() => toggle('social')}
          />
          <SettingsToggleRow
            label="Nouvelles activités des abonnements"
            value={n.social}
            onToggle={() => toggle('social')}
          />
        </SettingsSection>
        <SettingsSection title="Entraînement">
          <SettingsToggleRow
            label="Rappels de séance"
            value={n.preSession}
            onToggle={() =>
              dispatch({
                type: 'UPDATE_PROFILE',
                patch: { notifications: { ...n, preSession: !n.preSession } },
              })
            }
          />
          <SettingsToggleRow
            label="Résumé hebdomadaire"
            value={n.eveningReminder}
            onToggle={() => toggle('eveningReminder')}
          />
        </SettingsSection>
        <SettingsSection title="Marketing">
          <SettingsToggleRow
            label="Offres et nouveautés"
            value={n.announcements}
            onToggle={() => toggle('announcements')}
          />
        </SettingsSection>
      </AppScrollView>
    </SettingsScreen>
  );
}

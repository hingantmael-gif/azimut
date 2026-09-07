import { Text } from 'react-native';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
  SettingsToggleRow,
} from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import { AppScrollView } from '../../src/ui/scrolling';
import { requestPushPermission, syncLocalReminders } from '../../src/services/pushNotifications';
import { colors, spacing } from '../../src/theme/tokens';

export default function NotificationsSettingsScreen() {
  const { state, dispatch } = useApp();
  const n = state.profile.notifications;
  const pushOn = Boolean(state.profile.pushEnabled);

  const toggle = async (key: keyof typeof n) => {
    if (typeof n[key] !== 'boolean') return;
    const nextVal = !n[key];
    // Activer une préférence → demander la permission système si besoin
    if (nextVal && !state.profile.pushEnabled) {
      const granted = await requestPushPermission();
      dispatch({
        type: 'UPDATE_PROFILE',
        patch: {
          pushPermissionAsked: true,
          pushEnabled: granted,
          notifications: { ...n, [key]: nextVal },
        },
      });
      if (granted) void syncLocalReminders(state.reminders, true);
      return;
    }
    dispatch({
      type: 'UPDATE_PROFILE',
      patch: { notifications: { ...n, [key]: nextVal } },
    });
  };

  const toggleSystemPush = async () => {
    if (pushOn) {
      dispatch({
        type: 'UPDATE_PROFILE',
        patch: { pushEnabled: false, pushPermissionAsked: true },
      });
      void syncLocalReminders([], false);
      return;
    }
    const granted = await requestPushPermission();
    dispatch({
      type: 'UPDATE_PROFILE',
      patch: {
        pushEnabled: granted,
        pushPermissionAsked: true,
      },
    });
    if (granted) void syncLocalReminders(state.reminders, true);
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Text style={styles.hint}>
          Si tu as refusé au premier lancement, active les notifications ici. Les rappels séance,
          likes et abonnés nécessitent l’autorisation de votre téléphone.
        </Text>
        <SettingsSection title="Autorisation téléphone">
          <SettingsToggleRow
            label="Notifications push"
            value={pushOn}
            onToggle={() => {
              void toggleSystemPush();
            }}
          />
        </SettingsSection>
        <SettingsSection title="Social">
          <SettingsToggleRow
            label="Nouvel abonné & likes programmes"
            value={n.social}
            onToggle={() => {
              void toggle('social');
            }}
          />
        </SettingsSection>
        <SettingsSection title="Entraînement">
          <SettingsToggleRow
            label="Rappel avant séance"
            value={n.preSession}
            onToggle={() => {
              void toggle('preSession');
            }}
          />
          <SettingsToggleRow
            label="Rappel du soir (séance non faite)"
            value={n.eveningReminder}
            onToggle={() => {
              void toggle('eveningReminder');
            }}
          />
          <SettingsToggleRow
            label="Analyse sommeil (matin)"
            value={n.morningSleep}
            onToggle={() => {
              void toggle('morningSleep');
            }}
          />
          <SettingsToggleRow
            label="Feedback RPE"
            value={n.rpe}
            onToggle={() => {
              void toggle('rpe');
            }}
          />
        </SettingsSection>
        <SettingsSection title="Général">
          <SettingsToggleRow
            label="Annonces"
            value={n.announcements}
            onToggle={() => {
              void toggle('announcements');
            }}
          />
        </SettingsSection>
        <SettingsSection>
          <SettingsRow
            label="Heures de silence"
            value={`${n.quietHoursStart} – ${n.quietHoursEnd}`}
            showChevron={false}
          />
        </SettingsSection>
      </AppScrollView>
    </SettingsScreen>
  );
}

const styles = {
  hint: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
};

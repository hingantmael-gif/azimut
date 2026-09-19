import { Text } from 'react-native';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
  SettingsToggleRow,
} from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import { AppScrollView } from '../../src/ui/scrolling';
import {
  requestPushPermission,
  syncLocalReminders,
  usesInAppNotificationsOnly,
} from '../../src/services/pushNotifications';
import { markNotificationPromptHandled } from '../../src/storage/notificationPrompt';
import { colors, spacing } from '../../src/theme/tokens';

export default function NotificationsSettingsScreen() {
  const { state, dispatch } = useApp();
  const n = state.profile.notifications;
  const pushOn = Boolean(state.profile.pushEnabled);
  const inAppOnly = usesInAppNotificationsOnly();

  const toggle = async (key: keyof typeof n) => {
    if (typeof n[key] !== 'boolean') return;
    const nextVal = !n[key];
    if (nextVal && !state.profile.pushEnabled) {
      const granted = await requestPushPermission();
      void markNotificationPromptHandled(
        state.profile.id,
        state.profile.email,
        state.profile.username,
      );
      dispatch({
        type: 'UPDATE_PROFILE',
        patch: {
          pushPermissionAsked: true,
          pushEnabled: granted,
          notifications: { ...n, [key]: nextVal },
        },
      });
      if (granted && !inAppOnly) void syncLocalReminders(state.reminders, true);
      return;
    }
    dispatch({
      type: 'UPDATE_PROFILE',
      patch: { notifications: { ...n, [key]: nextVal } },
    });
  };

  const toggleSystemPush = async () => {
    if (pushOn) {
      void markNotificationPromptHandled(
        state.profile.id,
        state.profile.email,
        state.profile.username,
      );
      dispatch({
        type: 'UPDATE_PROFILE',
        patch: { pushEnabled: false, pushPermissionAsked: true },
      });
      if (!inAppOnly) void syncLocalReminders([], false);
      return;
    }
    const granted = await requestPushPermission();
    void markNotificationPromptHandled(
      state.profile.id,
      state.profile.email,
      state.profile.username,
    );
    dispatch({
      type: 'UPDATE_PROFILE',
      patch: {
        pushEnabled: granted,
        pushPermissionAsked: true,
      },
    });
    if (granted && !inAppOnly) void syncLocalReminders(state.reminders, true);
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Text style={styles.hint}>
          {inAppOnly
            ? 'Sur le web, les alertes s’affichent dans Mova (bannières in-app) — pas comme des notifications système du téléphone.'
            : 'Les rappels d’entraînement peuvent utiliser les notifications du téléphone. L’activité sociale apparaît aussi dans Mova.'}
        </Text>
        {!inAppOnly ? (
          <SettingsSection title="Autorisation téléphone">
            <SettingsToggleRow
              label="Notifications push"
              value={pushOn}
              onToggle={() => {
                void toggleSystemPush();
              }}
            />
          </SettingsSection>
        ) : (
          <SettingsSection title="Alertes dans Mova">
            <SettingsToggleRow
              label="Bannières in-app"
              subtitle="Likes, abonnés et rappels affichés dans l’app"
              value={pushOn}
              onToggle={() => {
                void toggleSystemPush();
              }}
            />
          </SettingsSection>
        )}

        <SettingsSection title="Rappels d'entraînement">
          <SettingsToggleRow
            label="Avant la séance"
            subtitle="Rappel pré-session"
            value={n.preSession}
            onToggle={() => {
              void toggle('preSession');
            }}
          />
          <SettingsToggleRow
            label="Le soir si séance non faite"
            subtitle="Rappel du soir"
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
            subtitle="Après une séance"
            value={n.rpe}
            onToggle={() => {
              void toggle('rpe');
            }}
          />
        </SettingsSection>

        <SettingsSection title="Activité sociale">
          <SettingsToggleRow
            label="Abonnés & likes"
            subtitle="Nouveaux abonnés, likes séance / programme"
            value={n.social}
            onToggle={() => {
              void toggle('social');
            }}
          />
        </SettingsSection>

        <SettingsSection title="Annonces">
          <SettingsToggleRow
            label="Annonces produit"
            subtitle="Nouveautés et infos Mova (optionnel)"
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

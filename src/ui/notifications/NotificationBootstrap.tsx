import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useApp } from '../../store/AppContext';
import { NotificationPermissionModal } from './NotificationPermissionModal';
import {
  ensureNotificationHandler,
  presentSocialPush,
  requestPushPermission,
  syncLocalReminders,
} from '../../services/pushNotifications';
import {
  loadNotificationPromptHandled,
  saveNotificationPromptHandled,
} from '../../storage/notificationPrompt';

/**
 * - Propose l’autorisation une seule fois (refus = plus jamais la modale)
 * - Réactivation uniquement via Réglages → Notifications
 */
export function NotificationBootstrap() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [promptVisible, setPromptVisible] = useState(false);
  const lastSocialId = useRef<string | null>(null);
  const bootstrapped = useRef(false);
  const promptHandledRef = useRef(false);
  const askedRef = useRef(Boolean(state.profile.pushPermissionAsked));

  askedRef.current = Boolean(
    state.profile.pushPermissionAsked || promptHandledRef.current,
  );

  const ready =
    Boolean(state.authToken) &&
    state.profile.emailVerified &&
    state.profile.onboardingCompleted;

  const profileId = state.profile.id;

  useEffect(() => {
    ensureNotificationHandler();
  }, []);

  useEffect(() => {
    if (!state.authToken) {
      bootstrapped.current = false;
      lastSocialId.current = null;
      promptHandledRef.current = false;
      setPromptVisible(false);
    }
  }, [state.authToken]);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    if (!ready) {
      setPromptVisible(false);
      return;
    }

    if (askedRef.current || state.profile.pushPermissionAsked) {
      setPromptVisible(false);
      return;
    }

    void (async () => {
      const stored = await loadNotificationPromptHandled(profileId);
      if (cancelled) return;

      if (stored) {
        promptHandledRef.current = true;
        askedRef.current = true;
        setPromptVisible(false);
        if (!state.profile.pushPermissionAsked) {
          dispatch({
            type: 'UPDATE_PROFILE',
            patch: { pushPermissionAsked: true, pushEnabled: false },
          });
        }
        return;
      }

      timeout = setTimeout(() => {
        if (cancelled || askedRef.current) return;
        setPromptVisible(true);
      }, 800);
    })();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [ready, state.profile.pushPermissionAsked, profileId, dispatch]);

  useEffect(() => {
    if (!ready) return;
    void syncLocalReminders(state.reminders, Boolean(state.profile.pushEnabled));
  }, [ready, state.reminders, state.profile.pushEnabled]);

  useEffect(() => {
    if (!ready || !state.profile.pushEnabled || !state.profile.notifications.social) {
      return;
    }
    const newest = state.profile.socialNotifications?.[0];

    if (!bootstrapped.current) {
      bootstrapped.current = true;
      lastSocialId.current = newest?.id ?? null;
      return;
    }

    if (!newest || newest.id === lastSocialId.current) return;
    lastSocialId.current = newest.id;
    if (!newest.read) {
      void presentSocialPush(newest);
    }
  }, [
    ready,
    state.profile.pushEnabled,
    state.profile.notifications.social,
    state.profile.socialNotifications,
  ]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/notifications');
    });
    return () => sub.remove();
  }, [router]);

  const markPromptHandled = (pushEnabled: boolean) => {
    promptHandledRef.current = true;
    askedRef.current = true;
    setPromptVisible(false);
    void saveNotificationPromptHandled(profileId);
    dispatch({
      type: 'UPDATE_PROFILE',
      patch: {
        pushPermissionAsked: true,
        pushEnabled,
      },
    });
  };

  const onAllow = async () => {
    const granted = await requestPushPermission();
    markPromptHandled(granted);
    if (granted) {
      dispatch({
        type: 'UPDATE_PROFILE',
        patch: {
          notifications: {
            ...state.profile.notifications,
            preSession: true,
            eveningReminder: true,
            social: true,
            rpe: true,
          },
        },
      });
      void syncLocalReminders(state.reminders, true);
    } else {
      void syncLocalReminders([], false);
    }
  };

  const onDeny = () => {
    markPromptHandled(false);
    void syncLocalReminders([], false);
  };

  return (
    <NotificationPermissionModal
      visible={promptVisible && !promptHandledRef.current}
      onAllow={() => {
        void onAllow();
      }}
      onDeny={onDeny}
    />
  );
}

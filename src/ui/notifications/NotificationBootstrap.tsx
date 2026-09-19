import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useApp, todayWorkout } from '../../store/AppContext';
import { NotificationPermissionModal } from './NotificationPermissionModal';
import {
  ensureNotificationHandler,
  getPushPermissionStatus,
  requestPushPermission,
  syncLocalReminders,
  usesInAppNotificationsOnly,
} from '../../services/pushNotifications';
import {
  loadNotificationPromptHandled,
  markNotificationPromptHandled,
} from '../../storage/notificationPrompt';
import {
  generateReminderCopy,
  shouldShowPreSessionBanner,
} from '../../engines/preSessionReminder';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import { SoftPulse } from '../motion/softMotion';
import { BRAND } from '../../constants/brand';

/**
 * - Web / PWA : alertes uniquement dans Mova (pas de notif téléphone / domaine GitHub)
 * - Natif : permission OS pour rappels en arrière-plan ; social = toast in-app
 * - Bandeau pré-séance in-app
 */
export function NotificationBootstrap() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const [promptVisible, setPromptVisible] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const lastSocialId = useRef<string | null>(null);
  const seenSocialIds = useRef<Set<string>>(new Set());
  const bootstrapped = useRef(false);
  const promptHandledRef = useRef(Boolean(state.profile.pushPermissionAsked));
  const checkGen = useRef(0);
  const inAppOnly = usesInAppNotificationsOnly();

  const ready =
    Boolean(state.authToken) &&
    state.profile.emailVerified &&
    state.profile.onboardingCompleted;

  const profileId = state.profile.id;
  const email = state.profile.email;
  const username = state.profile.username;

  const today = todayWorkout(state.plan);
  const todayIso = new Date().toISOString().slice(0, 10);
  const sessionDoneToday = state.activities.some(
    (a) => a.startDate.slice(0, 10) === todayIso,
  );

  const preCopy = useMemo(() => {
    if (!today || today.discipline === 'rest') return null;
    return generateReminderCopy({
      sessionTitle: today.title,
      formTsb: state.banister.formTsb,
      sleepScore: state.health.sleep?.score,
      hoursUntilApprox: 2,
      sessionDate: today.date,
    });
  }, [today, state.banister.formTsb, state.health.sleep?.score]);

  const showBanner =
    ready &&
    !bannerDismissed &&
    Boolean(state.profile.notifications.preSession) &&
    shouldShowPreSessionBanner({
      todayWorkout: today,
      sessionDoneToday,
    }) &&
    Boolean(preCopy);

  useEffect(() => {
    ensureNotificationHandler();
  }, []);

  useEffect(() => {
    if (!state.authToken) {
      bootstrapped.current = false;
      lastSocialId.current = null;
      seenSocialIds.current = new Set();
      promptHandledRef.current = false;
      setPromptVisible(false);
      setBannerDismissed(false);
    }
  }, [state.authToken]);

  useEffect(() => {
    promptHandledRef.current = Boolean(state.profile.pushPermissionAsked);
    setPromptVisible(false);
  }, [profileId]);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const gen = ++checkGen.current;

    setPromptVisible(false);

    if (!ready) {
      return () => {
        cancelled = true;
        if (timeout) clearTimeout(timeout);
      };
    }

    // Web : activer les alertes in-app sans demander la permission téléphone
    if (inAppOnly) {
      if (!state.profile.pushPermissionAsked || !state.profile.pushEnabled) {
        promptHandledRef.current = true;
        void markNotificationPromptHandled(profileId, email, username);
        dispatch({
          type: 'UPDATE_PROFILE',
          patch: {
            pushPermissionAsked: true,
            pushEnabled: true,
          },
        });
      } else {
        promptHandledRef.current = true;
      }
      return () => {
        cancelled = true;
        if (timeout) clearTimeout(timeout);
      };
    }

    if (state.profile.pushPermissionAsked || promptHandledRef.current) {
      promptHandledRef.current = true;
      return () => {
        cancelled = true;
        if (timeout) clearTimeout(timeout);
      };
    }

    void (async () => {
      const [stored, osStatus] = await Promise.all([
        loadNotificationPromptHandled(profileId, email, username),
        getPushPermissionStatus(),
      ]);
      if (cancelled || gen !== checkGen.current) return;

      const osSettled = osStatus === 'denied' || osStatus === 'granted';
      if (stored || osSettled) {
        promptHandledRef.current = true;
        await markNotificationPromptHandled(profileId, email, username);
        if (!state.profile.pushPermissionAsked) {
          dispatch({
            type: 'UPDATE_PROFILE',
            patch: {
              pushPermissionAsked: true,
              pushEnabled: osStatus === 'granted',
            },
          });
        } else if (osStatus === 'granted' && !state.profile.pushEnabled) {
          dispatch({
            type: 'UPDATE_PROFILE',
            patch: { pushEnabled: true },
          });
        }
        return;
      }

      timeout = setTimeout(() => {
        if (cancelled || gen !== checkGen.current || promptHandledRef.current) {
          return;
        }
        setPromptVisible(true);
      }, 800);
    })();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [
    ready,
    inAppOnly,
    state.profile.pushPermissionAsked,
    state.profile.pushEnabled,
    profileId,
    email,
    username,
    dispatch,
  ]);

  useEffect(() => {
    if (!ready || inAppOnly) return;
    void syncLocalReminders(state.reminders, Boolean(state.profile.pushEnabled));
  }, [ready, inAppOnly, state.reminders, state.profile.pushEnabled]);

  useEffect(() => {
    if (!ready || inAppOnly || !state.profile.pushEnabled) return;
    if (!state.profile.notifications.preSession) return;
    void syncLocalReminders(state.reminders, true);
  }, [
    ready,
    inAppOnly,
    state.profile.pushEnabled,
    state.profile.notifications.preSession,
    today?.id,
    sessionDoneToday,
    state.reminders,
  ]);

  // Suivi social pour la cloche — pas de push OS (toast = SocialInboxBootstrap)
  useEffect(() => {
    if (!ready || !state.profile.notifications.social) return;
    const list = state.profile.socialNotifications ?? [];
    if (!bootstrapped.current) {
      bootstrapped.current = true;
      lastSocialId.current = list[0]?.id ?? null;
      seenSocialIds.current = new Set(list.map((n) => n.id));
      return;
    }
    for (const n of list) seenSocialIds.current.add(n.id);
    if (list[0]) lastSocialId.current = list[0].id;
  }, [ready, state.profile.notifications.social, state.profile.socialNotifications]);

  useEffect(() => {
    if (inAppOnly) return;
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/notifications');
    });
    return () => sub.remove();
  }, [router, inAppOnly]);

  const markPromptHandled = (pushEnabled: boolean) => {
    promptHandledRef.current = true;
    setPromptVisible(false);
    void markNotificationPromptHandled(profileId, email, username);
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
      if (!inAppOnly) void syncLocalReminders(state.reminders, true);
    } else if (!inAppOnly) {
      void syncLocalReminders([], false);
    }
  };

  const onDeny = () => {
    markPromptHandled(false);
    if (!inAppOnly) void syncLocalReminders([], false);
  };

  return (
    <>
      {showBanner && preCopy ? (
        <View pointerEvents="box-none" style={styles.bannerHost}>
          <SoftPulse intensity={0.03}>
            <Pressable
              style={[
                styles.banner,
                {
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.accent,
                },
              ]}
              onPress={() => {
                if (today) router.push(`/session/${today.id}`);
              }}
              accessibilityRole="button"
              accessibilityLabel={preCopy.title}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.eyebrow, { color: colors.accent }]}>
                  {BRAND.name.toUpperCase()}
                </Text>
                <Text style={[styles.bannerTitle, { color: colors.text }]}>
                  {preCopy.title}
                </Text>
                <Text
                  style={[styles.bannerBody, { color: colors.textMuted }]}
                  numberOfLines={2}
                >
                  {preCopy.body}
                </Text>
              </View>
              <Pressable
                onPress={() => setBannerDismissed(true)}
                hitSlop={10}
                accessibilityLabel="Fermer le rappel"
              >
                <Text style={[styles.bannerClose, { color: colors.textMuted }]}>✕</Text>
              </Pressable>
            </Pressable>
          </SoftPulse>
        </View>
      ) : null}
      <NotificationPermissionModal
        visible={promptVisible && !promptHandledRef.current && !inAppOnly}
        inAppOnly={false}
        onAllow={() => {
          void onAllow();
        }}
        onDeny={onDeny}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bannerHost: {
    position: 'absolute',
    top: 52,
    left: spacing.md,
    right: spacing.md,
    zIndex: 40,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  eyebrow: {
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  bannerTitle: { fontWeight: '800', fontSize: 14 },
  bannerBody: { marginTop: 2, fontSize: 12, lineHeight: 16 },
  bannerClose: { fontSize: 16, fontWeight: '700', paddingLeft: 4 },
});

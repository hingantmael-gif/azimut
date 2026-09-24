import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import { useRouter } from 'expo-router';
import { useApp } from '../../store/AppContext';
import { claimSocialInboxEvents } from '../../storage/socialInbox';
import { showSystemNotification, socialPushCopy } from '../../services/pushNotifications';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import { SoftPulse } from '../motion/softMotion';
import { communityPullNotifications } from '../../api/community';
import type { SocialNotification } from '../../types/domain';
import { BRAND } from '../../constants/brand';

/** Polling adaptatif — lots plafonnés pour ne pas surcharger l’UI. */
const INTERVAL_BURST_MS = 2_500;
const INTERVAL_ACTIVE_MS = 8_000;
const INTERVAL_IDLE_MS = 28_000;
const MAX_PER_TICK = 5;

function mapCloudNotif(n: {
  id: string;
  type: string;
  fromUsername?: string;
  createdAt?: string;
}): SocialNotification | null {
  const from = (n.fromUsername || 'mova').toLowerCase();
  const kind =
    n.type === 'follow_request'
      ? 'follow_request'
      : n.type === 'follow'
        ? 'new_follower'
        : n.type === 'like_post'
          ? 'session_like'
          : null;
  if (!kind) return null;
  return {
    id: n.id,
    kind,
    fromUsername: from,
    fromDisplayName: from,
    createdAt: n.createdAt || new Date().toISOString(),
    read: false,
    requestStatus: kind === 'follow_request' ? 'pending' : undefined,
  };
}

/**
 * Livre la boîte sociale en live :
 * - inbox locale (même appareil)
 * - + notifications cloud `/community/notifications` quand token remote
 */
export function SocialInboxBootstrap() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const [toast, setToast] = useState<{ title: string; body: string } | null>(
    null,
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emptyStreak = useRef(0);
  const busy = useRef(false);
  const username = (state.profile.username ?? '').trim().toLowerCase();
  const ready =
    Boolean(state.authToken) &&
    state.profile.emailVerified &&
    state.profile.onboardingCompleted;

  const showToast = useCallback((title: string, body: string) => {
    setToast({ title, body });
    // App en arrière-plan (PWA) : la même alerte part aussi en notification système.
    void showSystemNotification(title, body, '/notifications');
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const flush = useCallback(async () => {
    if (!ready || !username || busy.current) return;
    if (!state.profile.notifications.social) return;
    busy.current = true;
    try {
      const localBatch = await claimSocialInboxEvents(username, MAX_PER_TICK);
      const cloud = await communityPullNotifications(state.authToken);
      const cloudBatch = (cloud?.notifications ?? [])
        .map(mapCloudNotif)
        .filter(Boolean) as SocialNotification[];
      const batch = [...cloudBatch, ...localBatch].slice(0, MAX_PER_TICK);
      if (batch.length === 0) {
        emptyStreak.current += 1;
        return;
      }
      emptyStreak.current = 0;
      const likeKinds = new Set(['session_like', 'program_like']);
      const likes = batch.filter((n) => likeKinds.has(n.kind));
      for (const notification of batch) {
        dispatch({ type: 'PUSH_SOCIAL_NOTIFICATION', notification });
      }
      if (likes.length >= 2) {
        const n = likes.length;
        const hasSession = likes.some((l) => l.kind === 'session_like');
        const hasProgram = likes.some((l) => l.kind === 'program_like');
        const target =
          hasSession && hasProgram
            ? 'séance/programme'
            : hasProgram
              ? 'programme'
              : 'séance';
        showToast(
          'Nouveaux likes',
          `${n} personnes ont aimé votre ${target}`,
        );
      } else {
        const first = batch[0];
        if (first) {
          const copy = socialPushCopy(first);
          showToast(copy.title, copy.body);
        }
      }
    } finally {
      busy.current = false;
    }
  }, [
    ready,
    username,
    state.authToken,
    state.profile.notifications.social,
    dispatch,
    showToast,
  ]);

  // Poll adaptatif
  useEffect(() => {
    if (!ready || !username) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      const ms =
        emptyStreak.current === 0
          ? INTERVAL_BURST_MS
          : emptyStreak.current < 3
            ? INTERVAL_ACTIVE_MS
            : INTERVAL_IDLE_MS;
      timer = setTimeout(() => {
        if (cancelled) return;
        void flush().finally(() => {
          if (!cancelled) schedule();
        });
      }, ms);
    };

    void flush().finally(() => {
      if (!cancelled) schedule();
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [ready, username, flush]);

  // Retour au premier plan → livraison immédiate
  useEffect(() => {
    if (!ready) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        emptyStreak.current = 0;
        void flush();
      }
    });
    return () => sub.remove();
  }, [ready, flush]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <SoftPulse intensity={0.03}>
        <Pressable
          style={[
            styles.toast,
            {
              backgroundColor: colors.bgElevated,
              borderColor: colors.accent,
            },
          ]}
          onPress={() => {
            setToast(null);
            router.push('/notifications');
          }}
          accessibilityRole="button"
          accessibilityLabel={toast.title}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>
              {BRAND.name.toUpperCase()}
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>{toast.title}</Text>
            <Text
              style={[styles.body, { color: colors.textMuted }]}
              numberOfLines={2}
            >
              {toast.body}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: colors.accent }]}>›</Text>
        </Pressable>
      </SoftPulse>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 52,
    left: spacing.md,
    right: spacing.md,
    zIndex: 45,
  },
  toast: {
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
  title: { fontWeight: '800', fontSize: 14 },
  eyebrow: {
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  body: { marginTop: 2, fontSize: 12, lineHeight: 16 },
  chevron: { fontSize: 22, fontWeight: '300' },
});

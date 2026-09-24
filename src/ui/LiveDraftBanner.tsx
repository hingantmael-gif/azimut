import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from './Text';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  formatLiveClock,
  formatLiveDistance,
} from '../engines/liveWorkout';
import {
  liveDraftResumeParams,
  loadLiveDraft,
  type LiveSessionDraft,
} from '../storage/liveSessionDraft';
import { useThemeColors } from '../theme/ThemeContext';
import { radii, spacing } from '../theme/tokens';
import { PressableScale } from './motion/softMotion';

/** Bannière « reprendre la séance » si un brouillon GPS existe. */
export function LiveDraftBanner() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const [draft, setDraft] = useState<LiveSessionDraft | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void loadLiveDraft().then((d) => {
        if (alive) setDraft(d);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  if (!draft) return null;

  return (
    <PressableScale
      variant="nav"
      onPress={() =>
        router.push({
          pathname: '/session/live',
          params: liveDraftResumeParams(draft),
        })
      }
      contentStyle={[
        styles.card,
        {
          backgroundColor: `${colors.accent}18`,
          borderColor: colors.accent,
        },
      ]}
    >
      <Text style={[styles.kicker, { color: colors.accent }]}>Reprendre la séance</Text>
      <Text style={[styles.title, { color: colors.text }]}>{draft.title}</Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        {formatLiveDistance(draft.distanceM)} · {formatLiveClock(draft.elapsedSec)} · sauvegardée
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: { marginTop: 4, fontSize: 17, fontWeight: '800' },
  meta: { marginTop: 2, fontSize: 13, fontWeight: '600' },
});

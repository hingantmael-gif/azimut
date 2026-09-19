import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { SentinelReport } from '../../engines/sentinel';
import { loadLiveDraft } from '../../storage/liveSessionDraft';
import { LiveDraftBanner } from '../LiveDraftBanner';
import { SoftPulse, PressableScale } from '../motion/softMotion';
import { useThemeColors } from '../../theme/ThemeContext';
import type { ColorPalette } from '../../theme/palettes';
import { radii, spacing } from '../../theme/tokens';

type Props = {
  sentinel: SentinelReport | null | undefined;
  coachBanner:
    | { title: string; body: string; onPress: () => void; pulse?: boolean }
    | null;
};

type Slot =
  | { id: 'draft'; priority: 0 }
  | {
      id: 'sentinel';
      priority: 1 | 3;
      level: string;
      message: string;
    }
  | {
      id: 'coach';
      priority: 2;
      title: string;
      body: string;
      onPress: () => void;
      pulse?: boolean;
    };

/**
 * Un seul bandeau visible : LiveDraft > Sentinelle strong > Coach > Sentinelle watch.
 * Les autres via indicateur « +N ».
 */
export function HomeStatusStack({
  sentinel,
  coachBanner,
}: Props) {
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void loadLiveDraft().then((d) => {
        if (alive) setHasDraft(Boolean(d));
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const slots = useMemo(() => {
    const list: Slot[] = [];
    if (hasDraft) list.push({ id: 'draft', priority: 0 });
    if (sentinel && sentinel.level !== 'ok') {
      const strong =
        sentinel.level === 'deload' || sentinel.level === 'adapt';
      list.push({
        id: 'sentinel',
        priority: strong ? 1 : 3,
        level: sentinel.level,
        message: sentinel.message,
      });
    }
    if (coachBanner) {
      list.push({
        id: 'coach',
        priority: 2,
        title: coachBanner.title,
        body: coachBanner.body,
        onPress: coachBanner.onPress,
        pulse: coachBanner.pulse,
      });
    }
    return list.sort((a, b) => a.priority - b.priority);
  }, [sentinel, coachBanner, hasDraft]);

  const primary = slots[0] ?? null;
  const extras = slots.slice(1);

  if (!primary) return null;

  return (
    <View style={styles.wrap}>
      {primary.id === 'draft' ? <LiveDraftBanner /> : null}

      {primary.id === 'sentinel' ? (
        <SoftPulse intensity={0.04}>
          <PressableScale
            variant="nav"
            style={styles.sentinelBanner}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/body',
                params: { tab: 'performance' },
              })
            }
          >
            <Text style={styles.sentinelTitle}>
              {primary.level === 'deload'
                ? 'Sentinelle · allège'
                : primary.level === 'adapt'
                  ? 'Sentinelle · adapte'
                  : 'Sentinelle · à surveiller'}
            </Text>
            <Text style={styles.sentinelSub} numberOfLines={3}>
              {primary.message}
            </Text>
          </PressableScale>
        </SoftPulse>
      ) : null}

      {primary.id === 'coach' ? (
        <SoftPulse intensity={primary.pulse ? 0.05 : 0}>
          <PressableScale
            variant="nav"
            style={styles.coachBanner}
            onPress={primary.onPress}
          >
            <Text style={styles.coachBannerTitle}>{primary.title}</Text>
            <Text style={styles.coachBannerSub} numberOfLines={3}>
              {primary.body}
            </Text>
            <Text style={styles.coachLink}>Voir ›</Text>
          </PressableScale>
        </SoftPulse>
      ) : null}

      {extras.length > 0 ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={styles.moreChip}
          accessibilityRole="button"
        >
          <Text style={styles.moreChipText}>
            {expanded
              ? 'Masquer'
              : `+${extras.length} signal${extras.length > 1 ? 's' : ''}`}
          </Text>
        </Pressable>
      ) : null}

      {expanded
        ? extras.map((s) => {
            if (s.id === 'draft') {
              return <LiveDraftBanner key="ex-draft" />;
            }
            if (s.id === 'sentinel') {
              return (
                <PressableScale
                  key={`ex-${s.id}-${s.level}`}
                  variant="nav"
                  style={[styles.sentinelBanner, { opacity: 0.92 }]}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/body',
                      params: { tab: 'performance' },
                    })
                  }
                >
                  <Text style={styles.sentinelTitle}>Sentinelle</Text>
                  <Text style={styles.sentinelSub} numberOfLines={2}>
                    {s.message}
                  </Text>
                </PressableScale>
              );
            }
            if (s.id === 'coach') {
              return (
                <PressableScale
                  key="ex-coach"
                  variant="nav"
                  style={[styles.coachBanner, { opacity: 0.92 }]}
                  onPress={s.onPress}
                >
                  <Text style={styles.coachBannerTitle}>{s.title}</Text>
                  <Text style={styles.coachBannerSub} numberOfLines={2}>
                    {s.body}
                  </Text>
                </PressableScale>
              );
            }
            return null;
          })
        : null}
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: { gap: spacing.sm, marginBottom: spacing.sm },
    sentinelBanner: {
      marginHorizontal: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: `${colors.warn}18`,
      borderWidth: 1,
      borderColor: colors.warn,
    },
    sentinelTitle: {
      fontWeight: '800',
      fontSize: 14,
      color: colors.text,
    },
    sentinelSub: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    coachBanner: {
      marginHorizontal: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.accentLight,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    coachBannerTitle: {
      fontWeight: '800',
      fontSize: 14,
      color: colors.accentDark,
    },
    coachBannerSub: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    coachLink: {
      marginTop: 6,
      fontWeight: '800',
      fontSize: 13,
      color: colors.accent,
    },
    moreChip: {
      alignSelf: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    moreChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
    },
  });
}

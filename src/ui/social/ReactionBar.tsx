import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import { useThemeColors } from '../../theme/ThemeContext';
import type { ColorPalette } from '../../theme/palettes';
import { PressableScale } from '../motion/softMotion';

export type ReactionKind = 'costaud' | 'regulier' | 'bravo';

const REACTIONS: Array<{ id: ReactionKind; label: string }> = [
  { id: 'costaud', label: '💪 Costaud' },
  { id: 'regulier', label: '🔥 Régulier' },
  { id: 'bravo', label: '👏 Bravo' },
];

type Props = {
  counts?: Record<string, number>;
  selected?: string | null;
  likeCount: number;
  liked: boolean;
  onLike: () => void;
  onReact: (kind: ReactionKind) => void;
  onMore?: () => void;
};

/** Like + réactions courtes (différenciant vs like plat). */
export function ReactionBar({
  counts = {},
  selected,
  likeCount,
  liked,
  onLike,
  onReact,
  onMore,
}: Props) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <PressableScale
        variant="pop"
        onPress={onLike}
        contentStyle={[styles.chip, liked && styles.chipOn]}
      >
        <Text style={[styles.chipText, liked && styles.chipTextOn]}>
          ♥ {likeCount}
        </Text>
      </PressableScale>
      {REACTIONS.map((r) => {
        const on = selected === r.id;
        const n = counts[r.id] ?? 0;
        return (
          <PressableScale
            key={r.id}
            variant="subtle"
            onPress={() => onReact(r.id)}
            contentStyle={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
              {r.label}
              {n > 0 ? ` ${n}` : ''}
            </Text>
          </PressableScale>
        );
      })}
      {onMore ? (
        <PressableScale variant="subtle" onPress={onMore} contentStyle={styles.more}>
          <Text style={styles.moreText}>···</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    chipOn: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    chipText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
    chipTextOn: { color: colors.accent },
    more: {
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    moreText: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textMuted,
      letterSpacing: 1,
    },
  });
}

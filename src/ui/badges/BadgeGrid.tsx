import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BadgeViewModel } from '../../engines/achievements';
import { useThemeColors } from '../../theme/ThemeContext';
import type { ColorPalette } from '../../theme/palettes';
import { radii, spacing } from '../../theme/tokens';

type Props = {
  badges: BadgeViewModel[];
  accentColor: string;
  accentSoft: string;
};

/** Grille badges — carte avec progression (Classé, liste complète). */
export function BadgeGrid({ badges, accentColor, accentSoft }: Props) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.badgeGrid}>
      {badges.map((b) => (
        <Pressable
          key={b.id}
          style={[
            styles.badgeCard,
            b.unlocked
              ? { borderColor: accentColor, backgroundColor: accentSoft }
              : styles.badgeLocked,
          ]}
        >
          <Text style={[styles.badgeEmoji, !b.unlocked && { opacity: 0.35 }]}>
            {b.emoji}
          </Text>
          <Text
            style={[
              styles.badgeDiff,
              !b.unlocked && { color: colors.textMuted },
              b.unlocked && { color: accentColor },
            ]}
          >
            {b.difficultyLabel} · +{b.xpReward} XP
          </Text>
          <Text
            style={[styles.badgeTitle, !b.unlocked && { color: colors.textMuted }]}
            numberOfLines={2}
          >
            {b.title}
          </Text>
          <Text style={styles.badgeDesc} numberOfLines={2}>
            {b.description}
          </Text>
          <View style={styles.badgeTrack}>
            <View
              style={[
                styles.badgeFill,
                {
                  width: `${Math.round(b.progress * 100)}%`,
                  backgroundColor: b.unlocked ? accentColor : colors.borderStrong,
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.badgePct,
              b.unlocked ? { color: accentColor } : { color: colors.textMuted },
            ]}
          >
            {b.unlocked
              ? `Débloqué · +${b.xpReward} XP`
              : b.progressLabel}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    badgeGrid: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    badgeCard: {
      width: '48%',
      flexGrow: 1,
      minWidth: '46%',
      maxWidth: '48%',
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      backgroundColor: colors.bg,
    },
    badgeLocked: {
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    badgeEmoji: { fontSize: 28 },
    badgeDiff: {
      marginTop: 6,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      color: colors.textMuted,
    },
    badgeTitle: {
      marginTop: 8,
      fontWeight: '800',
      fontSize: 14,
      color: colors.text,
      minHeight: 36,
    },
    badgeDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
      minHeight: 32,
    },
    badgeTrack: {
      marginTop: 10,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.bgSecondary,
      overflow: 'hidden',
    },
    badgeFill: { height: '100%', borderRadius: 4 },
    badgePct: { marginTop: 6, fontSize: 11, fontWeight: '700' },
  });
}

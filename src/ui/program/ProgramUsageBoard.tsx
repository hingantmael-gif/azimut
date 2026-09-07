import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ProgramSportCategory } from '../../constants/programs';
import { POPULAR_SPORT_CATEGORIES } from '../../constants/programs';
import { disciplineColor } from '../../constants/disciplines';
import {
  buildMixedProgramUsageRanking,
  buildProgramUsageRanking,
  usageCountCaption,
  usageCountLabel,
  type ProgramUsageRow,
} from '../../engines/programPopularity';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { ColorPalette } from '../../theme/palettes';

type SportFilter = ProgramSportCategory | 'all';

type Props = {
  countedTemplateId?: string | null;
  /** Nombre de lignes affichées */
  limit?: number;
  /** Si true, ouvre le wizard sur ce template (via query) */
  allowStart?: boolean;
  /** Top mixte multi-sports (défaut) ou classement strict */
  mixed?: boolean;
};

const FILTER_CHIPS: Array<{ id: SportFilter; label: string }> = [
  { id: 'all', label: 'Tous sports' },
  ...POPULAR_SPORT_CATEGORIES.map((c) => ({ id: c.id as SportFilter, label: c.label })),
  { id: 'other', label: 'Duathlon' },
];

/**
 * Classement des programmes les plus utilisés — multi-disciplines, filtrable.
 */
export function ProgramUsageBoard({
  countedTemplateId,
  limit = 8,
  allowStart = true,
  mixed = true,
}: Props) {
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [sportFilter, setSportFilter] = useState<SportFilter>('all');

  const rows = useMemo(() => {
    if (sportFilter === 'all' && mixed) {
      return buildMixedProgramUsageRanking(countedTemplateId, new Date(), limit);
    }
    return buildProgramUsageRanking(countedTemplateId, new Date(), limit, sportFilter);
  }, [countedTemplateId, limit, mixed, sportFilter]);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>Programmes les plus utilisés</Text>
        <Text style={styles.sub}>
          Course, natation, vélo, triathlon, muscu… · depuis le lancement
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {FILTER_CHIPS.map((chip) => (
          <Pressable
            key={chip.id}
            style={[styles.chip, sportFilter === chip.id && styles.chipActive]}
            onPress={() => setSportFilter(chip.id)}
          >
            <Text
              style={[
                styles.chipText,
                sportFilter === chip.id && styles.chipTextActive,
              ]}
            >
              {chip.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {rows.length === 0 ? (
        <Text style={styles.empty}>Aucun programme pour ce filtre.</Text>
      ) : (
        rows.map((row) => (
          <UsageRow
            key={row.templateId}
            row={row}
            styles={styles}
            onPress={
              allowStart
                ? () =>
                    router.push({
                      pathname: '/program/new',
                      params: { templateId: row.templateId },
                    })
                : undefined
            }
          />
        ))
      )}
    </View>
  );
}

function UsageRow({
  row,
  styles,
  onPress,
}: {
  row: ProgramUsageRow;
  styles: ReturnType<typeof makeStyles>;
  onPress?: () => void;
}) {
  const medal =
    row.rank === 1 ? '#EAB308' : row.rank === 2 ? '#94A3B8' : row.rank === 3 ? '#B45309' : null;
  const dotColor = disciplineColor(row.primaryDiscipline);

  const inner = (
    <>
      <View style={[styles.rankBadge, medal ? { backgroundColor: medal } : null]}>
        <Text style={[styles.rankText, medal ? { color: '#111' } : null]}>
          {row.rank}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <View style={[styles.sportDot, { backgroundColor: dotColor }]} />
          <Text style={styles.rowTitle} numberOfLines={1}>
            {row.title}
          </Text>
        </View>
        <Text style={styles.rowSub} numberOfLines={1}>
          {row.subtitle}
        </Text>
        <View style={[styles.sportPill, { backgroundColor: `${dotColor}18` }]}>
          <Text style={[styles.sportPillText, { color: dotColor }]}>{row.sportLabel}</Text>
        </View>
      </View>
      <View style={styles.countCol}>
        <Text style={styles.countN}>{usageCountLabel(row.count)}</Text>
        <Text style={styles.countL}>{usageCountCaption()}</Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.row} onPress={onPress}>
        {inner}
      </Pressable>
    );
  }
  return <View style={styles.row}>{inner}</View>;
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    head: { marginBottom: 4 },
    title: {
      fontWeight: '800',
      fontSize: 16,
      color: colors.text,
    },
    sub: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
    chips: {
      gap: 8,
      paddingVertical: 4,
      paddingRight: spacing.sm,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.accentLight,
      borderColor: colors.accent,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: colors.accentDark,
    },
    empty: {
      fontSize: 13,
      color: colors.textMuted,
      paddingVertical: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rankBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: {
      fontWeight: '900',
      fontSize: 13,
      color: colors.textSecondary,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sportDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    rowTitle: { fontWeight: '800', fontSize: 14, color: colors.text, flex: 1 },
    rowSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
    sportPill: {
      alignSelf: 'flex-start',
      marginTop: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.sm,
    },
    sportPillText: { fontSize: 10, fontWeight: '800' },
    countCol: { alignItems: 'flex-end', minWidth: 78 },
    countN: { fontWeight: '900', fontSize: 15, color: colors.accent },
    countL: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textAlign: 'right' },
  });
}

import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WATCH_CATALOG, type WatchCatalogEntry } from '../../constants/watches';
import type { WatchBrandId } from '../../types/domain';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { ColorPalette } from '../../theme/palettes';

type Props = {
  title?: string;
  subtitle?: string;
  selectedId?: WatchBrandId | null;
  onSelect: (id: WatchBrandId) => void;
};

export function WatchBrandPicker({
  title = 'Quelle montre as-tu actuellement ?',
  subtitle = 'Choisis la marque qui enregistre ton sommeil le plus précisément.',
  selectedId,
  onSelect,
}: Props) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {WATCH_CATALOG.map((watch) => (
        <WatchOption
          key={watch.id}
          watch={watch}
          selected={selectedId === watch.id}
          onPress={() => onSelect(watch.id)}
          styles={styles}
          colors={colors}
        />
      ))}
    </View>
  );
}

function WatchOption({
  watch,
  selected,
  onPress,
  styles,
  colors,
}: {
  watch: WatchCatalogEntry;
  selected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ColorPalette;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && { borderColor: colors.accent, backgroundColor: colors.bgSecondary }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{watch.label}</Text>
        <Text style={styles.cardSub}>{watch.subtitle}</Text>
        <Text style={styles.cardHint}>{watch.scoreScaleHint}</Text>
      </View>
      {selected ? <Text style={[styles.check, { color: colors.accent }]}>✓</Text> : null}
    </Pressable>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: { gap: spacing.sm },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      lineHeight: 21,
      marginBottom: spacing.md,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      marginBottom: spacing.sm,
    },
    cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    cardHint: { fontSize: 13, color: colors.text, marginTop: 6, lineHeight: 18, opacity: 0.85 },
    check: { fontSize: 20, fontWeight: '700' },
  });
}

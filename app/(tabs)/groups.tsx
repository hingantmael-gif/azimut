import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { AppFlatList } from '../../src/ui/scrolling';

const CLUBS = [
  { id: '1', name: 'Runners Paris', members: 1240 },
  { id: '2', name: 'Trail Bretagne', members: 890 },
  { id: '3', name: 'Triathlon Nantes', members: 456 },
];

/** Groupes / clubs — type Strava */
export default function GroupsScreen() {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <AppFlatList
        data={CLUBS}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={
          <Text style={styles.header}>Mes groupes et clubs</Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name[0]}</Text>
            </View>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.members} membres</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary },
    header: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      padding: spacing.md,
      backgroundColor: colors.bg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.accent, fontWeight: '800' },
    name: { fontSize: 16, fontWeight: '600', color: colors.text },
    meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  });
}

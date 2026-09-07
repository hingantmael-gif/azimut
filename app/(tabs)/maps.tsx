import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';

/** Cartes — segments et exploration (placeholder) */
export default function MapsScreen() {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Cartes</Text>
      <View style={styles.map}>
        <Text style={styles.mapLabel}>Carte · segments · routes</Text>
      </View>
      <Text style={styles.sub}>Explorez vos parcours et segments locaux.</Text>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary, padding: spacing.md },
    title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
    map: {
      height: 280,
      backgroundColor: colors.border,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapLabel: { color: colors.textMuted, fontWeight: '600' },
    sub: { marginTop: spacing.md, color: colors.textSecondary, fontSize: 14 },
  });
}

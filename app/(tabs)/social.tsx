import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Body, Chip, Muted, PrimaryButton, Screen, Title } from '../../src/ui/primitives';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { AppFlatList } from '../../src/ui/scrolling';

const FEED = [
  { id: '1', user: '@lea_run', text: '6x1000m validés — kudos !', km: 12.4 },
  { id: '2', user: '@marc_trail', text: 'Sortie longue 22 km D+ 650', km: 22 },
  { id: '3', user: '@nina_tri', text: 'Brick vélo + footing transition', km: 45 },
];

/** CDC §8.A — Social Follow / kudos */
export default function SocialScreen() {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [kudos, setKudos] = useState<Record<string, number>>({
    '1': 12,
    '2': 8,
    '3': 5,
  });

  return (
    <Screen style={{ paddingTop: spacing.md }}>
      <Title>Social</Title>
      <Muted>Recherche, abonnements, kudos & commentaires.</Muted>
      <View style={styles.row}>
        <Chip label="Recherche @pseudo" selected={!!query} onPress={() => setQuery('demo')} />
        <Chip label="Contacts" onPress={() => undefined} />
      </View>
      <AppFlatList
        data={FEED}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Body>{item.user}</Body>
            <Muted>{item.text}</Muted>
            <Muted>{item.km} km</Muted>
            <PrimaryButton
              label={`Kudos (${kudos[item.id] ?? 0})`}
              onPress={() =>
                setKudos((k) => ({ ...k, [item.id]: (k[item.id] ?? 0) + 1 }))
              }
            />
          </View>
        )}
      />
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: spacing.md },
    card: {
      padding: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: colors.bgElevated,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import { PressableScale, RevealPanel } from '../motion/softMotion';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';

type Props = {
  whyLine: string;
};

/** « Pourquoi ? » sous le bandeau statut — expand inline. */
export function WhyCoachExpand({ whyLine }: Props) {
  const { colors } = useThemeColors();
  const [open, setOpen] = useState(false);
  if (!whyLine.trim()) return null;

  return (
    <View style={styles.wrap}>
      <PressableScale
        variant="subtle"
        onPress={() => setOpen((v) => !v)}
        accessibilityLabel={open ? 'Masquer pourquoi' : 'Pourquoi'}
        contentStyle={styles.toggle}
      >
        <Text style={[styles.toggleText, { color: colors.accent }]}>
          {open ? 'Masquer' : 'Pourquoi ?'}
        </Text>
      </PressableScale>
      {open ? (
        <RevealPanel
          resetKey={whyLine}
          duration={480}
          style={[styles.box, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
        >
          <Text style={[styles.why, { color: colors.text }]}>{whyLine}</Text>
        </RevealPanel>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm, marginTop: -2 },
  toggle: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  box: {
    marginTop: 6,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  why: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});

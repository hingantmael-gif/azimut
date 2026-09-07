import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import { isPremiumUiVisible } from '../../premium/featureFlags';
import { ProCrown } from './ProCrown';

type Props = {
  label?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Forcer l’affichage (tests / story) — ignore le flag. */
  force?: boolean;
};

/**
 * Pastille « Pro » façon Canva (couronne + libellé).
 * Ne rend rien tant que PREMIUM_UI_ENABLED = false.
 */
export function ProLockBadge({ label = 'Pro', onPress, style, force = false }: Props) {
  const { colors } = useThemeColors();
  if (!force && !isPremiumUiVisible()) return null;

  const content = (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.accentLight,
          borderColor: colors.premium,
        },
        style,
      ]}
    >
      <ProCrown size={12} color={colors.premium} force />
      <Text style={[styles.text, { color: colors.premium }]}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label} — réservé`}>
        {content}
      </Pressable>
    );
  }
  return content;
}

/**
 * Enveloppe un libellé avec une couronne à droite — invisible si flag off.
 */
export function ProLabeledRow({
  children,
  showCrown = true,
  force = false,
}: {
  children: React.ReactNode;
  showCrown?: boolean;
  force?: boolean;
}) {
  const visible = force || isPremiumUiVisible();
  return (
    <View style={styles.row}>
      <View style={styles.rowBody}>{children}</View>
      {visible && showCrown ? <ProCrown size={14} force={force} style={styles.crown} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowBody: { flexShrink: 1 },
  crown: { marginTop: 1 },
});

import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import { isPremiumUiVisible } from '../../premium/featureFlags';
import { ProCrown } from './ProCrown';

/** Petit badge Premium cohérent avec le ranked. */
export function PremiumBadge({
  label = 'Premium',
  force = false,
}: {
  label?: string;
  force?: boolean;
}) {
  const { colors } = useThemeColors();
  if (!force && !isPremiumUiVisible()) return null;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.accentLight,
          borderColor: colors.premium,
        },
      ]}
    >
      <ProCrown size={11} color={colors.premium} force />
      <Text style={[styles.text, { color: colors.premium }]}>{label}</Text>
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
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

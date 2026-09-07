import { Pressable, Platform, Text } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useThemeColors } from '../../theme/ThemeContext';

type Props = {
  /** Route de secours si aucun historique (ex. refresh / deep link). */
  fallbackHref?: string;
  tintColor?: string;
};

/** Navigation retour sûre après refresh (historique vide). */
export function safeGoBack(
  router: { canGoBack: () => boolean; back: () => void; replace: (href: Href) => void },
  fallbackHref: Href = '/(tabs)',
) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallbackHref);
}

/**
 * Flèche retour toujours visible.
 * Après un refresh web, le stack n’a souvent plus d’historique :
 * on revient alors vers `fallbackHref` (accueil par défaut).
 */
export function AlwaysBackButton({
  fallbackHref = '/(tabs)',
  tintColor,
}: Props) {
  const router = useRouter();
  const { colors } = useThemeColors();
  const color = tintColor ?? colors.text;

  return (
    <Pressable
      onPress={() => safeGoBack(router, fallbackHref as Href)}
      accessibilityRole="button"
      accessibilityLabel="Retour"
      hitSlop={12}
      style={{
        paddingHorizontal: Platform.OS === 'ios' ? 8 : 12,
        paddingVertical: 8,
        marginLeft: Platform.OS === 'ios' ? -4 : 0,
        minWidth: 40,
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: 28, lineHeight: 30, fontWeight: '300' }}>
        ‹
      </Text>
    </Pressable>
  );
}

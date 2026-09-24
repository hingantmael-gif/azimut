import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Text } from '../../src/ui/Text';
import { useThemeColors } from '../../src/theme/ThemeContext';

/**
 * Page de retour Garmin (redirect_uri). Sur le web elle se trouve dans la fenêtre pop-up :
 * maybeCompleteAuthSession renvoie le code à la fenêtre Mova, qui se referme.
 * Sur mobile, le retour est capté par le navigateur intégré ; si cette page s'affiche quand même, on rentre.
 */
export default function GarminOAuthReturn() {
  const router = useRouter();
  const { colors } = useThemeColors();

  useEffect(() => {
    const res = WebBrowser.maybeCompleteAuthSession();
    if (res.type === 'success') return;
    const t = setTimeout(() => router.replace('/settings/devices'), 1500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.accent} />
      <Text style={{ color: colors.textMuted }}>Connexion à Garmin Connect…</Text>
    </View>
  );
}

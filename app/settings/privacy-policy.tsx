import { Text } from 'react-native';
import { SettingsScreen } from '../../src/ui/settings/SettingsList';
import { AboutBrandMark } from '../../src/ui/brand/AppBrandBlocks';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';
import { AppScrollView } from '../../src/ui/scrolling';

export default function PrivacyPolicyScreen() {
  const { colors } = useThemeColors();
  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}>
        <AboutBrandMark compact />
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Politique de confidentialité (RGPD). Vos données d&apos;activité, de santé et de profil
          sont traitées pour fournir le suivi sportif, le fil social et le coaching. Vous pouvez
          exporter ou supprimer vos données depuis Compte et sécurité. Les zones de confidentialité
          masquent votre domicile sur les cartes publiques.
        </Text>
      </AppScrollView>
    </SettingsScreen>
  );
}

const styles = {
  body: { fontSize: 15, lineHeight: 22 },
};

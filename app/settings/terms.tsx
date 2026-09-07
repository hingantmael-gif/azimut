import { Text } from 'react-native';
import { SettingsScreen } from '../../src/ui/settings/SettingsList';
import { AboutBrandMark } from '../../src/ui/brand/AppBrandBlocks';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';
import { AppScrollView } from '../../src/ui/scrolling';

export default function TermsScreen() {
  const { colors } = useThemeColors();
  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}>
        <AboutBrandMark compact />
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Conditions générales d&apos;utilisation de l&apos;application Azimut.
          En utilisant l&apos;application, vous acceptez ces conditions : usage personnel,
          responsabilité lors des activités outdoor, propriété de vos données d&apos;activité.
        </Text>
      </AppScrollView>
    </SettingsScreen>
  );
}

const styles = {
  body: { fontSize: 15, lineHeight: 22 },
};

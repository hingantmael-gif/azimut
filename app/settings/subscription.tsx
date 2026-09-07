import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../../src/ui/settings/SettingsList';
import {
  APP_FEATURE_SECTIONS,
  APP_FEATURES,
  featuresForSection,
  hrefWithFocus,
} from '../../src/constants/appFeatures';
import { spacing } from '../../src/theme/tokens';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { AppScrollView } from '../../src/ui/scrolling';

/**
 * Catalogue des fonctionnalités — une seule liste, tout accessible.
 * Un tap ouvre l’écran (et le bouton d’action via ?focus=).
 */
export default function SubscriptionScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Text style={[styles.hero, { color: colors.text }]}>
          Tout explorer
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          {APP_FEATURES.length} outils inclus. Touche une ligne pour ouvrir
          l’écran — pratique pour retrouver une fonction rapidement.
        </Text>

        {APP_FEATURE_SECTIONS.map((section) => {
          const items = featuresForSection(section.id);
          if (items.length === 0) return null;
          return (
            <SettingsSection key={section.id} title={section.title}>
              {items.map((f) => (
                <SettingsRow
                  key={f.id}
                  label={f.label}
                  value={f.hint}
                  onPress={() => router.push(hrefWithFocus(f))}
                />
              ))}
            </SettingsSection>
          );
        })}
      </AppScrollView>
    </SettingsScreen>
  );
}

const styles = {
  hero: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 26,
  },
  sub: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
  },
};

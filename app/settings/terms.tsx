import { Text, StyleSheet, View } from 'react-native';
import { SettingsScreen } from '../../src/ui/settings/SettingsList';
import { AboutBrandMark } from '../../src/ui/brand/AppBrandBlocks';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';
import { AppScrollView } from '../../src/ui/scrolling';
import {
  TERMS_INTRO,
  TERMS_LAST_UPDATED,
  TERMS_SECTIONS,
  TERMS_VERSION,
} from '../../src/legal/azimutTerms';

/** CGU détaillées (usage + confidentialité). Acceptation obligatoire à l’entrée. */
export default function TermsScreen() {
  const { colors } = useThemeColors();
  const body = { color: colors.textSecondary };
  const heading = {
    color: colors.text,
    fontWeight: '800' as const,
    fontSize: 16,
    marginTop: 22,
    marginBottom: 8,
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 56 }}>
        <AboutBrandMark compact />
        <Text style={[styles.meta, { color: colors.textMuted, marginTop: spacing.md }]}>
          Version {TERMS_VERSION} · Mise à jour : {TERMS_LAST_UPDATED}
        </Text>
        <Text style={[styles.body, body, { marginTop: spacing.sm }]}>{TERMS_INTRO}</Text>

        {TERMS_SECTIONS.map((section) => (
          <View key={section.id}>
            <Text style={heading}>{section.title}</Text>
            {section.blocks.map((block, i) =>
              block.type === 'p' ? (
                <Text key={i} style={[styles.body, body, i > 0 ? { marginTop: 10 } : null]}>
                  {block.text}
                </Text>
              ) : (
                <View key={i} style={{ marginTop: i > 0 ? 8 : 0 }}>
                  {block.items.map((item, j) => (
                    <Text key={j} style={[styles.body, body, styles.bullet]}>
                      {'\u2022  '}
                      {item}
                    </Text>
                  ))}
                </View>
              ),
            )}
          </View>
        ))}
      </AppScrollView>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  meta: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 23 },
  bullet: { marginBottom: 6, paddingLeft: 2 },
});

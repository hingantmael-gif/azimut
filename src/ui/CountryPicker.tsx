import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { AppTextInput } from './AppTextInput';
import { AppScrollView } from './scrolling';
import { useThemeColors } from '../theme/ThemeContext';
import { radii, spacing } from '../theme/tokens';
import { filterCountries, localeLabel, type CountryEntry } from '../i18n/locales';
import { useI18n } from '../i18n/I18nContext';

export function CountryPicker({
  selectedId,
  onSelect,
}: {
  selectedId?: string | null;
  onSelect: (country: CountryEntry) => void;
}) {
  const { colors } = useThemeColors();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const list = useMemo(() => filterCountries(query), [query]);

  return (
    <View style={styles.wrap}>
      <AppTextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('auth.countrySearch')}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.search,
          {
            backgroundColor: colors.bg,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <AppScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 12 }}>
        {list.map((c) => {
          const active = selectedId === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => onSelect(c)}
              style={[
                styles.row,
                {
                  backgroundColor: active ? `${colors.accent}22` : colors.surface,
                  borderColor: active ? colors.accent : colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>{c.label}</Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {localeLabel(c.locale)}
                </Text>
              </View>
              {active ? (
                <Text style={[styles.check, { color: colors.accent }]}>✓</Text>
              ) : null}
            </Pressable>
          );
        })}
      </AppScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 280, gap: spacing.sm },
  search: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
  },
  list: { flexGrow: 1, maxHeight: 360 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  label: { fontWeight: '700', fontSize: 15 },
  meta: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  check: { fontWeight: '900', fontSize: 18, marginLeft: 8 },
});

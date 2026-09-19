
import { SettingsRow, SettingsScreen, SettingsSection, SettingsToggleRow } from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import type { UnitsSystem } from '../../src/types/domain';
import { AppScrollView } from '../../src/ui/scrolling';
import { useI18n } from '../../src/i18n/I18nContext';
import { APP_LOCALES, type AppLocale } from '../../src/i18n/locales';
import { Text } from 'react-native';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';

export default function DisplaySettingsScreen() {
  const { state, dispatch } = useApp();
  const { t, locale, setLocale } = useI18n();
  const { colors } = useThemeColors();
  const p = state.profile;

  const setUnits = (units: UnitsSystem) => {
    dispatch({ type: 'UPDATE_PROFILE', patch: { units } });
  };

  const pickLanguage = (code: AppLocale) => {
    setLocale(code);
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <SettingsSection title={t('settings.chooseLanguage')}>
          {APP_LOCALES.map((lang) => (
            <SettingsRow
              key={lang.code}
              label={lang.nativeLabel}
              value={locale === lang.code ? '✓' : undefined}
              onPress={() => pickLanguage(lang.code)}
            />
          ))}
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 12,
              lineHeight: 17,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            }}
          >
            {t('settings.languageNote')}
            {p.country ? ` · ${p.country}` : ''}
          </Text>
        </SettingsSection>

        <SettingsSection title={t('settings.unitsMap')}>
          <SettingsRow
            label={t('settings.metric')}
            value={p.units === 'metric' ? '✓' : undefined}
            onPress={() => setUnits('metric')}
          />
          <SettingsRow
            label={t('settings.imperial')}
            value={p.units === 'imperial' ? '✓' : undefined}
            onPress={() => setUnits('imperial')}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.map')}>
          <SettingsToggleRow
            label={t('settings.mapPosition')}
            value
            onToggle={() => undefined}
          />
        </SettingsSection>
      </AppScrollView>
    </SettingsScreen>
  );
}

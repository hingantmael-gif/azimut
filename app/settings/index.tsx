import { useMemo, useState, useCallback } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
  SettingsToggleRow,
} from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import { SettingsBrandHeader } from '../../src/ui/brand/AppBrandBlocks';
import { AppScrollView } from '../../src/ui/scrolling';
import { AppTextInput } from '../../src/ui/AppTextInput';
import { searchSettings } from '../../src/constants/settingsSearch';
import {
  getSettingsSearchDraft,
  setSettingsSearchDraft,
} from '../../src/storage/settingsSearchDraft';
import { getWatchEntry } from '../../src/constants/watches';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import { useI18n } from '../../src/i18n/I18nContext';
import { localeLabel } from '../../src/i18n/locales';
import { isOwnerPremiumEmail } from '../../src/engines/ownerAccess';
import { apiAdminMessages } from '../../src/services/contactApi';
import { hasPremiumAccess } from '../../src/premium/entitlement';

/**
 * Hub paramètres — préférences app uniquement (comme Strava / Apple Fitness).
 * Identité & données athlète : onglet Vous → Modifier le profil.
 */
export default function SettingsIndex() {
  const router = useRouter();
  // Visible seulement dans le navigateur (pas une fois l'app installée).
  const canInstallPwa =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    !window.matchMedia('(display-mode: standalone)').matches &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone !== true;
  const { state, dispatch } = useApp();
  const { colors } = useThemeColors();
  const { t, locale } = useI18n();
  const [query, setQuery] = useState(getSettingsSearchDraft);
  const isDark = state.profile.theme === 'dark';
  const watchLabel = state.profile.watch?.brandId
    ? getWatchEntry(state.profile.watch.brandId).label
    : '—';

  const searchResults = useMemo(() => {
    const results = searchSettings(query);
    if (isOwnerPremiumEmail(state.profile.email)) return results;
    return results.filter((item) => item.id !== 'premium-manage');
  }, [query, state.profile.email]);
  const searching = query.trim().length > 0;

  const [unreadMessages, setUnreadMessages] = useState(0);
  const ownerToken = isOwnerPremiumEmail(state.profile.email) ? state.authToken : null;

  useFocusEffect(
    useCallback(() => {
      setQuery(getSettingsSearchDraft());
      // Compte propriétaire : nombre de messages non lus.
      if (ownerToken) void apiAdminMessages(ownerToken).then((r) => setUnreadMessages(r.unread));
    }, [ownerToken]),
  );

  const onChangeQuery = (text: string) => {
    setQuery(text);
    setSettingsSearchDraft(text);
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <SettingsBrandHeader subtitle={t('settings.subtitle')} />

        <View style={styles.searchWrap}>
          <AppTextInput
            value={query}
            onChangeText={onChangeQuery}
            placeholder={t('settings.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.bg,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        {searching ? (
          <SettingsSection title="Résultats">
            {searchResults.length === 0 ? (
              <View style={{ padding: spacing.md }}>
                <Text style={{ color: colors.textMuted }}>Aucun réglage trouvé.</Text>
              </View>
            ) : (
              searchResults.map((item) => (
                <SettingsRow
                  key={item.id}
                  label={item.label}
                  value={item.path}
                  onPress={() => {
                    if (item.id === 'watch-change') {
                      router.push({ pathname: '/settings/watch', params: { change: '1' } });
                      return;
                    }
                    router.push(item.href);
                  }}
                />
              ))
            )}
          </SettingsSection>
        ) : (
          <>
            <SettingsSection title="Compte">
              {isOwnerPremiumEmail(state.profile.email) ? (
                <SettingsRow
                  label="Messages"
                  value={unreadMessages > 0 ? `${unreadMessages} non lu${unreadMessages > 1 ? 's' : ''}` : 'Boîte de réception'}
                  onPress={() => router.push('/settings/messages')}
                />
              ) : null}
              {isOwnerPremiumEmail(state.profile.email) ? (
                <SettingsRow
                  label="Règles de la communauté"
                  value="Groupes · certification"
                  onPress={() => router.push('/settings/community-rules')}
                />
              ) : null}
              {isOwnerPremiumEmail(state.profile.email) ? (
                <SettingsRow
                  label="Gestion compte premium"
                  value="Cadeaux Premium"
                  onPress={() => router.push('/settings/premium-manage')}
                />
              ) : null}
              <SettingsRow
                label="Modifier mon profil"
                value={`${state.profile.firstName} ${state.profile.lastName}`.trim() || undefined}
                onPress={() => router.push('/settings/profile')}
              />
              <SettingsRow
                label="Profil sportif"
                value="Objectifs · données · forme"
                onPress={() => router.push('/settings/athlete-hub')}
              />
              <SettingsRow
                label="Compte et sécurité"
                onPress={() => router.push('/settings/account')}
              />
            </SettingsSection>

            <SettingsSection title={t('settings.display')}>
              <SettingsToggleRow
                label={t('settings.darkMode')}
                subtitle={t('settings.darkModeSub')}
                value={isDark}
                onToggle={() =>
                  dispatch({
                    type: 'UPDATE_PROFILE',
                    patch: { theme: isDark ? 'light' : 'dark' },
                  })
                }
              />
              <SettingsRow
                label={t('settings.language')}
                value={localeLabel(locale)}
                onPress={() => router.push('/settings/display')}
              />
              <SettingsRow
                label={t('settings.unitsMap')}
                value={
                  state.profile.units === 'metric' ? t('settings.metric') : t('settings.imperial')
                }
                onPress={() => router.push('/settings/display')}
              />
            </SettingsSection>

            <SettingsSection title="Communications">
              <SettingsRow
                label="Notifications"
                onPress={() => router.push('/settings/notifications')}
              />
              <SettingsRow
                label="Préférences e-mail"
                onPress={() => router.push('/settings/email')}
              />
            </SettingsSection>

            <SettingsSection title="Confidentialité">
              <SettingsRow
                label="Qui peut voir mon profil"
                onPress={() => router.push('/settings/privacy')}
              />
              <SettingsRow
                label="Autorisations de l’app"
                onPress={() => router.push('/settings/data-permissions')}
              />
            </SettingsSection>

            <SettingsSection title="Appareils & sync">
              <SettingsRow
                label="Applications connectées"
                onPress={() => router.push('/settings/devices')}
              />
              <SettingsRow
                label="Montre"
                value={watchLabel}
                onPress={() => router.push('/settings/watch')}
              />
              <SettingsRow
                label="Importer sommeil"
                onPress={() => router.push('/sleep')}
              />
            </SettingsSection>

            <SettingsSection title="Explorer">
              <SettingsRow
                label="Abonnement Premium"
                value={
                  hasPremiumAccess({
                    plan: state.profile.plan,
                    subscription: state.profile.subscription,
                    premiumSource: state.profile.premiumSource,
                  })
                    ? 'Actif'
                    : 'Gratuit'
                }
                onPress={() => router.push('/settings/subscription')}
              />
              <SettingsRow
                label="Tout explorer"
                value="Outils inclus"
                onPress={() => router.push('/settings/subscription')}
              />
            </SettingsSection>

            <SettingsSection title="Aide">
              {canInstallPwa ? (
                <SettingsRow
                  label="Installer sur l'écran d'accueil"
                  value="QR code"
                  icon={{ name: 'download', color: '#0B8262' }}
                  onPress={() => window.location.assign('/telecharger.html')}
                />
              ) : null}
              <SettingsRow label="Centre d'aide" onPress={() => router.push('/settings/help')} />
              <SettingsRow
                label="Conditions d'utilisation"
                onPress={() => router.push('/settings/terms')}
              />
              <SettingsRow
                label="Politique de confidentialité"
                onPress={() => router.push('/settings/privacy-policy')}
              />
            </SettingsSection>
          </>
        )}
      </AppScrollView>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  searchInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
  },
});

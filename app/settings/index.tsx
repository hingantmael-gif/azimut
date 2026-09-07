import { useMemo, useState, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

/**
 * Hub paramètres — préférences app uniquement (comme Strava / Apple Fitness).
 * Identité & données athlète : onglet Vous → Modifier le profil.
 */
export default function SettingsIndex() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const { colors } = useThemeColors();
  const [query, setQuery] = useState(getSettingsSearchDraft);
  const isDark = state.profile.theme === 'dark';
  const watchLabel = state.profile.watch?.brandId
    ? getWatchEntry(state.profile.watch.brandId).label
    : 'Non configurée';

  const searchResults = useMemo(() => searchSettings(query), [query]);
  const searching = query.trim().length > 0;

  useFocusEffect(
    useCallback(() => {
      setQuery(getSettingsSearchDraft());
    }, []),
  );

  const onChangeQuery = (text: string) => {
    setQuery(text);
    setSettingsSearchDraft(text);
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <SettingsBrandHeader subtitle="Paramètres · affichage, sync, compte" />

        <View style={styles.searchWrap}>
          <AppTextInput
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Rechercher (montre, notifications, compte…)"
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
              <SettingsRow
                label="Modifier mon profil"
                value={`${state.profile.firstName} ${state.profile.lastName}`.trim() || undefined}
                onPress={() => router.push('/settings/profile')}
              />
              <SettingsRow
                label="Compte et sécurité"
                onPress={() => router.push('/settings/account')}
              />
            </SettingsSection>

            <SettingsSection title="Affichage">
              <SettingsToggleRow
                label="Mode sombre"
                subtitle="Interface sombre pour un confort visuel réduit"
                value={isDark}
                onToggle={() =>
                  dispatch({
                    type: 'UPDATE_PROFILE',
                    patch: { theme: isDark ? 'light' : 'dark' },
                  })
                }
              />
              <SettingsRow
                label="Unités et carte"
                value={state.profile.units === 'metric' ? 'Métrique' : 'Impérial'}
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
                label="Tout explorer"
                value="Outils inclus"
                onPress={() => router.push('/settings/subscription')}
              />
            </SettingsSection>

            <SettingsSection title="Aide">
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

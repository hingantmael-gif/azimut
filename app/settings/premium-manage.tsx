import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import { AppScrollView } from '../../src/ui/scrolling';
import { AppTextInput } from '../../src/ui/AppTextInput';
import { PrimaryButton, SecondaryButton } from '../../src/ui/primitives';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import {
  isOwnerPremiumEmail,
  normalizeAccountEmail,
} from '../../src/engines/ownerAccess';
import {
  addPremiumGift,
  loadPremiumGifts,
  removePremiumGift,
  type PremiumGiftEntry,
} from '../../src/storage/ownerPremiumGifts';

/**
 * Owner only — gérer les Premium offerts (cadeaux).
 * Les abonnements payants ne figurent pas ici et ne sont pas modifiables.
 */
export default function PremiumManageScreen() {
  const router = useRouter();
  const { state } = useApp();
  const { colors } = useThemeColors();
  const [gifts, setGifts] = useState<PremiumGiftEntry[]>([]);
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isOwner = isOwnerPremiumEmail(state.profile.email);

  useFocusEffect(
    useCallback(() => {
      if (!isOwner) {
        router.replace('/settings');
        return;
      }
      let cancelled = false;
      void loadPremiumGifts(state.authToken).then((list) => {
        if (!cancelled) setGifts(list);
      });
      return () => {
        cancelled = true;
      };
    }, [isOwner, router, state.authToken]),
  );

  if (!isOwner) {
    return null;
  }

  const refresh = async () => {
    setGifts(await loadPremiumGifts(state.authToken));
  };

  const onAdd = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await addPremiumGift(email, label, state.authToken);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGifts(result.list);
      setEmail('');
      setLabel('');
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (target: string) => {
    setError('');
    setBusy(true);
    try {
      const result = await removePremiumGift(target, state.authToken);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGifts(result.list);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Text style={[styles.intro, { color: colors.textMuted }]}>
          Ajoute ou retire les e-mails auxquels tu as offert le Premium. Les
          personnes qui paient un abonnement réel n’apparaissent pas ici et ne
          peuvent pas être modifiées. Seul ton compte ultra-sécurisé reste au
          rang Champion.
        </Text>

        <SettingsSection title="Offrir le Premium">
          <View style={styles.form}>
            <AppTextInput
              value={email}
              onChangeText={(t) => setEmail(normalizeAccountEmail(t))}
              placeholder="e-mail@exemple.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
            <AppTextInput
              value={label}
              onChangeText={setLabel}
              placeholder="Nom / note (optionnel)"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
            {error ? (
              <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
            ) : null}
            <PrimaryButton label="Ajouter" onPress={onAdd} disabled={busy} />
          </View>
        </SettingsSection>

        <SettingsSection title={`Cadeaux actifs (${gifts.length})`}>
          {gifts.length === 0 ? (
            <View style={{ padding: spacing.md }}>
              <Text style={{ color: colors.textMuted }}>
                Aucun Premium offert pour le moment.
              </Text>
            </View>
          ) : (
            gifts.map((g) => (
              <View key={g.email} style={styles.giftRow}>
                <SettingsRow
                  label={g.label || g.email}
                  value={g.label ? g.email : undefined}
                  showChevron={false}
                />
                <View style={styles.giftActions}>
                  <SecondaryButton
                    label="Retirer"
                    onPress={() => {
                      if (!busy) void onRemove(g.email);
                    }}
                  />
                </View>
              </View>
            ))
          )}
        </SettingsSection>

        <SettingsSection title="Abonnements payants">
          <View style={{ padding: spacing.md }}>
            <Text style={{ color: colors.textMuted, lineHeight: 20 }}>
              Les comptes qui paient réellement un abonnement sont protégés :
              tu ne peux ni les ajouter ici pour les contrôler, ni retirer leur
              Premium. Leur rang suit le ladder normal — seul ton compte reste
              Champion en permanence.
            </Text>
            <View style={{ height: spacing.sm }} />
            <SecondaryButton label="Actualiser la liste" onPress={() => void refresh()} />
          </View>
        </SettingsSection>
      </AppScrollView>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  intro: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
  },
  giftRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  giftActions: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
});

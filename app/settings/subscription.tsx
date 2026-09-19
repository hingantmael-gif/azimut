import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../../src/ui/Text';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import { AppScrollView } from '../../src/ui/scrolling';
import { PrimaryButton, SecondaryButton } from '../../src/ui/primitives';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import {
  BILLING_DISPLAY_PRICES,
  FREE_QUOTAS,
} from '../../src/premium/quotas';
import { hasPremiumAccess } from '../../src/premium/entitlement';
import { PremiumBadge } from '../../src/ui/premium';
import {
  isNativeBillingAvailable,
  listCatalogOffers,
  planFromSubscription,
  PLAY_MANAGE_SUBSCRIPTION_URL,
  purchasePremium,
  restorePurchases,
} from '../../src/services/billing';
import { getAllUsageQuotas } from '../../src/storage/usageQuotas';
import {
  APP_FEATURE_SECTIONS,
  APP_FEATURES,
  featuresForSection,
  hrefWithFocus,
} from '../../src/constants/appFeatures';

type CompareRow = { feature: string; free: string; premium: string };

const COMPARE: CompareRow[] = [
  { feature: 'Programme actif', free: '1 à la fois', premium: 'Plusieurs en parallèle' },
  {
    feature: 'Import GPX/TCX',
    free: `${FREE_QUOTAS.importsPerMonth}/mois`,
    premium: 'Illimité',
  },
  {
    feature: 'Export Strava',
    free: `${FREE_QUOTAS.stravaExportsPerMonth}/mois`,
    premium: 'Illimité',
  },
  {
    feature: 'Envoi montre',
    free: `${FREE_QUOTAS.watchExportsPerMonth}/mois`,
    premium: 'Illimité',
  },
  { feature: 'GPS live', free: 'Illimité', premium: 'Illimité' },
  { feature: 'Coach du jour / Sentinelle', free: 'Complet', premium: '+ détail' },
  { feature: 'Sommeil', free: 'Complet', premium: '+ corrélations' },
  { feature: 'Analyses (CP, Banister…)', free: 'Basique', premium: 'Complet' },
  { feature: 'Covers prem-*', free: '—', premium: 'Inclus' },
  { feature: 'XP classement', free: 'Égalitaire', premium: 'Égalitaire' },
];

/**
 * Page d’abonnement + catalogue d’exploration.
 * Achats Play via RevenueCat sur build Android ; web = présentation + restore info.
 */
export default function SubscriptionScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<'monthly' | 'annual'>('annual');
  const [quotas, setQuotas] = useState<string>('');

  const premium = hasPremiumAccess({
    plan: state.profile.plan,
    subscription: state.profile.subscription,
    premiumSource: state.profile.premiumSource,
  });
  const offers = listCatalogOffers();
  const nativeBilling = isNativeBillingAvailable();

  useFocusEffect(
    useCallback(() => {
      void getAllUsageQuotas().then((q) => {
        setQuotas(
          `Imports ${q.import.used}/${q.import.limit} · Strava ${q.stravaExport.used}/${q.stravaExport.limit} · Montre ${q.watchExport.used}/${q.watchExport.limit}`,
        );
      });
    }, []),
  );

  const applyPaid = (subscription: NonNullable<typeof state.profile.subscription>) => {
    dispatch({
      type: 'APPLY_SUBSCRIPTION',
      subscription,
      plan: planFromSubscription(subscription),
    });
  };

  const onPurchase = async () => {
    setBusy(true);
    try {
      const res = await purchasePremium(period);
      if (res.ok) {
        applyPaid(res.subscription);
        Alert.alert('Premium', 'Abonnement activé. Merci !');
        return;
      }
      if (!res.cancelled) {
        Alert.alert('Premium', res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      const res = await restorePurchases();
      if (res.ok) {
        applyPaid(res.subscription);
        Alert.alert('Premium', 'Achats restaurés.');
        return;
      }
      Alert.alert('Restaurer', res.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroTitle}>Mova Premium</Text>
            {premium ? <PremiumBadge force /> : null}
          </View>
          <Text style={styles.heroSub}>
            La boucle essentielle reste gratuite (programme + séances). Premium
            débloque le confort, l’analyse fine et le multi-programmes — sans
            payer pour gagner au classement.
          </Text>
          {premium ? (
            <Text style={styles.statusOk}>
              Tu es Premium
              {state.profile.subscription?.currentPeriodEnd
                ? ` · jusqu’au ${new Date(
                    state.profile.subscription.currentPeriodEnd,
                  ).toLocaleDateString('fr-FR')}`
                : ''}
              {state.profile.premiumSource
                ? ` · ${state.profile.premiumSource}`
                : ''}
            </Text>
          ) : (
            <Text style={styles.statusFree}>
              Offre gratuite active
              {quotas ? `\nCe mois : ${quotas}` : ''}
            </Text>
          )}
        </View>

        {!premium ? (
          <SettingsSection title="Choisir une offre">
            <View style={styles.offerRow}>
              {offers.map((o) => {
                const on = period === o.period;
                return (
                  <PrimaryButton
                    key={o.productId}
                    label={
                      on
                        ? `✓ ${o.title} · ${o.priceString}`
                        : `${o.title} · ${o.priceString}`
                    }
                    onPress={() => setPeriod(o.period)}
                  />
                );
              })}
            </View>
            <Text style={styles.priceNote}>
              Essai {BILLING_DISPLAY_PRICES.trialDays} jours · Annuel ={' '}
              {BILLING_DISPLAY_PRICES.annual.monthlyEquivalent} (vs{' '}
              {BILLING_DISPLAY_PRICES.monthly.label})
            </Text>
            <View style={styles.ctaPad}>
              <PrimaryButton
                label={
                  busy
                    ? '…'
                    : nativeBilling
                      ? 'S’abonner'
                      : Platform.OS === 'web'
                        ? 'Dispo sur Android (Play)'
                        : 'Configurer RevenueCat'
                }
                onPress={() => void onPurchase()}
                disabled={busy}
              />
              <View style={{ height: spacing.sm }} />
              <SecondaryButton
                label="Restaurer mes achats"
                onPress={() => void onRestore()}
              />
              <Text style={styles.legal}>
                Renouvellement automatique via Google Play. Annule à tout moment
                dans Play Store. Droit de rétractation UE 14 jours selon règles
                Google.
              </Text>
              <SecondaryButton
                label="Gérer l’abonnement (Play)"
                onPress={() => void Linking.openURL(PLAY_MANAGE_SUBSCRIPTION_URL)}
              />
            </View>
          </SettingsSection>
        ) : (
          <SettingsSection title="Abonnement">
            <View style={styles.ctaPad}>
              <SecondaryButton
                label="Restaurer mes achats"
                onPress={() => void onRestore()}
              />
              <View style={{ height: spacing.sm }} />
              <SecondaryButton
                label="Gérer dans Google Play"
                onPress={() => void Linking.openURL(PLAY_MANAGE_SUBSCRIPTION_URL)}
              />
            </View>
          </SettingsSection>
        )}

        <SettingsSection title="Gratuit vs Premium">
          <View style={styles.compareHead}>
            <Text style={[styles.compareCell, styles.compareFeature]}> </Text>
            <Text style={styles.compareCell}>Free</Text>
            <Text style={styles.compareCell}>Premium</Text>
          </View>
          {COMPARE.map((row) => (
            <View key={row.feature} style={styles.compareRow}>
              <Text style={[styles.compareCell, styles.compareFeature]}>
                {row.feature}
              </Text>
              <Text style={styles.compareCell}>{row.free}</Text>
              <Text style={styles.compareCell}>{row.premium}</Text>
            </View>
          ))}
        </SettingsSection>

        <Text style={styles.exploreTitle}>Tout explorer</Text>
        <Text style={styles.exploreSub}>
          {APP_FEATURES.length} outils — touche une ligne pour ouvrir l’écran.
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

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    hero: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      gap: 8,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },
    heroSub: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
    statusOk: {
      marginTop: 4,
      color: colors.premium,
      fontWeight: '700',
      fontSize: 14,
      lineHeight: 20,
    },
    statusFree: {
      marginTop: 4,
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    offerRow: {
      padding: spacing.md,
      gap: spacing.sm,
    },
    priceNote: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    ctaPad: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    legal: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
    },
    compareHead: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    compareRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    compareCell: {
      flex: 1,
      fontSize: 12,
      color: colors.text,
      lineHeight: 16,
    },
    compareFeature: {
      flex: 1.4,
      fontWeight: '700',
      color: colors.textMuted,
    },
    exploreTitle: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    exploreSub: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
  });
}

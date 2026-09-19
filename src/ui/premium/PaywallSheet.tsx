import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PhoneModal } from '../PhoneModal';
import { PrimaryButton, SecondaryButton } from '../primitives';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { ColorPalette } from '../../theme/palettes';
import {
  PAYWALL_COPY,
  type PaywallReason,
  BILLING_DISPLAY_PRICES,
} from '../../premium/quotas';
import { ProCrown } from './ProCrown';

type Props = {
  visible: boolean;
  reason?: PaywallReason;
  onClose: () => void;
  /** Après CTA — navigation vers la page d’abonnement par défaut */
  onSubscribePress?: () => void;
};

/**
 * Soft paywall contextuel — jamais plein écran au premier lancement.
 */
export function PaywallSheet({
  visible,
  reason = 'generic',
  onClose,
  onSubscribePress,
}: Props) {
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const copy = PAYWALL_COPY[reason] ?? PAYWALL_COPY.generic;

  const goSubscribe = () => {
    onClose();
    if (onSubscribePress) {
      onSubscribePress();
      return;
    }
    router.push('/settings/subscription');
  };

  return (
    <PhoneModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={styles.card}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.crownRow}>
            <ProCrown size={22} force color={colors.premium} />
            <Text style={styles.kicker}>Azimut Premium</Text>
          </View>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
          <Text style={styles.priceHint}>
            Essai {BILLING_DISPLAY_PRICES.trialDays} jours · puis{' '}
            {BILLING_DISPLAY_PRICES.annual.label} (
            {BILLING_DISPLAY_PRICES.annual.monthlyEquivalent})
          </Text>
          <PrimaryButton label="Voir Premium" onPress={goSubscribe} />
          <View style={{ height: spacing.sm }} />
          <SecondaryButton label="Plus tard" onPress={onClose} />
        </Pressable>
      </Pressable>
    </PhoneModal>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
      padding: spacing.md,
    },
    card: {
      backgroundColor: colors.bg,
      borderRadius: radii.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    crownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    kicker: {
      color: colors.premium,
      fontWeight: '800',
      fontSize: 13,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      lineHeight: 26,
    },
    body: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: spacing.sm,
    },
    priceHint: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: spacing.sm,
    },
  });
}

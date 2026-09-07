import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import { PhoneModal } from '../PhoneModal';
import { radii, spacing } from '../../theme/tokens';

type Props = {
  visible: boolean;
  onAllow: () => void;
  onDeny: () => void;
};

/**
 * Demande unique d’autorisation notifications (après refus : Réglages → Notifications).
 */
export function NotificationPermissionModal({ visible, onAllow, onDeny }: Props) {
  const { colors } = useThemeColors();

  return (
    <PhoneModal visible={visible} transparent animationType="fade" onRequestClose={onDeny}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>NOTIFICATIONS</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Souhaitez-vous autoriser les notifications ?
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            On pourra vous rappeler votre séance du jour, vous prévenir d’un nouvel abonné, ou
            quand quelqu’un like votre programme — comme sur votre téléphone, uniquement si vous
            acceptez.
          </Text>
          <View style={styles.bullets}>
            <Text style={[styles.bullet, { color: colors.text }]}>
              · Prépare-toi pour ta séance aujourd’hui
            </Text>
            <Text style={[styles.bullet, { color: colors.text }]}>
              · Nouvel abonné / like sur ton programme
            </Text>
            <Text style={[styles.bullet, { color: colors.text }]}>
              · Feedback RPE et rappels du soir
            </Text>
          </View>
          <Pressable
            style={[styles.primary, { backgroundColor: colors.accent }]}
            onPress={onAllow}
          >
            <Text style={styles.primaryText}>Autoriser les notifications</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={onDeny}>
            <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Refuser</Text>
          </Pressable>
          <Text style={[styles.footnote, { color: colors.textMuted }]}>
            Tu pourras les activer plus tard dans Réglages → Notifications.
          </Text>
        </View>
      </View>
    </PhoneModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
  },
  eyebrow: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  body: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  bullets: { marginTop: spacing.md, gap: 6 },
  bullet: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  primary: {
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  primaryText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  secondary: {
    marginTop: spacing.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { fontWeight: '700', fontSize: 14 },
  footnote: {
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});

import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import { BRAND } from '../../constants/brand';
import { radii, spacing } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeContext';
import type { ColorPalette } from '../../theme/palettes';
import { PressableScale } from '../motion/softMotion';

const REASONS = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harcèlement' },
  { id: 'inappropriate', label: 'Contenu inapproprié' },
  { id: 'other', label: 'Autre' },
] as const;

type Props = {
  visible: boolean;
  targetLabel?: string;
  onClose: () => void;
  onReport: (reason: string) => void;
  onBlock?: () => void;
};

/** Feuille Signalement / Blocage — obligatoire avant ouverture publique. */
export function ReportSheet({
  visible,
  targetLabel = 'ce contenu',
  onClose,
  onReport,
  onBlock,
}: Props) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [reason, setReason] = useState<string>('inappropriate');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Signaler {targetLabel}</Text>
          <Text style={styles.sub}>Aide-nous à garder Mova sûr.</Text>
          {REASONS.map((r) => (
            <PressableScale
              key={r.id}
              variant="subtle"
              onPress={() => setReason(r.id)}
              contentStyle={[
                styles.row,
                reason === r.id && {
                  borderColor: colors.accent,
                  backgroundColor: colors.accentLight,
                },
              ]}
            >
              <Text style={styles.rowText}>{r.label}</Text>
              {reason === r.id ? <Text style={styles.check}>✓</Text> : null}
            </PressableScale>
          ))}
          <PressableScale
            variant="pop"
            onPress={() => {
              onReport(reason);
              onClose();
            }}
            contentStyle={styles.primary}
          >
            <Text style={styles.primaryText}>Envoyer le signalement</Text>
          </PressableScale>
          {onBlock ? (
            <PressableScale
              variant="subtle"
              onPress={() => {
                onBlock();
                onClose();
              }}
              contentStyle={styles.blockBtn}
            >
              <Text style={styles.blockText}>Bloquer l’utilisateur</Text>
            </PressableScale>
          ) : null}
          <PressableScale variant="subtle" onPress={onClose} contentStyle={styles.cancel}>
            <Text style={styles.cancelText}>Annuler</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.bgElevated,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: spacing.lg,
      gap: 8,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    title: { fontSize: 18, fontWeight: '900', color: colors.text },
    sub: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    rowText: { fontSize: 15, fontWeight: '700', color: colors.text },
    check: { color: colors.accent, fontWeight: '900', fontSize: 16 },
    primary: {
      marginTop: 8,
      height: 50,
      borderRadius: radii.pill,
      backgroundColor: BRAND.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryText: { color: '#fff', fontWeight: '900', fontSize: 15 },
    blockBtn: {
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    blockText: { color: '#BE123C', fontWeight: '800', fontSize: 14 },
    cancel: { height: 40, alignItems: 'center', justifyContent: 'center' },
    cancelText: { color: colors.textMuted, fontWeight: '700' },
  });
}

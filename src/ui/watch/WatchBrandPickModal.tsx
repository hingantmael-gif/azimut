import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PhoneModal } from '../PhoneModal';
import { WatchBrandPicker } from '../sleep/WatchBrandPicker';
import type { WatchBrandId } from '../../types/domain';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { ColorPalette } from '../../theme/palettes';
import { AppScrollView } from '../scrolling';

type Props = {
  visible: boolean;
  onSelect: (id: WatchBrandId) => void;
  onCancel: () => void;
};

/** Modal « Quelle montre ? » — fonctionne aussi sur le web (contrairement à Alert). */
export function WatchBrandPickModal({ visible, onSelect, onCancel }: Props) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <PhoneModal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <AppScrollView contentContainerStyle={{ paddingBottom: spacing.md }}>
            <WatchBrandPicker
              title="Quelle montre possédez-vous ?"
              subtitle="Un choix unique — ensuite Azimut exporte le bon format de fichier et envoie la séance en quelques clics."
              onSelect={onSelect}
            />
            <Pressable onPress={onCancel} style={styles.cancel}>
              <Text style={styles.cancelText}>Annuler</Text>
            </Pressable>
          </AppScrollView>
        </View>
      </View>
    </PhoneModal>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(7, 17, 31, 0.78)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      maxHeight: '92%',
      backgroundColor: colors.bg,
      borderRadius: radii.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancel: {
      marginTop: spacing.md,
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    cancelText: {
      color: colors.textMuted,
      fontWeight: '700',
      fontSize: 15,
    },
  });
}

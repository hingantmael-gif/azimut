import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import { useRouter } from 'expo-router';
import { CalibrationChip } from './CalibrationChip';
import { PressableScale } from '../motion/softMotion';
import { useThemeColors } from '../../theme/ThemeContext';
import type { ColorPalette } from '../../theme/palettes';
import { radii, spacing } from '../../theme/tokens';

type Props = {
  confidence: number;
  lifeStress01: number | null;
  onToggleStress: () => void;
};

/** Un seul élément « État du jour » : calibration + stress dans un panneau. */
export function DayStateChip({
  confidence,
  lifeStress01,
  onToggleStress,
}: Props) {
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  const stressOn = lifeStress01 != null;

  return (
    <>
      <PressableScale
        variant="subtle"
        onPress={() => setOpen(true)}
        contentStyle={styles.chip}
        accessibilityLabel="État du jour"
      >
        <Text style={styles.chipText}>
          État du jour · {Math.round(confidence * 100)}%
          {stressOn ? ' · stress' : ''}
        </Text>
      </PressableScale>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>État du jour</Text>
            <Text style={styles.sub}>
              Calibration du coach et signal de stress vie (local, non sauvegardé).
            </Text>
            <View style={styles.row}>
              <CalibrationChip
                confidence={confidence}
                onPress={() => {
                  setOpen(false);
                  router.push({
                    pathname: '/(tabs)/body',
                    params: { tab: 'performance' },
                  });
                }}
              />
            </View>
            <PressableScale
              variant="subtle"
              onPress={onToggleStress}
              contentStyle={[
                styles.stressBtn,
                stressOn && {
                  borderColor: colors.warn,
                  backgroundColor: `${colors.warn}22`,
                },
              ]}
            >
              <Text
                style={[
                  styles.stressBtnText,
                  { color: stressOn ? colors.warn : colors.text },
                ]}
              >
                {stressOn ? 'Stress vie · activé (retirer)' : 'Signaler un stress vie'}
              </Text>
            </PressableScale>
            <Pressable onPress={() => setOpen(false)} style={styles.close}>
              <Text style={styles.closeText}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
    },
    chipText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.bgElevated,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: spacing.lg,
      gap: 12,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    title: { fontSize: 18, fontWeight: '900', color: colors.text },
    sub: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    stressBtn: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    stressBtnText: { fontWeight: '800', fontSize: 14 },
    close: { alignItems: 'center', paddingVertical: 10 },
    closeText: { fontWeight: '700', color: colors.textMuted },
  });
}

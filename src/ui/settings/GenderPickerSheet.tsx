import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import { PhoneModal } from '../PhoneModal';
import { radii, spacing } from '../../theme/tokens';

export type GenderChoice = 'homme' | 'femme' | 'autre';

type Props = {
  visible: boolean;
  value?: string;
  onClose: () => void;
  onSave: (choice: GenderChoice) => void;
};

function parseGender(raw?: string): GenderChoice | null {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'homme' || v === 'h' || v === 'male' || v === 'm') return 'homme';
  if (v === 'femme' || v === 'f' || v === 'female' || v === 'woman') return 'femme';
  if (v === 'autre' || v === 'other' || v === 'non-binaire' || v === 'nonbinaire') {
    return 'autre';
  }
  return null;
}

const OPTIONS: { id: GenderChoice; label: string }[] = [
  { id: 'femme', label: 'Femme' },
  { id: 'homme', label: 'Homme' },
  { id: 'autre', label: 'Autre' },
];

const webNoOutline =
  Platform.OS === 'web'
    ? ({ outlineStyle: 'none', outlineWidth: 0 } as object)
    : null;

/** Choix Homme / Femme / Autre — modifiable à tout moment. */
export function GenderPickerSheet({ visible, value, onClose, onSave }: Props) {
  const { colors } = useThemeColors();
  const [selected, setSelected] = useState<GenderChoice | null>(parseGender(value));

  useEffect(() => {
    if (visible) setSelected(parseGender(value));
  }, [visible, value]);

  return (
    <PhoneModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.text }]}>Sexe</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Tu peux changer ce choix à tout moment.
          </Text>
          <View style={styles.options}>
            {OPTIONS.map((opt) => {
              const active = selected === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setSelected(opt.id)}
                  style={[
                    styles.option,
                    {
                      backgroundColor: active ? colors.accentLight : colors.bgSecondary,
                      borderColor: active ? colors.accent : colors.border,
                    },
                    webNoOutline,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: active ? colors.accentDark : colors.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            style={[
              styles.saveBtn,
              { backgroundColor: colors.accent },
              !selected && { opacity: 0.45 },
              webNoOutline,
            ]}
            disabled={!selected}
            onPress={() => {
              if (!selected) return;
              onSave(selected);
              onClose();
            }}
          >
            <Text style={styles.saveText}>Enregistrer</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    </PhoneModal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCC',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '800', marginBottom: spacing.xs },
  hint: { fontSize: 13, marginBottom: spacing.md },
  options: { gap: spacing.sm },
  option: {
    borderWidth: 2,
    borderRadius: radii.md,
    paddingVertical: 16,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  optionText: { fontSize: 16, fontWeight: '700' },
  saveBtn: {
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  cancelBtn: { marginTop: spacing.md, alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});

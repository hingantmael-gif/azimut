import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import { PhoneModal } from '../PhoneModal';
import { AppTextInput } from '../AppTextInput';
import { radii, spacing } from '../../theme/tokens';

type Props = {
  visible: boolean;
  title: string;
  label: string;
  value: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'decimal-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  prefix?: string;
  /** Filtre la saisie (ex. identifiant sans symboles) */
  sanitize?: (raw: string) => string;
  maxLength?: number;
  /** Longueur minimale avant enregistrement (ex. identifiant ≥ 3). */
  minLength?: number;
  multiline?: boolean;
  /** Libellé du bouton principal (défaut : Enregistrer). */
  saveLabel?: string;
  /** Fermer la feuille après un enregistrement réussi (défaut : true). */
  closeOnSave?: boolean;
  onClose: () => void;
  onSave: (value: string) => void | Promise<void>;
};

const webNoOutline =
  Platform.OS === 'web'
    ? ({
        outlineStyle: 'none',
        outlineWidth: 0,
        outlineColor: 'transparent',
        boxShadow: 'none',
      } as object)
    : null;

export function EditFieldSheet({
  visible,
  title,
  label,
  value,
  placeholder,
  keyboardType = 'default',
  secureTextEntry,
  autoCapitalize = 'sentences',
  prefix,
  sanitize,
  maxLength,
  minLength,
  multiline,
  saveLabel = 'Enregistrer',
  closeOnSave = true,
  onClose,
  onSave,
}: Props) {
  const { colors } = useThemeColors();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(sanitize ? sanitize(value) : value);
      setError('');
    }
  }, [visible, value, sanitize]);

  const onChange = (t: string) => {
    let next = sanitize ? sanitize(t) : t;
    if (maxLength != null && next.length > maxLength) {
      next = next.slice(0, maxLength);
    }
    setDraft(next);
    if (error) setError('');
  };

  const tooShort = minLength != null && draft.length > 0 && draft.length < minLength;
  const canSave =
    !saving &&
    (minLength == null || draft.length >= minLength) &&
    (maxLength == null || draft.length <= maxLength);

  const handleSave = async () => {
    if (minLength != null && draft.length < minLength) {
      setError(`Minimum ${minLength} caractères.`);
      return;
    }
    if (maxLength != null && draft.length > maxLength) {
      setError(`Maximum ${maxLength} caractères.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
      if (closeOnSave) onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PhoneModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              },
              webNoOutline,
            ]}
          >
            {prefix ? (
              <Text style={[styles.prefix, { color: colors.textMuted }]}>{prefix}</Text>
            ) : null}
            <AppTextInput
              style={[
                styles.input,
                { color: colors.text },
                multiline && styles.inputMultiline,
                webNoOutline,
              ]}
              value={draft}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
              keyboardType={keyboardType}
              secureTextEntry={secureTextEntry}
              autoCapitalize={autoCapitalize}
              autoCorrect={false}
              autoFocus
              maxLength={maxLength}
              multiline={multiline}
              underlineColorAndroid="transparent"
              selectionColor={colors.accent}
            />
          </View>
          {maxLength != null ? (
            <Text
              style={[
                styles.counter,
                {
                  color: tooShort || draft.length >= maxLength ? colors.danger : colors.textMuted,
                },
              ]}
            >
              {draft.length}/{maxLength}
              {minLength != null ? ` · min. ${minLength}` : ''}
            </Text>
          ) : null}
          {tooShort ? (
            <Text style={[styles.error, { color: colors.danger }]}>
              Minimum {minLength} caractères.
            </Text>
          ) : null}
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          <Pressable
            style={[
              styles.saveBtn,
              { backgroundColor: colors.accent },
              !canSave && { opacity: 0.45 },
              webNoOutline,
            ]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={styles.saveText}>
              {saving
                ? saveLabel === 'Enregistrer'
                  ? 'Enregistrement…'
                  : '…'
                : saveLabel}
            </Text>
          </Pressable>
          <Pressable onPress={onClose} style={[styles.cancelBtn, webNoOutline]}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Annuler</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  title: { fontSize: 20, fontWeight: '800', marginBottom: spacing.sm },
  label: { fontSize: 13, marginBottom: spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  prefix: { fontSize: 16, marginRight: 2 },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  error: { marginTop: spacing.sm, fontSize: 14 },
  counter: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
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

import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTextInput } from '../AppTextInput';
import type { ActiveProgram, ProgramReviewFeeling } from '../../types/domain';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { ColorPalette } from '../../theme/palettes';

export function programReviewLabel(feeling?: ProgramReviewFeeling | string | null): string | null {
  if (!feeling) return null;
  if (feeling === 'up' || feeling === 'tres_satisfait' || feeling === 'satisfait') {
    return 'Satisfait';
  }
  if (
    feeling === 'down' ||
    feeling === 'decu' ||
    feeling === 'difficile' ||
    feeling === 'mitige'
  ) {
    return 'Pas satisfait';
  }
  return null;
}

export function programReviewEmoji(feeling?: ProgramReviewFeeling | string | null): string | null {
  if (!feeling) return null;
  if (feeling === 'up' || feeling === 'tres_satisfait' || feeling === 'satisfait') {
    return '👍';
  }
  if (
    feeling === 'down' ||
    feeling === 'decu' ||
    feeling === 'difficile' ||
    feeling === 'mitige'
  ) {
    return '👎';
  }
  return null;
}

type Props = {
  program: ActiveProgram;
  onSave: (feeling: ProgramReviewFeeling, comment: string) => void;
  /** Mode modal : titre plus direct après fin de programme */
  promptMode?: boolean;
};

/**
 * Satisfaction fin de programme : pouces + commentaire optionnel.
 */
export function ProgramReviewCard({ program, onSave, promptMode }: Props) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [feeling, setFeeling] = useState<ProgramReviewFeeling | null>(
    normalizeFeeling(program.reviewFeeling),
  );
  const [comment, setComment] = useState(program.reviewComment ?? '');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setFeeling(normalizeFeeling(program.reviewFeeling));
    setComment(program.reviewComment ?? '');
  }, [program.id, program.completedAt, program.reviewFeeling, program.reviewComment]);

  const dirty =
    feeling !== normalizeFeeling(program.reviewFeeling) ||
    comment.trim() !== (program.reviewComment ?? '').trim();

  const canSave = feeling != null && (dirty || promptMode);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {promptMode ? 'Comment as-tu trouvé ce programme ?' : 'Bilan du programme'}
      </Text>
      <Text style={styles.sub}>
        {promptMode
          ? `${program.title} — ton avis, puis un commentaire si tu veux.`
          : 'Choisis un pouce — le commentaire est facultatif.'}
      </Text>

      <View style={styles.thumbs}>
        <Pressable
          onPress={() => setFeeling('up')}
          style={[styles.thumb, feeling === 'up' && styles.thumbUpOn]}
          accessibilityLabel="Satisfait"
        >
          <Text style={styles.thumbEmoji}>👍</Text>
        </Pressable>
        <Pressable
          onPress={() => setFeeling('down')}
          style={[styles.thumb, feeling === 'down' && styles.thumbDownOn]}
          accessibilityLabel="Pas satisfait"
        >
          <Text style={styles.thumbEmoji}>👎</Text>
        </Pressable>
      </View>

      {feeling ? (
        <AppTextInput
          style={styles.input}
          placeholder="Commentaire (facultatif) — visible par tes abonnés…"
          placeholderTextColor={colors.textMuted}
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={400}
        />
      ) : null}

      <Pressable
        style={[styles.saveBtn, !canSave && styles.saveBtnOff]}
        disabled={!canSave}
        onPress={() => {
          if (!feeling) return;
          onSave(feeling, comment.trim());
          setSavedFlash(true);
          setTimeout(() => setSavedFlash(false), 1600);
        }}
      >
        <Text style={styles.saveText}>
          {savedFlash
            ? 'Merci !'
            : program.reviewFeeling
              ? 'Mettre à jour'
              : 'Envoyer mon avis'}
        </Text>
      </Pressable>
    </View>
  );
}

function normalizeFeeling(
  raw?: ProgramReviewFeeling | string | null,
): ProgramReviewFeeling | null {
  if (!raw) return null;
  if (raw === 'up' || raw === 'tres_satisfait' || raw === 'satisfait') return 'up';
  if (raw === 'down' || raw === 'decu' || raw === 'difficile' || raw === 'mitige') {
    return 'down';
  }
  return null;
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { fontWeight: '800', fontSize: 16, color: colors.text },
    sub: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: spacing.md,
      lineHeight: 18,
    },
    thumbs: { flexDirection: 'row', gap: 12 },
    thumb: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.bgSecondary,
    },
    thumbUpOn: {
      borderColor: '#16A34A',
      backgroundColor: '#DCFCE7',
    },
    thumbDownOn: {
      borderColor: '#DC2626',
      backgroundColor: '#FEE2E2',
    },
    thumbEmoji: { fontSize: 28 },
    input: {
      marginTop: spacing.md,
      minHeight: 72,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.bgSecondary,
      textAlignVertical: 'top',
    },
    saveBtn: {
      marginTop: spacing.sm,
      paddingVertical: 12,
      borderRadius: radii.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
    },
    saveBtnOff: { opacity: 0.4 },
    saveText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  });
}

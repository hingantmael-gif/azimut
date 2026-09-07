import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../store/AppContext';
import { ProgramReviewCard } from '../program/ProgramReviewCard';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { ColorPalette } from '../../theme/palettes';

/** Modale après fin de programme — satisfaction pouce + commentaire optionnel. */
export function PendingProgramReviewModal() {
  const { state, dispatch } = useApp();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const pendingId = state.profile.pendingProgramReviewId;
  const program = useMemo(() => {
    if (!pendingId) return null;
    return (state.profile.programHistory ?? []).find((p) => p.id === pendingId) ?? null;
  }, [pendingId, state.profile.programHistory]);

  if (!program) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => undefined}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.kicker}>Programme terminé</Text>
          <ProgramReviewCard
            program={program}
            promptMode
            onSave={(feeling, comment) => {
              dispatch({
                type: 'SAVE_PROGRAM_REVIEW',
                programId: program.id,
                startedAt: program.startedAt,
                completedAt: program.completedAt,
                feeling,
                comment,
              });
            }}
          />
          <Pressable
            style={styles.skip}
            onPress={() => dispatch({ type: 'DISMISS_PROGRAM_REVIEW_PROMPT' })}
          >
            <Text style={styles.skipText}>Plus tard</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    sheet: {
      backgroundColor: colors.bgSecondary,
      borderRadius: radii.lg,
      padding: spacing.md,
      maxHeight: '90%',
    },
    kicker: {
      fontWeight: '800',
      fontSize: 13,
      color: colors.accentDark,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    skip: { alignItems: 'center', paddingVertical: 12 },
    skipText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  });
}

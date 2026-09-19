import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../src/store/AppContext';
import {
  CALISTHENICS_MOVES,
  defaultCalisSkillTree,
  movesByBranch,
  type CalisthenicsBranch,
  type CalisthenicsMoveDefinition,
} from '../src/engines/calisthenicsSkillTree';
import { CALISTHENICS_PROGRAM_WEEKS } from '../src/engines/calisthenicsProgramming';
import { Screen, Title, Muted, Body } from '../src/ui/primitives';
import { AppScrollView } from '../src/ui/scrolling';
import { useThemeColors } from '../src/theme/ThemeContext';
import type { ColorPalette } from '../src/theme/palettes';
import { radii, spacing } from '../src/theme/tokens';

const BRANCHES: Array<{ id: CalisthenicsBranch; label: string }> = [
  { id: 'push', label: 'Push' },
  { id: 'dipHandstand', label: 'Dip / HS' },
  { id: 'rowLever', label: 'Row / Lever' },
  { id: 'pullMuscleUp', label: 'Pull / MU' },
  { id: 'core', label: 'Core' },
  { id: 'legs', label: 'Legs' },
];

/** Arbre de compétences callisthénie — 6 branches, déblocage objectif. */
export default function CalisthenicsSkillsScreen() {
  const { state, dispatch } = useApp();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const completed = state.profile.calisthenicsCompletedIds ?? [];
  const tree = useMemo(() => defaultCalisSkillTree(completed), [completed]);
  const [branch, setBranch] = useState<CalisthenicsBranch>('push');
  const [openId, setOpenId] = useState<string | null>(null);

  const moves = useMemo(() => movesByBranch(branch), [branch]);
  const doneSet = useMemo(() => new Set(completed), [completed]);

  const toggleDone = (id: string) => {
    const next = doneSet.has(id)
      ? completed.filter((x) => x !== id)
      : [...completed, id];
    dispatch({
      type: 'UPDATE_PROFILE',
      patch: { calisthenicsCompletedIds: next },
    });
  };

  return (
    <Screen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Title>Callisthénie</Title>
        <Muted style={{ marginTop: 6, lineHeight: 18 }}>
          Arbre de compétences · {CALISTHENICS_MOVES.length} mouvements · marque
          un jalon quand le critère est validé.
        </Muted>

        <View style={styles.chipRow}>
          {BRANCHES.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => setBranch(b.id)}
              style={[styles.chip, branch === b.id && styles.chipOn]}
            >
              <Text style={[styles.chipText, branch === b.id && styles.chipTextOn]}>
                {b.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {moves.map((m) => {
          const unlocked = tree.find((t) => t.id === m.id)?.unlocked ?? false;
          const done = doneSet.has(m.id);
          const open = openId === m.id;
          return (
            <View
              key={m.id}
              style={[
                styles.card,
                !unlocked && styles.cardLocked,
                done && styles.cardDone,
              ]}
            >
              <Pressable
                onPress={() => setOpenId(open ? null : m.id)}
                disabled={!unlocked && !done}
              >
                <Text style={styles.cardTitle}>
                  {done ? '✓ ' : unlocked ? '' : '🔒 '}
                  {m.title}
                </Text>
                <Text style={styles.cardMeta}>
                  {tierLabel(m)} · {unlockLabel(m)}
                </Text>
              </Pressable>
              {open ? (
                <View style={styles.detail}>
                  <Body style={styles.cue}>{m.cue}</Body>
                  <Muted style={{ marginTop: 6 }}>{m.protocol}</Muted>
                  <Muted style={{ marginTop: 4 }}>
                    Primaire : {m.primaryMuscleGroups.join(', ')}
                  </Muted>
                  {unlocked ? (
                    <Pressable
                      style={styles.markBtn}
                      onPress={() => toggleDone(m.id)}
                    >
                      <Text style={styles.markBtnText}>
                        {done ? 'Retirer la validation' : 'Marquer comme validé'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}

        <Text style={styles.section}>Programmes type</Text>
        {Object.values(CALISTHENICS_PROGRAM_WEEKS).map((p) => (
          <View key={p.title} style={styles.programCard}>
            <Text style={styles.cardTitle}>{p.title}</Text>
            {p.days.map((d) => (
              <Muted key={d.dow} style={{ marginTop: 4 }}>
                {d.dow} · {d.focus} — {d.detail}
              </Muted>
            ))}
          </View>
        ))}
      </AppScrollView>
    </Screen>
  );
}

function tierLabel(m: CalisthenicsMoveDefinition): string {
  const map = {
    foundation: 'Fondation',
    beginner: 'Débutant',
    intermediate: 'Intermédiaire',
    advanced: 'Avancé',
    elite: 'Élite',
  } as const;
  return map[m.tier];
}

function unlockLabel(m: CalisthenicsMoveDefinition): string {
  const u = m.unlockCriteria;
  if (u.type === 'holdSeconds') {
    return `tenir ${u.threshold} s${u.perSide ? '/côté' : ''}`;
  }
  return `${u.threshold} reps${u.perSide ? '/côté' : ''}`;
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
    },
    chipOn: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    chipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
    chipTextOn: { color: colors.accentDark },
    card: {
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
    },
    cardLocked: { opacity: 0.55 },
    cardDone: { borderColor: colors.accent },
    cardTitle: { fontWeight: '800', fontSize: 15, color: colors.text },
    cardMeta: {
      marginTop: 4,
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '600',
    },
    detail: { marginTop: spacing.sm },
    cue: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
    markBtn: {
      marginTop: spacing.sm,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.accent,
    },
    markBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    section: {
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
      fontWeight: '800',
      fontSize: 16,
      color: colors.text,
    },
    programCard: {
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
  });
}

import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import { ProgramEvolutionCard } from '../../src/ui/ProgramEvolutionCard';
import { ProgramReviewCard } from '../../src/ui/program/ProgramReviewCard';
import { ProgramSportCover } from '../../src/ui/program/SportCover';
import { activitiesForProgram, plannedSessionsForProgram } from '../../src/engines/programSessions';
import { computeProgramEvolution } from '../../src/engines/programProgress';
import { formatDuration } from '../../src/engines/core';
import { DISCIPLINE_META } from '../../src/constants/disciplines';
import { formatProgramDurationLabel } from '../../src/constants/programs';
import { resolveActivePrograms } from '../../src/engines/multiProgramPlan';
import { summarizeWorkout } from '../../src/engines/workoutPresentation';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import type { ActiveProgram, PlannedWorkout } from '../../src/types/domain';
import {
  FadeInUp,
  PressableScale,
  SectionHeader,
  SoftPulse,
} from '../../src/ui/motion/softMotion';
import { AppScrollView } from '../../src/ui/scrolling';

/** Détail programme — planification mois → semaines → séances */
export default function ProgramDetailScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    scope?: string;
    id?: string;
    at?: string;
  }>();

  const program: ActiveProgram | undefined = useMemo(() => {
    if (params.scope === 'active') {
      const active = resolveActivePrograms(state.profile);
      const id = typeof params.id === 'string' ? params.id : undefined;
      if (id) return active.find((p) => p.id === id) ?? state.profile.activeProgram;
      return state.profile.activeProgram ?? active[0];
    }
    const id = params.id;
    const at = params.at;
    return (state.profile.programHistory ?? []).find(
      (p) => p.id === id && (!at || p.completedAt === at || p.startedAt === at),
    );
  }, [
    params,
    state.profile.activeProgram,
    state.profile.activePrograms,
    state.profile.programHistory,
  ]);

  const isActive = params.scope === 'active';
  const [cancelOpen, setCancelOpen] = useState(false);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [openWeek, setOpenWeek] = useState<string | null>(null);

  const activities = program
    ? activitiesForProgram(program, state.activities)
    : [];
  const planned = plannedSessionsForProgram(state.plan, program, isActive);
  const evo = program ? computeProgramEvolution(program) : null;

  const months = useMemo(() => groupByMonth(planned), [planned]);

  if (!program) {
    return (
      <View style={styles.root}>
        <Text style={styles.empty}>Programme introuvable.</Text>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/programs');
          }}
        >
          <Text style={styles.link}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const isStrengthProgram = program.sportCategory === 'strength';

  const toggleMonth = (key: string) => {
    if (openMonth === key) {
      setOpenMonth(null);
      setOpenWeek(null);
    } else {
      setOpenMonth(key);
      setOpenWeek(null);
    }
  };

  const toggleWeek = (key: string) => {
    setOpenWeek((prev) => (prev === key ? null : key));
  };

  return (
    <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <FadeInUp>
        <ProgramSportCover
          sportCategory={program.sportCategory}
          catalogId={program.catalogId}
          minHeight={200}
          borderRadius={radii.xl}
          style={styles.hero}
          scrim="rgba(7,17,31,0.55)"
        >
          <SoftPulse intensity={0.03}>
            <Text style={styles.heroEyebrow}>
              {isActive ? 'Programme actif' : 'Programme terminé'}
            </Text>
          </SoftPulse>
          <Text style={styles.title}>{program.title}</Text>
          <Text style={styles.sub}>{program.subtitle}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>
                {formatProgramDurationLabel(program)}
              </Text>
            </View>
            <Text style={styles.meta}>
              {program.completedAt
                ? `Terminé le ${new Date(program.completedAt).toLocaleDateString('fr-FR')}`
                : `Depuis le ${new Date(program.startedAt).toLocaleDateString('fr-FR')}`}
            </Text>
          </View>
        </ProgramSportCover>
      </FadeInUp>

      {isActive ? (
        <FadeInUp delay={40}>
          <Pressable style={styles.cancelBtn} onPress={() => setCancelOpen(true)}>
            <Text style={styles.cancelBtnText}>Supprimer ce programme</Text>
          </Pressable>
        </FadeInUp>
      ) : null}

      <FadeInUp delay={80}>
        <View style={{ marginTop: spacing.md }}>
          <ProgramEvolutionCard program={program} />
        </View>
      </FadeInUp>

      {evo?.gainLabel ? (
        <FadeInUp delay={120}>
          <View
            style={[
              styles.gainCard,
              evo.improved ? styles.gainCardUp : styles.gainCardDown,
            ]}
          >
            <Text style={styles.gainEmoji}>{evo.improved ? '↑' : '→'}</Text>
            <Text
              style={[styles.gain, evo.improved ? styles.gainUp : styles.gainDown]}
            >
              {evo.improved ? 'Temps gagné ' : 'Écart '}
              {evo.gainLabel}
            </Text>
          </View>
        </FadeInUp>
      ) : null}

      {isActive ? (
        <FadeInUp delay={150}>
          <PressableScale
            style={styles.cta}
            onPress={() => router.push('/program/progress')}
          >
            <Text style={styles.ctaText}>Enregistrer un test / évolution</Text>
            <Text style={styles.ctaArrow}>→</Text>
          </PressableScale>
        </FadeInUp>
      ) : null}

      {!isActive ? (
        <FadeInUp delay={160}>
          <ProgramReviewCard
            program={program}
            onSave={(feeling, comment) =>
              dispatch({
                type: 'SAVE_PROGRAM_REVIEW',
                programId: program.id,
                startedAt: program.startedAt,
                completedAt: program.completedAt,
                feeling,
                comment,
              })
            }
          />
        </FadeInUp>
      ) : null}

      <Modal
        visible={cancelOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Supprimer le programme ?</Text>
            <Text style={styles.modalBody}>
              Les séances futures de ce programme seront retirées du planning. Vos
              autres programmes actifs restent inchangés.
            </Text>
            <Pressable
              style={styles.modalDanger}
              onPress={() => {
                setCancelOpen(false);
                dispatch({ type: 'CANCEL_PROGRAM', programId: program.id });
                router.replace('/programs');
              }}
            >
              <Text style={styles.modalDangerText}>Supprimer</Text>
            </Pressable>
            <Pressable style={styles.modalCancel} onPress={() => setCancelOpen(false)}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {isActive && planned.length > 0 ? (
        <>
          <SectionHeader
            title="Planification prévue"
            subtitle="Mois → semaines → touche une séance pour le détail"
            accentColor={colors.accent}
            delay={180}
          />
          {months.map((month) => {
            const isMonthOpen = openMonth === month.key;
            return (
              <FadeInUp key={month.key} delay={200}>
                <View style={styles.monthBlock}>
                  <Pressable
                    style={styles.monthHead}
                    onPress={() => toggleMonth(month.key)}
                  >
                    <View style={styles.monthDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.monthLabel}>{month.label}</Text>
                      <Text style={styles.monthMeta}>
                        {month.weeks.length} semaine
                        {month.weeks.length > 1 ? 's' : ''} · {month.sessionCount}{' '}
                        séance{month.sessionCount > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>{isMonthOpen ? '▾' : '›'}</Text>
                  </Pressable>

                  {isMonthOpen
                    ? month.weeks.map((week) => {
                        const isWeekOpen = openWeek === week.key;
                        return (
                          <View key={week.key} style={styles.weekBlock}>
                            <Pressable
                              style={styles.weekHead}
                              onPress={() => toggleWeek(week.key)}
                            >
                              <View style={styles.weekDot} />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.weekLabel}>{week.label}</Text>
                                <Text style={styles.weekMeta}>
                                  {week.sessions.length} séance
                                  {week.sessions.length > 1 ? 's' : ''}
                                </Text>
                              </View>
                              <Text style={styles.chevron}>
                                {isWeekOpen ? '▾' : '›'}
                              </Text>
                            </Pressable>

                            {isWeekOpen
                              ? week.sessions.map((w) => {
                                  const color =
                                    DISCIPLINE_META[w.discipline]?.color ??
                                    colors.accent;
                                  const sum = summarizeWorkout(w);
                                  const day = new Date(
                                    w.date + 'T12:00:00',
                                  ).toLocaleDateString('fr-FR', {
                                    weekday: 'short',
                                    day: 'numeric',
                                  });
                                  return (
                                    <PressableScale
                                      key={w.id}
                                      style={[
                                        styles.planCard,
                                        {
                                          backgroundColor: `${color}14`,
                                          borderColor: `${color}33`,
                                        },
                                      ]}
                                      onPress={() =>
                                        router.push(`/session/${w.id}`)
                                      }
                                    >
                                      <View
                                        style={[
                                          styles.planDay,
                                          { backgroundColor: color },
                                        ]}
                                      >
                                        <Text style={styles.planDayText}>{day}</Text>
                                      </View>
                                      <View style={{ flex: 1 }}>
                                        <Text style={styles.rowTitle}>{w.title}</Text>
                                        <Text style={styles.rowMeta}>
                                          {DISCIPLINE_META[w.discipline]?.label ??
                                            w.discipline}
                                          {sum.durationLabel
                                            ? ` · ${sum.durationLabel}`
                                            : ''}
                                          {sum.distanceLabel
                                            ? ` · ${sum.distanceLabel}`
                                            : ''}
                                        </Text>
                                      </View>
                                      <View
                                        style={[
                                          styles.planPip,
                                          { backgroundColor: color },
                                        ]}
                                      />
                                    </PressableScale>
                                  );
                                })
                              : null}
                          </View>
                        );
                      })
                    : null}
                </View>
              </FadeInUp>
            );
          })}
        </>
      ) : null}

      <SectionHeader
        title="Séances réalisées"
        subtitle={
          activities.length === 0
            ? isStrengthProgram
              ? 'Valide tes séances avec le feedback RPE'
              : 'Importe tes sorties pour voir l’historique ici'
            : `${activities.length} activité${activities.length > 1 ? 's' : ''}`
        }
        accentColor="#0E8F6F"
        delay={220}
      />
      {activities.length === 0 ? (
        <Text style={styles.empty}>
          {isStrengthProgram
            ? 'Aucune séance validée pour l’instant — utilise le feedback RPE après ta séance.'
            : 'Aucune activité importée pour ce programme pour l’instant.'}
        </Text>
      ) : (
        activities.map((a, i) => (
          <FadeInUp key={a.id} delay={240 + i * 40}>
            <PressableScale
              style={styles.activityCard}
              onPress={() =>
                router.push({
                  pathname: '/activity/[id]',
                  params: { id: a.id },
                })
              }
            >
              <View style={styles.activityStripe} />
              <View style={styles.activityBody}>
                <Text style={styles.rowTitle}>{a.name}</Text>
                <Text style={styles.rowMeta}>
                  {new Date(a.startDate).toLocaleDateString('fr-FR')} ·{' '}
                  {(a.distanceM / 1000).toFixed(1)} km · {formatDuration(a.movingSec)}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </PressableScale>
          </FadeInUp>
        ))
      )}
    </AppScrollView>
  );
}

type WeekBucket = {
  key: string;
  label: string;
  sessions: PlannedWorkout[];
};

type MonthBucket = {
  key: string;
  label: string;
  sessionCount: number;
  weeks: WeekBucket[];
};

function mondayOf(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const day = d.getDay(); // 0 dim
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function groupByMonth(planned: PlannedWorkout[]): MonthBucket[] {
  const monthMap = new Map<string, PlannedWorkout[]>();
  for (const w of planned) {
    const key = w.date.slice(0, 7);
    const list = monthMap.get(key) ?? [];
    list.push(w);
    monthMap.set(key, list);
  }

  return [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, sessions]) => {
      const label = new Date(monthKey + '-15T12:00:00').toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      });
      const weekMap = new Map<string, PlannedWorkout[]>();
      for (const s of sessions) {
        const wk = mondayOf(s.date);
        const list = weekMap.get(wk) ?? [];
        list.push(s);
        weekMap.set(wk, list);
      }
      const weeks: WeekBucket[] = [...weekMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([wk, list]) => {
          const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
          const start = new Date(wk + 'T12:00:00');
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          const labelWeek = `Semaine du ${start.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
          })} → ${end.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
          })}`;
          return { key: `${monthKey}-${wk}`, label: labelWeek, sessions: sorted };
        });

      return {
        key: monthKey,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        sessionCount: sessions.length,
        weeks,
      };
    });
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary, padding: spacing.md },
    hero: {
      borderRadius: radii.xl,
      overflow: 'hidden',
    },
    heroEyebrow: {
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '800',
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    title: { fontSize: 24, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },
    sub: { marginTop: 6, color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 20 },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: spacing.md,
      flexWrap: 'wrap',
    },
    metaChip: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radii.pill,
    },
    metaChipText: { color: colors.white, fontWeight: '800', fontSize: 12 },
    meta: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 13 },
    gainCard: {
      marginTop: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: spacing.md,
      borderRadius: radii.lg,
    },
    gainCardUp: { backgroundColor: `${colors.success}26` },
    gainCardDown: { backgroundColor: `${colors.danger}26` },
    gainEmoji: { fontSize: 20, fontWeight: '800', color: colors.text },
    gain: { fontSize: 17, fontWeight: '800' },
    gainUp: { color: colors.success },
    gainDown: { color: colors.danger },
    cta: {
      marginTop: spacing.md,
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.bg,
      borderWidth: 1.5,
      borderColor: colors.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    ctaText: { color: colors.accentDark, fontWeight: '800', fontSize: 15 },
    ctaArrow: { color: colors.accent, fontWeight: '800', fontSize: 18 },
    cancelBtn: {
      marginTop: spacing.sm,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.bg,
    },
    cancelBtnText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      backgroundColor: colors.bg,
      borderRadius: radii.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontWeight: '800',
      fontSize: 17,
      color: colors.text,
    },
    modalBody: {
      marginTop: 8,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    modalDanger: {
      marginTop: spacing.md,
      paddingVertical: 12,
      borderRadius: radii.md,
      backgroundColor: colors.danger,
      alignItems: 'center',
    },
    modalDangerText: { color: colors.white, fontWeight: '800', fontSize: 15 },
    modalCancel: {
      marginTop: spacing.sm,
      paddingVertical: 10,
      alignItems: 'center',
    },
    modalCancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
    empty: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
    link: { marginTop: 12, color: colors.accent, fontWeight: '700' },
    activityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      marginBottom: spacing.sm,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    activityStripe: { width: 6, alignSelf: 'stretch', backgroundColor: '#0E8F6F' },
    activityBody: { flex: 1, paddingVertical: 14, paddingHorizontal: spacing.md },
    monthBlock: {
      marginBottom: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.xl,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    monthHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
    },
    monthDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
    },
    monthLabel: {
      fontWeight: '800',
      fontSize: 16,
      color: colors.text,
      textTransform: 'capitalize',
    },
    monthMeta: { marginTop: 2, fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    weekBlock: {
      marginHorizontal: spacing.sm,
      marginBottom: spacing.sm,
      backgroundColor: colors.bgSecondary,
      borderRadius: radii.lg,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    weekHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.sm,
    },
    weekDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accentDark,
    },
    weekLabel: { fontWeight: '700', fontSize: 14, color: colors.text },
    weekMeta: { marginTop: 2, fontSize: 11, color: colors.textMuted },
    planCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
      padding: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    planDay: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: radii.sm,
      minWidth: 52,
      alignItems: 'center',
    },
    planDayText: { color: colors.white, fontWeight: '800', fontSize: 11 },
    planPip: { width: 8, height: 8, borderRadius: 4 },
    rowTitle: { fontWeight: '700', fontSize: 14, color: colors.text },
    rowMeta: { marginTop: 2, fontSize: 12, color: colors.textSecondary },
    chevron: { color: colors.textMuted, fontWeight: '800', fontSize: 18, paddingHorizontal: 4 },
  });
}

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../src/ui/Text';
import { AppScrollView } from '../src/ui/scrolling';
import { Chip, PrimaryButton, Screen, SecondaryButton } from '../src/ui/primitives';
import { useApp } from '../src/store/AppContext';
import { useThemeColors } from '../src/theme/ThemeContext';
import { radii, spacing } from '../src/theme/tokens';
import type { PlannedWorkout } from '../src/types/domain';
import { resolveAthletePaceZones, summarizeWorkout } from '../src/engines/workoutPresentation';
import { resolvePaceZones } from '../src/engines/paceZones';
import { normalizeStrengthEquipment, STRENGTH_TARGET_OPTIONS, type StrengthBodyFocus, type StrengthTarget } from '../src/engines/strengthProgramming';
import { toLocalDateIso, addDaysIso } from '../src/engines/sleepCalendar';
import {
  buildLibrary,
  buildQuickSession,
  CALIS_GOAL_LIB_LABEL,
  defaultLibContext,
  instantiateWorkout,
  LIB_SPORTS,
  type LibSport,
} from '../src/engines/sessionLibrary';
import {
  CALIS_SCOPE_OPTIONS,
  CALIS_TARGET_OPTIONS,
  type CalisScope,
  type CalisTarget,
  type CalisthenicsGoalFocus,
} from '../src/engines/calisthenicsProgramming';
import { canStartGuidedStrengthSession } from '../src/engines/guidedStrengthSession';
import { canStartLiveWorkout } from '../src/engines/liveWorkout';

const DURATIONS = [15, 20, 30, 45, 60];
const STRENGTH_FOCUS: Array<{ id: StrengthBodyFocus; label: string }> = [
  { id: 'full', label: 'Ensemble du corps' },
  { id: 'upper', label: 'Haut du corps' },
  { id: 'lower', label: 'Bas du corps' },
];

/**
 * Séances : « séance rapide » (sport + temps disponible) et bibliothèque complète.
 * Tout se lance tout de suite — plus besoin d'attendre le prochain jour du plan.
 */
export default function LibraryScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const params = useLocalSearchParams<{ sport?: string; quick?: string }>();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const ob = state.profile.onboarding;
  const level = ob?.level ?? 'intermediaire';
  const ctx = useMemo(() => {
    const zones = resolveAthletePaceZones(ob, state.activities) ?? resolvePaceZones({ level });
    return defaultLibContext(level, zones, {
      ftp: ob?.ftpWatts && ob.ftpWatts >= 80 ? ob.ftpWatts : undefined,
      equipment: normalizeStrengthEquipment(ob?.strengthEquipment),
    });
  }, [ob, level, state.activities]);

  const initialSport = LIB_SPORTS.some((s) => s.id === params.sport) ? (params.sport as LibSport) : 'run';
  const [sport, setSport] = useState<LibSport>(initialSport);
  const [minutes, setMinutes] = useState(30);
  const [scope, setScope] = useState<CalisScope | null>(null);
  const [targets, setTargets] = useState<CalisTarget[]>([]);
  // Mêmes cibles pour la musculation et la callisthénie (mêmes identifiants).
  const [strengthFocus, setStrengthFocus] = useState<StrengthBodyFocus>('full');
  const [calisGoal, setCalisGoal] = useState<CalisthenicsGoalFocus>('hypertrophy');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const todayIso = toLocalDateIso(new Date());
  const entries = useMemo(() => buildLibrary(ctx, todayIso, { calisGoal }).filter((e) => e.sport === sport), [ctx, todayIso, calisGoal, sport]);
  const groups = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const e of entries) map.set(e.group, [...(map.get(e.group) ?? []), e]);
    return [...map.entries()];
  }, [entries]);

  /** Ajoute la séance au plan puis l'ouvre dans le bon lecteur (GPS, guidé ou détail). */
  const launch = (w: PlannedWorkout, when: 'now' | 'tomorrow') => {
    const date = when === 'now' ? todayIso : addDaysIso(todayIso, 1);
    // « Maintenant » = séance ad hoc (ne remplace pas la séance du jour) ; « demain » = vraie séance du plan.
    const workout = w.id.startsWith('w-quick-') ? { ...w, date, adHoc: when === 'now' } : instantiateWorkout(w, date, when === 'now');
    dispatch({ type: 'ADD_WORKOUT', workout });
    if (when === 'tomorrow') {
      router.navigate('/calendar');
      return;
    }
    if (canStartGuidedStrengthSession(workout)) router.push({ pathname: '/session/guided', params: { id: workout.id } });
    else if (canStartLiveWorkout(workout.discipline)) router.push({ pathname: '/session/live', params: { id: workout.id } });
    else router.push(`/session/${workout.id}`);
  };

  const startQuick = () => {
    const w = buildQuickSession(ctx, todayIso, {
      sport,
      minutes,
      scope: scope ?? undefined,
      targets,
      calisGoal,
      strengthFocus,
      strengthTargets: sport === 'strength' ? (targets as StrengthTarget[]) : undefined,
    });
    launch(w, 'now');
  };

  const isBody = sport === 'calisthenics' || sport === 'strength';

  return (
    <Screen>
      <AppScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Séances</Text>
        <Text style={styles.sub}>Choisis un sport, lance une séance rapide ou pioche dans la bibliothèque — tout démarre tout de suite.</Text>

        <View style={styles.chips}>
          {LIB_SPORTS.map((s) => (
            <Chip key={s.id} label={s.label} selected={sport === s.id} onPress={() => { setSport(s.id); setOpenKey(null); setTargets([]); }} />
          ))}
        </View>

        {/* ——— Séance rapide ——— */}
        <View style={[styles.quick, { backgroundColor: colors.bgCard, borderColor: params.quick ? colors.accent : colors.border }]}>
          <View style={styles.quickHead}>
            <Ionicons name="flash" size={18} color={colors.accent} />
            <Text style={styles.quickTitle}>Séance rapide</Text>
          </View>
          <Text style={styles.label}>Combien de temps as-tu ?</Text>
          <View style={styles.chips}>
            {DURATIONS.map((d) => (
              <Chip key={d} label={`${d} min`} selected={minutes === d} onPress={() => setMinutes(d)} />
            ))}
          </View>

          {sport === 'strength' ? (
            <>
              <Text style={styles.label}>Zone du corps</Text>
              <View style={styles.chips}>
                {STRENGTH_FOCUS.map((f) => (
                  <Chip key={f.id} label={f.label} selected={targets.length === 0 && strengthFocus === f.id} onPress={() => { setStrengthFocus(f.id); setTargets([]); }} />
                ))}
              </View>
              <Text style={styles.label}>Ou cible précise</Text>
              <View style={styles.chips}>
                {STRENGTH_TARGET_OPTIONS.map((t) => (
                  <Chip
                    key={t.id}
                    label={t.label}
                    selected={targets.includes(t.id)}
                    onPress={() => setTargets((cur) => (cur.includes(t.id) ? cur.filter((x) => x !== t.id) : [...cur, t.id]))}
                  />
                ))}
              </View>
            </>
          ) : null}

          {sport === 'calisthenics' ? (
            <>
              <Text style={styles.label}>Zone du corps</Text>
              <View style={styles.chips}>
                {CALIS_SCOPE_OPTIONS.map((o) => (
                  <Chip key={o.id} label={o.label} selected={targets.length === 0 && (scope ?? 'full') === o.id} onPress={() => { setScope(o.id); setTargets([]); }} />
                ))}
              </View>
              <Text style={styles.label}>Ou cible précise</Text>
              <View style={styles.chips}>
                {CALIS_TARGET_OPTIONS.map((t) => (
                  <Chip
                    key={t.id}
                    label={t.label}
                    selected={targets.includes(t.id)}
                    onPress={() => setTargets((cur) => (cur.includes(t.id) ? cur.filter((x) => x !== t.id) : [...cur, t.id]))}
                  />
                ))}
              </View>
            </>
          ) : null}

          <PrimaryButton label={`Lancer une séance de ${minutes} min`} onPress={startQuick} />
        </View>

        {/* ——— Bibliothèque ——— */}
        <Text style={styles.section}>Bibliothèque · {LIB_SPORTS.find((s) => s.id === sport)?.label}</Text>
        {sport === 'calisthenics' ? (
          <>
            <Text style={styles.label}>Objectif des séances</Text>
            <View style={styles.chips}>
              {(Object.keys(CALIS_GOAL_LIB_LABEL) as CalisthenicsGoalFocus[]).map((g) => (
                <Chip key={g} label={CALIS_GOAL_LIB_LABEL[g]} selected={calisGoal === g} onPress={() => setCalisGoal(g)} />
              ))}
            </View>
          </>
        ) : null}

        {groups.map(([group, list]) => (
          <View key={group} style={{ marginTop: spacing.md }}>
            <Text style={styles.group}>{group}</Text>
            {list.map((e) => {
              const open = openKey === e.key;
              const summary = open ? summarizeWorkout(e.workout) : null;
              return (
                <View key={e.key} style={[styles.card, { backgroundColor: colors.bgCard, borderColor: open ? colors.accent : colors.border }]}>
                  <Pressable onPress={() => setOpenKey(open ? null : e.key)} accessibilityRole="button" accessibilityLabel={e.title} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{e.title}</Text>
                      <Text style={styles.cardMeta}>
                        {e.minutes} min
                        {e.workout.plannedDistanceM ? ` · ${(e.workout.plannedDistanceM / 1000).toFixed(1).replace('.', ',')} km` : ''}
                      </Text>
                    </View>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                  </Pressable>
                  {open && summary ? (
                    <View style={{ gap: 6, marginTop: spacing.sm }}>
                      {summary.stepLines.slice(0, 14).map((l, i) => (
                        <View key={i} style={styles.step}>
                          <Text style={styles.stepTitle} numberOfLines={2}>{l.title}</Text>
                          {l.detail ? <Text style={styles.stepDetail} numberOfLines={1}>{l.detail}</Text> : null}
                        </View>
                      ))}
                      <PrimaryButton label="Faire maintenant" onPress={() => launch(e.workout, 'now')} />
                      <SecondaryButton label="Le faire demain" onPress={() => launch(e.workout, 'tomorrow')} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
        {isBody ? null : <View style={{ height: spacing.md }} />}
      </AppScrollView>
    </Screen>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>['colors']) {
  return StyleSheet.create({
    scroll: { padding: spacing.md, paddingBottom: 80, gap: 4 },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    sub: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
    quick: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1.5 },
    quickHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    quickTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    label: { fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4, marginTop: spacing.sm },
    section: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
    group: { fontSize: 12, fontWeight: '800', color: colors.accent, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
    card: { padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, marginBottom: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    step: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    stepTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
    stepDetail: { fontSize: 12, color: colors.textMuted, maxWidth: '55%' },
  });
}

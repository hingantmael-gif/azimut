import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../src/ui/Text';
import { AppScrollView } from '../src/ui/scrolling';
import { Chip, PrimaryButton, Screen } from '../src/ui/primitives';
import { PressableScale } from '../src/ui/motion/softMotion';
import { useApp } from '../src/store/AppContext';
import { useThemeColors } from '../src/theme/ThemeContext';
import { radii, spacing } from '../src/theme/tokens';
import type { PlannedWorkout } from '../src/types/domain';
import { resolveAthletePaceZones, summarizeWorkout } from '../src/engines/workoutPresentation';
import { resolvePaceZones } from '../src/engines/paceZones';
import { normalizeStrengthEquipment, type StrengthBodyFocus, type StrengthTarget } from '../src/engines/strengthProgramming';
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
  CALIS_TARGET_OPTIONS,
  type CalisScope,
  type CalisTarget,
  type CalisthenicsGoalFocus,
} from '../src/engines/calisthenicsProgramming';
import { canStartGuidedStrengthSession } from '../src/engines/guidedStrengthSession';
import { canStartLiveWorkout } from '../src/engines/liveWorkout';

type Step = 'sport' | 'time' | 'area' | 'browse';

const MIN = 10;
const MAX = 90;
const SNAP = 5;

const SPORT_TILES: Array<{ id: LibSport; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'run', label: 'Course', sub: 'Footing, allure, fractionné', icon: 'walk' },
  { id: 'bike', label: 'Vélo', sub: 'Sortie à ton rythme', icon: 'bicycle' },
  { id: 'swim', label: 'Natation', sub: 'Piscine ou eau libre', icon: 'water' },
  { id: 'strength', label: 'Musculation', sub: 'Salle ou maison', icon: 'barbell' },
  { id: 'calisthenics', label: 'Callisthénie', sub: 'Poids du corps', icon: 'body' },
];

/** Zones à travailler : trois choix larges, puis des cibles précises. */
const AREA_TILES: Array<{ id: CalisScope; label: string }> = [
  { id: 'full', label: 'Tout le corps' },
  { id: 'upper', label: 'Haut du corps' },
  { id: 'lower', label: 'Bas du corps' },
];

/**
 * Séance rapide GUIDÉE en 2–3 étapes : 1) le sport → 2) le temps dont tu disposes → (3) la zone du corps pour
 * la muscu / callisthénie → lancement. La bibliothèque complète reste accessible, à part.
 */
export default function LibraryScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const params = useLocalSearchParams<{ sport?: string }>();
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

  const presetSport = LIB_SPORTS.some((s) => s.id === params.sport) ? (params.sport as LibSport) : null;
  const [step, setStep] = useState<Step>(presetSport ? 'time' : 'sport');
  const [sport, setSport] = useState<LibSport>(presetSport ?? 'run');
  const [minutes, setMinutes] = useState(30);
  const [scope, setScope] = useState<CalisScope>('full');
  const [targets, setTargets] = useState<CalisTarget[]>([]);
  const [calisGoal, setCalisGoal] = useState<CalisthenicsGoalFocus>('hypertrophy');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const todayIso = toLocalDateIso(new Date());
  const isBody = sport === 'strength' || sport === 'calisthenics';
  const sportLabel = SPORT_TILES.find((s) => s.id === sport)?.label ?? '';

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
    const strengthFocus: StrengthBodyFocus = scope === 'upper' ? 'upper' : scope === 'lower' ? 'lower' : 'full';
    launch(
      buildQuickSession(ctx, todayIso, {
        sport,
        minutes,
        scope: targets.length === 0 ? scope : undefined,
        targets,
        calisGoal,
        strengthFocus,
        strengthTargets: sport === 'strength' ? (targets as StrengthTarget[]) : undefined,
      }),
      'now',
    );
  };

  const back = () => {
    if (step === 'area') setStep('time');
    else if (step === 'time') setStep('sport');
    else if (step === 'browse') setStep('sport');
    else router.back();
  };

  const stepIndex = step === 'sport' ? 1 : step === 'time' ? 2 : step === 'area' ? 3 : 0;
  const totalSteps = isBody ? 3 : 2;

  const areaSummary =
    targets.length > 0
      ? targets.map((t) => CALIS_TARGET_OPTIONS.find((o) => o.id === t)!.label.toLowerCase()).join(' + ')
      : AREA_TILES.find((a) => a.id === scope)!.label.toLowerCase();

  return (
    <Screen>
      <AppScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topRow}>
          {step !== 'sport' ? (
            <Pressable onPress={back} hitSlop={10} accessibilityRole="button" accessibilityLabel="Étape précédente" style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
              <Text style={styles.backText}>{step === 'browse' ? 'Séance rapide' : 'Retour'}</Text>
            </Pressable>
          ) : (
            <View />
          )}
          {stepIndex > 0 ? (
            <View style={styles.dots}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View key={i} style={[styles.dot, i < stepIndex && { backgroundColor: colors.accent }]} />
              ))}
            </View>
          ) : null}
        </View>

        {/* ——— 1 · Le sport ——— */}
        {step === 'sport' ? (
          <>
            <Text style={styles.title}>Que veux-tu faire ?</Text>
            <Text style={styles.sub}>Une séance prête en quelques secondes, à faire tout de suite.</Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              {SPORT_TILES.map((s) => (
                <PressableScale
                  key={s.id}
                  variant="nav"
                  accessibilityLabel={s.label}
                  onPress={() => {
                    setSport(s.id);
                    setTargets([]);
                    setStep('time');
                  }}
                  contentStyle={[styles.sportTile, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                >
                  <View style={[styles.sportIcon, { backgroundColor: colors.accentLight }]}>
                    <Ionicons name={s.icon} size={22} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sportLabel}>{s.label}</Text>
                    <Text style={styles.sportSub}>{s.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </PressableScale>
              ))}
            </View>
            <Pressable onPress={() => setStep('browse')} accessibilityRole="button" style={styles.browseLink}>
              <Text style={[styles.browseText, { color: colors.accent }]}>Parcourir toutes les séances ›</Text>
            </Pressable>
          </>
        ) : null}

        {/* ——— 2 · Le temps ——— */}
        {step === 'time' ? (
          <>
            <Text style={styles.title}>Combien de temps ?</Text>
            <Text style={styles.sub}>{sportLabel} · fais glisser pour régler la durée.</Text>
            <View style={styles.timeBox}>
              <Text style={styles.bigNumber}>{minutes}</Text>
              <Text style={styles.bigUnit}>minutes</Text>
            </View>
            <MinutesSlider value={minutes} onChange={setMinutes} colors={colors} />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>Express</Text>
              <Text style={styles.sliderLabel}>Séance complète</Text>
            </View>
            <View style={{ marginTop: spacing.lg }}>
              {isBody ? (
                <PrimaryButton label="Continuer" onPress={() => setStep('area')} />
              ) : (
                <PrimaryButton label={`Lancer · ${minutes} min`} onPress={startQuick} />
              )}
            </View>
          </>
        ) : null}

        {/* ——— 3 · La zone du corps (muscu / callisthénie) ——— */}
        {step === 'area' ? (
          <>
            <Text style={styles.title}>Que veux-tu travailler ?</Text>
            <Text style={styles.sub}>Choisis une zone, ou cible des muscles précis.</Text>
            <View style={styles.areaRow}>
              {AREA_TILES.map((a) => {
                const on = targets.length === 0 && scope === a.id;
                return (
                  <PressableScale
                    key={a.id}
                    variant="pop"
                    style={{ flex: 1 }}
                    accessibilityLabel={a.label}
                    onPress={() => {
                      setScope(a.id);
                      setTargets([]);
                    }}
                    contentStyle={[styles.areaTile, { backgroundColor: on ? colors.accent : colors.bgCard, borderColor: on ? colors.accent : colors.border }]}
                  >
                    <Text style={[styles.areaText, { color: on ? colors.onAccent : colors.text }]}>{a.label}</Text>
                  </PressableScale>
                );
              })}
            </View>
            <Text style={styles.label}>Ou cible précise</Text>
            <View style={styles.pills}>
              {CALIS_TARGET_OPTIONS.map((t) => (
                <Chip
                  key={t.id}
                  label={t.label}
                  selected={targets.includes(t.id)}
                  onPress={() => setTargets((cur) => (cur.includes(t.id) ? cur.filter((x) => x !== t.id) : [...cur, t.id]))}
                />
              ))}
            </View>
            {sport === 'calisthenics' ? (
              <>
                <Text style={styles.label}>Objectif</Text>
                <View style={styles.pills}>
                  {(Object.keys(CALIS_GOAL_LIB_LABEL) as CalisthenicsGoalFocus[]).map((g) => (
                    <Chip key={g} label={CALIS_GOAL_LIB_LABEL[g]} selected={calisGoal === g} onPress={() => setCalisGoal(g)} />
                  ))}
                </View>
              </>
            ) : null}
            <View style={{ marginTop: spacing.lg }}>
              <PrimaryButton label={`Lancer · ${minutes} min · ${areaSummary}`} onPress={startQuick} />
            </View>
          </>
        ) : null}

        {/* ——— Bibliothèque complète ——— */}
        {step === 'browse' ? <Browse ctx={ctx} todayIso={todayIso} calisGoal={calisGoal} setCalisGoal={setCalisGoal} openKey={openKey} setOpenKey={setOpenKey} launch={launch} styles={styles} colors={colors} /> : null}
      </AppScrollView>
    </Screen>
  );
}

/** Curseur de durée : on fait glisser (ou on touche) la piste ; valeurs de 5 en 5 min. */
function MinutesSlider({
  value,
  onChange,
  colors,
}: {
  value: number;
  onChange: (v: number) => void;
  colors: ReturnType<typeof useThemeColors>['colors'];
}) {
  const width = useRef(1);
  const cb = useRef(onChange);
  cb.current = onChange;
  const startX = useRef(0);

  const fromX = (x: number) => {
    const ratio = Math.min(1, Math.max(0, x / width.current));
    const raw = MIN + ratio * (MAX - MIN);
    return Math.min(MAX, Math.max(MIN, Math.round(raw / SNAP) * SNAP));
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          startX.current = e.nativeEvent.locationX;
          cb.current(fromX(startX.current));
        },
        // Position de départ + déplacement : fiable même quand le doigt sort de la piste.
        onPanResponderMove: (_e, g) => cb.current(fromX(startX.current + g.dx)),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const ratio = (value - MIN) / (MAX - MIN);
  const marks = [15, 30, 45, 60, 75];

  return (
    <View
      style={sliderStyles.wrap}
      onLayout={(e: LayoutChangeEvent) => {
        width.current = Math.max(1, e.nativeEvent.layout.width);
      }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Durée de la séance"
      accessibilityValue={{ min: MIN, max: MAX, now: value, text: `${value} minutes` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.min(MAX, Math.max(MIN, value + (e.nativeEvent.actionName === 'increment' ? SNAP : -SNAP))))}
      {...pan.panHandlers}
    >
      <View pointerEvents="none" style={[sliderStyles.track, { backgroundColor: colors.border }]}>
        <View style={[sliderStyles.fill, { width: `${ratio * 100}%`, backgroundColor: colors.accent }]} />
        {marks.map((m) => (
          <View key={m} style={[sliderStyles.mark, { left: `${((m - MIN) / (MAX - MIN)) * 100}%`, backgroundColor: m <= value ? colors.onAccent : colors.textMuted }]} />
        ))}
      </View>
      <View pointerEvents="none" style={[sliderStyles.thumb, { left: `${ratio * 100}%`, backgroundColor: colors.accent, borderColor: colors.bgCard }]} />
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  wrap: { height: 48, justifyContent: 'center', marginTop: 20, marginHorizontal: 8 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 5 },
  mark: { position: 'absolute', width: 3, height: 3, borderRadius: 2, marginLeft: -1 },
  thumb: { position: 'absolute', width: 30, height: 30, borderRadius: 15, marginLeft: -15, borderWidth: 4, top: 9 },
});

function Browse({
  ctx,
  todayIso,
  calisGoal,
  setCalisGoal,
  openKey,
  setOpenKey,
  launch,
  styles,
  colors,
}: {
  ctx: ReturnType<typeof defaultLibContext>;
  todayIso: string;
  calisGoal: CalisthenicsGoalFocus;
  setCalisGoal: (g: CalisthenicsGoalFocus) => void;
  openKey: string | null;
  setOpenKey: (k: string | null) => void;
  launch: (w: PlannedWorkout, when: 'now' | 'tomorrow') => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ReturnType<typeof useThemeColors>['colors'];
}) {
  const [sport, setSport] = useState<LibSport>('run');
  const entries = useMemo(() => buildLibrary(ctx, todayIso, { calisGoal }).filter((e) => e.sport === sport), [ctx, todayIso, calisGoal, sport]);
  const groups = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const e of entries) map.set(e.group, [...(map.get(e.group) ?? []), e]);
    return [...map.entries()];
  }, [entries]);

  return (
    <>
      <Text style={styles.title}>Toutes les séances</Text>
      <View style={styles.pills}>
        {LIB_SPORTS.map((s) => (
          <Chip key={s.id} label={s.label} selected={sport === s.id} onPress={() => { setSport(s.id); setOpenKey(null); }} />
        ))}
      </View>
      {sport === 'calisthenics' ? (
        <View style={styles.pills}>
          {(Object.keys(CALIS_GOAL_LIB_LABEL) as CalisthenicsGoalFocus[]).map((g) => (
            <Chip key={g} label={CALIS_GOAL_LIB_LABEL[g]} selected={calisGoal === g} onPress={() => setCalisGoal(g)} />
          ))}
        </View>
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
                    <Pressable onPress={() => launch(e.workout, 'tomorrow')} accessibilityRole="button" style={styles.tomorrow}>
                      <Text style={[styles.browseText, { color: colors.accent }]}>Le faire demain</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>['colors']) {
  return StyleSheet.create({
    scroll: { padding: spacing.md, paddingBottom: 80 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32, marginBottom: spacing.sm },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    backText: { fontSize: 14, fontWeight: '700', color: colors.text },
    dots: { flexDirection: 'row', gap: 6 },
    dot: { width: 22, height: 5, borderRadius: 3, backgroundColor: colors.border },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    sub: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 4 },
    sportTile: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1 },
    sportIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    sportLabel: { fontSize: 17, fontWeight: '800', color: colors.text },
    sportSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    browseLink: { alignSelf: 'center', paddingVertical: spacing.md },
    browseText: { fontSize: 14, fontWeight: '700' },
    timeBox: { alignItems: 'center', marginTop: spacing.lg },
    bigNumber: { fontSize: 76, fontWeight: '800', color: colors.text, lineHeight: 84 },
    bigUnit: { fontSize: 14, fontWeight: '700', color: colors.textMuted, marginTop: -4 },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 8, marginTop: 2 },
    sliderLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
    areaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    areaTile: { paddingVertical: 18, paddingHorizontal: 6, borderRadius: radii.lg, borderWidth: 1.5, alignItems: 'center' },
    areaText: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
    label: { fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4, marginTop: spacing.md, marginBottom: 4 },
    pills: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
    group: { fontSize: 12, fontWeight: '800', color: colors.accent, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
    card: { padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, marginBottom: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    step: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    stepTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
    stepDetail: { fontSize: 12, color: colors.textMuted, maxWidth: '55%' },
    tomorrow: { alignSelf: 'center', paddingVertical: 8 },
  });
}

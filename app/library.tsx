import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../src/ui/Text';
import { AppScrollView } from '../src/ui/scrolling';
import { Chip, PrimaryButton, Screen, SecondaryButton } from '../src/ui/primitives';
import { AppTextInput } from '../src/ui/AppTextInput';
import { PressableScale } from '../src/ui/motion/softMotion';
import { useApp } from '../src/store/AppContext';
import { useThemeColors } from '../src/theme/ThemeContext';
import { radii, spacing } from '../src/theme/tokens';
import type { OnboardingAnswers, PlannedWorkout } from '../src/types/domain';
import { swimPaceSecPer100FromOnboarding } from '../src/engines/athleteProfile';
import {
  checkQuickCoherence,
  INTENSITIES,
  missingQuickData,
  QUICK_KINDS,
  quickKind,
  sliderMax,
  type Intensity,
  type QuickKindId,
  type QuickKindOption,
  type QuickSport,
} from '../src/engines/quickSession';
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

type Step = 'sport' | 'kind' | 'time' | 'intensity' | 'complete' | 'browse';

const MIN = 10;
const SNAP = 5;

const SPORT_TILES: Array<{ id: LibSport; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'run', label: 'Course', sub: 'Footing, sortie longue, fractionné…', icon: 'walk' },
  { id: 'bike', label: 'Vélo', sub: 'Endurance, sortie longue, intervalles', icon: 'bicycle' },
  { id: 'swim', label: 'Natation', sub: 'Endurance ou séries', icon: 'water' },
  { id: 'strength', label: 'Musculation', sub: 'Salle ou maison', icon: 'barbell' },
  { id: 'calisthenics', label: 'Callisthénie', sub: 'Poids du corps', icon: 'body' },
];

/** Zones à travailler : trois choix larges, puis des cibles précises. */
const AREA_TILES: Array<{ id: CalisScope; label: string }> = [
  { id: 'full', label: 'Tout le corps' },
  { id: 'upper', label: 'Haut du corps' },
  { id: 'lower', label: 'Bas du corps' },
];

const INTENSITY_COLORS = ['#22C55E', '#F59E0B', '#EF4444'];

/** « 4:30 », « 4'30 », « 4m30 » ou « 270 » → secondes (null si illisible). */
function parseClock(v: string): number | null {
  const t = v.trim().replace(',', '.');
  const m = /^(\d{1,2})\s*(?::|'|m|min)\s*(\d{1,2})?/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2] ?? 0);
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Séance rapide GUIDÉE : 1) le sport → 2) le type de séance (ou la zone du corps) → 3) la durée (avec contrôle de
 * cohérence) → 4) l'intensité (tranquille / modérée / intense) → (5) compléter tes données, facultatif.
 * Les allures sont celles de l'algorithme du plan (chrono / VMA / volume) ; la bibliothèque complète reste à part.
 */
export default function LibraryScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const params = useLocalSearchParams<{ sport?: string }>();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const ob = state.profile.onboarding;
  const level = ob?.level ?? 'intermediaire';
  const buildCtx = (o: typeof ob) => {
    const zones = resolveAthletePaceZones(o, state.activities) ?? resolvePaceZones({ level: o?.level ?? 'intermediaire' });
    return defaultLibContext(o?.level ?? 'intermediaire', zones, {
      ftp: o?.ftpWatts && o.ftpWatts >= 80 ? o.ftpWatts : undefined,
      swimPace100: swimPaceSecPer100FromOnboarding(o) ?? undefined,
      equipment: normalizeStrengthEquipment(o?.strengthEquipment),
    });
  };
  const ctx = useMemo(() => buildCtx(ob), [ob, state.activities]); // eslint-disable-line react-hooks/exhaustive-deps

  const presetSport = LIB_SPORTS.some((s) => s.id === params.sport) ? (params.sport as LibSport) : null;
  const [step, setStep] = useState<Step>(presetSport ? 'kind' : 'sport');
  const [sport, setSport] = useState<LibSport>(presetSport ?? 'run');
  const [kind, setKind] = useState<QuickKindId>('easy');
  const [minutes, setMinutes] = useState(30);
  const [intensity, setIntensity] = useState<Intensity>('moderate');
  const [scope, setScope] = useState<CalisScope>('full');
  const [targets, setTargets] = useState<CalisTarget[]>([]);
  const [calisGoal, setCalisGoal] = useState<CalisthenicsGoalFocus>('hypertrophy');
  const [openKey, setOpenKey] = useState<string | null>(null);
  // Champs de l'étape « Compléter »
  const [vmaText, setVmaText] = useState('');
  const [raceText, setRaceText] = useState('');
  const [ftpText, setFtpText] = useState('');
  const [swimText, setSwimText] = useState('');

  const todayIso = toLocalDateIso(new Date());
  const isBody = sport === 'strength' || sport === 'calisthenics';
  const quickSport: QuickSport | null = isBody ? null : (sport as QuickSport);
  const sportLabel = SPORT_TILES.find((s) => s.id === sport)?.label ?? '';
  const kindOption = quickSport ? quickKind(quickSport, kind) : null;
  const coherence = quickSport ? checkQuickCoherence(quickSport, kind, minutes, level) : ({ ok: true } as const);
  const missing = quickSport ? missingQuickData(quickSport, ob) : [];
  const maxMinutes = sliderMax(sport);

  const chooseSport = (id: LibSport) => {
    setSport(id);
    setTargets([]);
    if (id === 'run' || id === 'bike' || id === 'swim') {
      const first = QUICK_KINDS[id][0]!;
      setKind(first.id);
      setMinutes(first.ideal);
    } else {
      setMinutes(30);
    }
    setStep('kind');
  };

  const chooseKind = (k: QuickKindOption) => {
    setKind(k.id);
    setMinutes(k.ideal);
    setStep('time');
  };

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

  const startQuick = (over?: typeof ctx) => {
    const strengthFocus: StrengthBodyFocus = scope === 'upper' ? 'upper' : scope === 'lower' ? 'lower' : 'full';
    launch(
      buildQuickSession(over ?? ctx, todayIso, {
        sport,
        minutes,
        kind,
        intensity,
        scope: targets.length === 0 ? scope : undefined,
        targets,
        strengthFocus,
        strengthTargets: sport === 'strength' ? (targets as StrengthTarget[]) : undefined,
      }),
      'now',
    );
  };

  /** Enregistre ce que l'utilisateur vient de compléter (comme dans ses données sportives) puis lance. */
  const saveAndStart = () => {
    const patch: Partial<OnboardingAnswers> = {};
    if (missing.includes('run-pace')) {
      const vma = Number(vmaText.replace(',', '.'));
      const race = parseClock(raceText);
      if (vma >= 8 && vma <= 28) patch.vmaKmh = Math.round(vma * 10) / 10;
      else if (race && race >= 600 && race <= 4 * 3600) patch.raceTimesSec = { ...(ob?.raceTimesSec ?? {}), '5k': race };
    }
    if (missing.includes('bike-ftp')) {
      const ftp = Math.round(Number(ftpText.replace(',', '.')));
      if (ftp >= 80 && ftp <= 500) patch.ftpWatts = ftp;
    }
    if (missing.includes('swim-pace')) {
      const sec = parseClock(swimText);
      if (sec && sec >= 45 && sec <= 300) patch.sportTimesSec = { ...(ob?.sportTimesSec ?? {}), swim: { ...(ob?.sportTimesSec?.swim ?? {}), '100m': sec } };
    }
    if (Object.keys(patch).length > 0) {
      dispatch({ type: 'UPDATE_ONBOARDING', patch });
      startQuick(buildCtx({ ...(ob ?? { level, goal: '10k', trainingDays: [1, 3, 5], longRunDay: 6 }), ...patch }));
    } else {
      startQuick();
    }
  };

  const afterIntensity = () => {
    if (missing.length > 0) setStep('complete');
    else startQuick();
  };

  const back = () => {
    if (step === 'complete') setStep('intensity');
    else if (step === 'intensity') setStep('time');
    else if (step === 'time') setStep('kind');
    else if (step === 'kind') setStep('sport');
    else if (step === 'browse') setStep('sport');
    else router.back();
  };

  const stepIndex = step === 'sport' ? 1 : step === 'kind' ? 2 : step === 'time' ? 3 : step === 'intensity' || step === 'complete' ? 4 : 0;
  const totalSteps = 4;

  const areaSummary =
    targets.length > 0
      ? targets.map((t) => CALIS_TARGET_OPTIONS.find((o) => o.id === t)!.label.toLowerCase()).join(' + ')
      : AREA_TILES.find((a) => a.id === scope)!.label.toLowerCase();
  const intensityIdx = INTENSITIES.findIndex((i) => i.id === intensity);
  const intensityInfo = INTENSITIES[intensityIdx]!;
  const kindLabel = isBody ? areaSummary : (kindOption?.label.toLowerCase() ?? '');

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
                  onPress={() => chooseSport(s.id)}
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

        {/* ——— 2 · Le type de séance (course / vélo / natation) ou la zone du corps (muscu / callisthénie) ——— */}
        {step === 'kind' && quickSport ? (
          <>
            <Text style={styles.title}>Quel type de séance ?</Text>
            <Text style={styles.sub}>{sportLabel} · c’est toi qui décides.</Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              {QUICK_KINDS[quickSport].map((k) => (
                <PressableScale
                  key={k.id}
                  variant="nav"
                  accessibilityLabel={k.label}
                  onPress={() => chooseKind(k)}
                  contentStyle={[styles.sportTile, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sportLabel}>{k.label}</Text>
                    <Text style={styles.sportSub}>{k.sub}</Text>
                  </View>
                  <Text style={styles.kindDuration}>{k.min}–{k.max} min</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </PressableScale>
              ))}
            </View>
          </>
        ) : null}

        {step === 'kind' && isBody ? (
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
            <View style={{ marginTop: spacing.lg }}>
              <PrimaryButton label="Continuer" onPress={() => setStep('time')} />
            </View>
          </>
        ) : null}

        {/* ——— 3 · Le temps ——— */}
        {step === 'time' ? (
          <>
            <Text style={styles.title}>Combien de temps ?</Text>
            <Text style={styles.sub}>{sportLabel} · {kindLabel} · fais glisser pour régler la durée.</Text>
            <View style={styles.timeBox}>
              <Text style={styles.bigNumber}>{minutes}</Text>
              <Text style={styles.bigUnit}>minutes</Text>
            </View>
            <RangeSlider
              value={minutes}
              onChange={setMinutes}
              min={MIN}
              max={maxMinutes}
              snap={SNAP}
              marks={Array.from({ length: Math.floor(maxMinutes / 30) }, (_, i) => (i + 1) * 30).filter((m) => m < maxMinutes)}
              label="Durée de la séance"
              valueText={`${minutes} minutes`}
              colors={colors}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>Express</Text>
              <Text style={styles.sliderLabel}>{maxMinutes >= 120 ? 'Longue sortie' : 'Séance complète'}</Text>
            </View>
            {!coherence.ok ? (
              <View style={[styles.warn, { borderColor: '#F59E0B', backgroundColor: colors.bgCard }]}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Ionicons name="alert-circle" size={20} color={'#F59E0B'} />
                  <Text style={styles.warnText}>{coherence.message}</Text>
                </View>
                <SecondaryButton label={`Passer à ${coherence.suggestedMinutes} min`} onPress={() => setMinutes(coherence.suggestedMinutes)} />
                {coherence.alt && quickSport ? (
                  <SecondaryButton
                    label={`Choisir « ${coherence.alt.label} » à la place`}
                    onPress={() => {
                      const alt = quickKind(quickSport, coherence.alt!.id);
                      setKind(alt.id);
                    }}
                  />
                ) : null}
              </View>
            ) : null}
            <View style={{ marginTop: spacing.lg }}>
              <PrimaryButton label={coherence.ok ? 'Continuer' : `Garder ${minutes} min`} onPress={() => setStep('intensity')} />
            </View>
          </>
        ) : null}

        {/* ——— 4 · L'intensité ——— */}
        {step === 'intensity' ? (
          <>
            <Text style={styles.title}>Quelle intensité ?</Text>
            <Text style={styles.sub}>{sportLabel} · {kindLabel} · {minutes} min</Text>
            <View style={styles.timeBox}>
              <Text style={[styles.intensityName, { color: INTENSITY_COLORS[intensityIdx] }]}>{intensityInfo.label}</Text>
              <Text style={styles.intensityHint}>{intensityInfo.hint}</Text>
            </View>
            <RangeSlider
              value={intensityIdx}
              onChange={(v) => setIntensity(INTENSITIES[v]!.id)}
              min={0}
              max={2}
              snap={1}
              marks={[]}
              label="Intensité de la séance"
              valueText={intensityInfo.label}
              colors={colors}
              segmentColors={INTENSITY_COLORS}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>Plus tranquille</Text>
              <Text style={styles.sliderLabel}>Dans le rouge</Text>
            </View>
            <View style={{ marginTop: spacing.lg }}>
              <PrimaryButton label={`Lancer · ${minutes} min · ${intensityInfo.label.toLowerCase()}`} onPress={afterIntensity} />
            </View>
          </>
        ) : null}

        {/* ——— 5 · Compléter (facultatif) ——— */}
        {step === 'complete' ? (
          <>
            <Text style={styles.title}>Pour une séance à ta mesure</Text>
            <Text style={styles.sub}>
              Il nous manque une info pour caler tes allures au plus juste. C’est facultatif : sans elle, on estime d’après ton niveau (souvent plus lent que ta réalité).
            </Text>
            {missing.includes('run-pace') ? (
              <>
                <Text style={styles.label}>Ta VMA (km/h)</Text>
                <AppTextInput value={vmaText} onChangeText={setVmaText} keyboardType="decimal-pad" placeholder="ex. 16,5" placeholderTextColor={colors.textMuted} style={styles.input} />
                <Text style={styles.label}>… ou ton chrono récent sur 5 km</Text>
                <AppTextInput value={raceText} onChangeText={setRaceText} placeholder="ex. 24:30" placeholderTextColor={colors.textMuted} style={styles.input} />
              </>
            ) : null}
            {missing.includes('bike-ftp') ? (
              <>
                <Text style={styles.label}>Ta FTP (watts)</Text>
                <AppTextInput value={ftpText} onChangeText={setFtpText} keyboardType="number-pad" placeholder="ex. 220" placeholderTextColor={colors.textMuted} style={styles.input} />
              </>
            ) : null}
            {missing.includes('swim-pace') ? (
              <>
                <Text style={styles.label}>Ton allure au 100 m</Text>
                <AppTextInput value={swimText} onChangeText={setSwimText} placeholder="ex. 1:45" placeholderTextColor={colors.textMuted} style={styles.input} />
              </>
            ) : null}
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <PrimaryButton label="Enregistrer et lancer" onPress={saveAndStart} />
              <SecondaryButton label="Lancer sans compléter" onPress={() => startQuick()} />
            </View>
          </>
        ) : null}

        {/* ——— Bibliothèque complète ——— */}
        {step === 'browse' ? <Browse ctx={ctx} todayIso={todayIso} calisGoal={calisGoal} setCalisGoal={setCalisGoal} openKey={openKey} setOpenKey={setOpenKey} launch={launch} styles={styles} colors={colors} /> : null}
      </AppScrollView>
    </Screen>
  );
}

/**
 * Curseur générique : on fait glisser (ou on touche) la piste ; les valeurs s'aimantent sur `snap`.
 * `segmentColors` : piste en tronçons colorés (intensité), sans remplissage.
 */
function RangeSlider({
  value,
  onChange,
  min,
  max,
  snap,
  marks,
  label,
  valueText,
  colors,
  segmentColors,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  snap: number;
  marks: number[];
  label: string;
  valueText: string;
  colors: ReturnType<typeof useThemeColors>['colors'];
  segmentColors?: string[];
}) {
  const width = useRef(1);
  const cb = useRef(onChange);
  cb.current = onChange;
  const startX = useRef(0);
  const range = useRef({ min, max, snap });
  range.current = { min, max, snap };

  const fromX = (x: number) => {
    const r = range.current;
    const ratio = Math.min(1, Math.max(0, x / width.current));
    const raw = r.min + ratio * (r.max - r.min);
    return Math.min(r.max, Math.max(r.min, Math.round(raw / r.snap) * r.snap));
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

  const ratio = (value - min) / Math.max(1, max - min);
  const thumbColor = segmentColors ? segmentColors[Math.min(segmentColors.length - 1, Math.round(ratio * (segmentColors.length - 1)))]! : colors.accent;

  return (
    <View
      style={sliderStyles.wrap}
      onLayout={(e: LayoutChangeEvent) => {
        width.current = Math.max(1, e.nativeEvent.layout.width);
      }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: valueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.min(max, Math.max(min, value + (e.nativeEvent.actionName === 'increment' ? snap : -snap))))}
      {...pan.panHandlers}
    >
      <View pointerEvents="none" style={[sliderStyles.track, { backgroundColor: colors.border }]}>
        {segmentColors ? (
          <View style={{ flexDirection: 'row', flex: 1 }}>
            {segmentColors.map((c) => (
              <View key={c} style={{ flex: 1, backgroundColor: c, opacity: 0.85 }} />
            ))}
          </View>
        ) : (
          <View style={[sliderStyles.fill, { width: `${ratio * 100}%`, backgroundColor: colors.accent }]} />
        )}
        {marks.map((m) => (
          <View key={m} style={[sliderStyles.mark, { left: `${((m - min) / (max - min)) * 100}%`, backgroundColor: m <= value ? colors.onAccent : colors.textMuted }]} />
        ))}
      </View>
      <View pointerEvents="none" style={[sliderStyles.thumb, { left: `${ratio * 100}%`, backgroundColor: thumbColor, borderColor: colors.bgCard }]} />
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
    kindDuration: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
    intensityName: { fontSize: 40, fontWeight: '800' },
    intensityHint: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
    warn: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1.5, gap: spacing.sm },
    warnText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
    input: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 12, fontSize: 18, fontWeight: '700', color: colors.text },
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

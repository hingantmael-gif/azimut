import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTextInput } from '../../src/ui/AppTextInput';
import { useRouter } from 'expo-router';
import {
  POPULAR_SPORT_CATEGORIES,
  findProgramById,
  getProgramsForSport,
  type ProgramSportCategory,
  type TrainingProgramTemplate,
} from '../../src/constants/programs';
import { levelFromWeeklyKm } from '../../src/engines/athleteProfile';
import { predictRaceTimesSecMap } from '../../src/engines/core';
import { getDurationGuide, weekPresetOptions } from '../../src/data/programDurationDb';
import type {
  AthleticLevel,
  GoalType,
  OnboardingAnswers,
} from '../../src/types/domain';
import { useApp } from '../../src/store/AppContext';
import type { ProgramBuildInput } from '../../src/engines/programBuilder';
import {
  buildFullOnboardingSteps,
  campusStepTitle,
  defaultTrainingDaysForSessions,
  EXPERIENCE_COPY,
  EXPERIENCE_OPTIONS,
  IDENTITY_COPY,
  INJURY_COPY,
  isCampusStep,
  RHYTHM_COPY,
  RHYTHM_OPTIONS,
  RUN_GOAL_OPTIONS,
  resolveTerrainFromIntent,
  TERRAIN_COPY,
  TERRAIN_OPTIONS,
  TRAINING_TYPE_COPY,
  TRAINING_TYPE_OPTIONS,
  VOLUME_COPY,
  VOLUME_OPTIONS,
  type RunIntent,
  type TerrainFocus,
  type TrainingTerrain,
  type RunningExperience,
  type UsualVolumeBand,
  type WeeklySessionsTarget,
} from '../../src/ui/onboarding/campusIntakeConfig';
import {
  IntakeChoiceCard,
  IntakeField,
  IntakeGenderRow,
  IntakeHeader,
  PlanPreviewCard,
  ReferenceRaceCard,
  RelayHero,
} from '../../src/ui/onboarding/IntakeUI';
import {
  DEFAULT_GOAL,
  GOAL_OPTIONS,
  stepCanContinue,
  stepTitle,
  type OnboardingStepId,
} from '../../src/ui/onboarding/sportOnboardingConfig';
import {
  StrengthEquipmentPicker,
  StrengthGoalPicker,
} from '../../src/ui/onboarding/StrengthSetupFields';
import { Body, Chip, Muted, PrimaryButton, Screen } from '../../src/ui/primitives';
import { AppScrollView } from '../../src/ui/scrolling';
import { DISCIPLINE_META } from '../../src/constants/disciplines';
import type { StrengthEquipment, StrengthGoalFocus } from '../../src/engines/strengthProgramming';
import { BRAND } from '../../src/constants/brand';
import { formatDateSlashInput } from '../../src/utils/dateInput';
import { clearSession } from '../../src/storage/sessionPersistence';
import { markOnboardingCompleted } from '../../src/storage/onboardingPersistence';
import {
  TRIAL_ACCOUNT_EMAIL,
  TRIAL_EMAIL_INPUT,
} from '../../src/utils/demoAuth';
import { colors, radii, spacing } from '../../src/theme/tokens';

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function sportColor(cat: ProgramSportCategory): string {
  const map: Record<ProgramSportCategory, string> = {
    run: DISCIPLINE_META.run.color,
    bike: DISCIPLINE_META.bike.color,
    swim: DISCIPLINE_META.swim.color,
    triathlon: DISCIPLINE_META.brick.color,
    strength: DISCIPLINE_META.strength.color,
    ironman: DISCIPLINE_META.brick.color,
    other: colors.textMuted,
  };
  return map[cat] ?? colors.textMuted;
}

function parseDurationToSec(raw: string): number | undefined {
  const parts = raw.trim().split(':').map((p) => Number(p));
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
    return parts[0]! * 60 + parts[1]!;
  }
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  }
  return undefined;
}

/** Onboarding premier compte — textes Campus + branchements route/trail, look Azimut. */
export default function OnboardingScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();

  const [stepIndex, setStepIndex] = useState(0);
  const [sport, setSport] = useState<ProgramSportCategory | null>(null);
  const [level, setLevel] = useState<AthleticLevel>('intermediaire');
  const [goal, setGoal] = useState<GoalType>('10k');
  const [trainingDays, setTrainingDays] = useState<number[]>([1, 3, 5]);
  const [longRunDay, setLongRunDay] = useState(6);
  const [weeklyKmInput, setWeeklyKmInput] = useState('');
  const [weeklySwimInput, setWeeklySwimInput] = useState('');
  const [vma, setVma] = useState('');
  const [fcMax, setFcMax] = useState('');
  const [includePpg, setIncludePpg] = useState<boolean | null>(null);
  const [strengthEquipment, setStrengthEquipment] = useState<StrengthEquipment[]>([]);
  const [strengthGoal, setStrengthGoal] = useState<StrengthGoalFocus | null>(null);

  const [gender, setGender] = useState<'femme' | 'homme' | null>(
    state.profile.bodyGender === 'femme' || state.profile.bodyGender === 'homme'
      ? state.profile.bodyGender
      : null,
  );
  const [firstName, setFirstName] = useState(state.profile.firstName ?? '');
  const [lastName, setLastName] = useState(state.profile.lastName ?? '');
  const [birthDate, setBirthDate] = useState(state.profile.birthDate ?? '');
  const [city, setCity] = useState(state.profile.city ?? '');

  const [runIntent, setRunIntent] = useState<RunIntent | null>(null);
  const [terrain, setTerrain] = useState<TerrainFocus | null>(null);
  const [trainingTerrain, setTrainingTerrain] = useState<TrainingTerrain | null>(null);
  const [experience, setExperience] = useState<RunningExperience | null>(null);
  const [injured, setInjured] = useState<boolean | null>(null);
  const [volumeBand, setVolumeBand] = useState<UsualVolumeBand | null>(null);
  const [sessionsTarget, setSessionsTarget] = useState<WeeklySessionsTarget | null>(null);
  const [refDuration, setRefDuration] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [programWeeks, setProgramWeeks] = useState<number | null>(null);

  const toggleEquipment = (id: StrengthEquipment) => {
    setStrengthEquipment((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const weeklyKm =
    Number(weeklyKmInput.replace(',', '.')) ||
    (volumeBand ? VOLUME_OPTIONS.find((v) => v.id === volumeBand)?.weeklyKm ?? 0 : 0);
  const weeklySwimM = Number(weeklySwimInput.replace(',', '.')) || 0;
  const derivedLevel = weeklyKm > 0 ? levelFromWeeklyKm(weeklyKm) : level;

  const programCatalog = useMemo(
    () => getProgramsForSport(sport ?? 'run'),
    [sport],
  );

  const selectedProgram: TrainingProgramTemplate | undefined = selectedProgramId
    ? findProgramById(selectedProgramId)
    : undefined;

  const weekOptions = useMemo(() => {
    if (!selectedProgram) return [];
    const guide = getDurationGuide({
      goal: selectedProgram.goal,
      distanceKm: selectedProgram.distanceKm,
    });
    return weekPresetOptions(guide, derivedLevel);
  }, [selectedProgram, derivedLevel]);

  const selectProgram = (tpl: TrainingProgramTemplate) => {
    setSelectedProgramId(tpl.id);
    setGoal(tpl.goal);
    const guide = getDurationGuide({ goal: tpl.goal, distanceKm: tpl.distanceKm });
    const presets = weekPresetOptions(guide, derivedLevel);
    const defaultW = presets.includes(tpl.weeks)
      ? tpl.weeks
      : presets[Math.floor(presets.length / 2)] ?? tpl.weeks;
    setProgramWeeks(defaultW);
  };

  const steps = useMemo(
    () =>
      buildFullOnboardingSteps({
        sport,
        includePpg: includePpg === true,
        runIntent,
        terrain,
        hasUsualVolume: Boolean(volumeBand),
      }),
    [sport, includePpg, runIntent, terrain, volumeBand],
  );

  const currentStepId = steps[stepIndex] ?? 'relay';
  const stepCount = steps.length;

  useEffect(() => {
    if (stepIndex >= steps.length) {
      setStepIndex(Math.max(0, steps.length - 1));
    }
  }, [steps.length, stepIndex]);

  const toggleDay = (d: number) => {
    setTrainingDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );
  };

  const selectSport = (cat: ProgramSportCategory) => {
    setSport(cat);
    setGoal(DEFAULT_GOAL[cat]);
    if (cat === 'strength') {
      setIncludePpg(false);
    } else if (cat === 'triathlon' || cat === 'ironman') {
      setIncludePpg(null);
    }
    if (cat !== 'run') {
      setRunIntent(null);
      setTerrain(null);
    }
    setStepIndex((i) => i + 1);
  };

  const selectRunIntent = (intent: RunIntent) => {
    const opt = RUN_GOAL_OPTIONS.find((o) => o.id === intent);
    setRunIntent(intent);
    if (opt) setGoal(opt.goal);
    if (intent === 'race_road') setTerrain('route');
    if (intent === 'race_trail') setTerrain('trail');
    if (intent === 'return_injury') setInjured(true);
    if (intent === 'start') setLevel('debutant');
  };

  const goNext = () => {
    if (currentStepId === 'identity') {
      dispatch({
        type: 'UPDATE_PROFILE',
        patch: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          birthDate: birthDate.trim() || undefined,
          city: city.trim() || undefined,
          gender: gender ?? undefined,
          bodyGender: gender ?? undefined,
        },
      });
    }

    if (currentStepId === 'weekly_rhythm' && sessionsTarget) {
      setTrainingDays(defaultTrainingDaysForSessions(sessionsTarget));
    }

    if (currentStepId === 'experience' && experience) {
      const exp = EXPERIENCE_OPTIONS.find((e) => e.id === experience);
      if (exp) setLevel(exp.level);
    }

    if (stepIndex < stepCount - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }
    finish();
  };

  const goBack = () => {
    if (stepIndex <= 0) return;
    const prevId = steps[stepIndex - 1];
    if (prevId === 'sport') setSport(null);
    if (prevId === 'run_goal') setRunIntent(null);
    setStepIndex(stepIndex - 1);
  };

  const finish = () => {
    const resolvedSport = sport ?? 'run';
    const resolvedTerrain = resolveTerrainFromIntent(runIntent, terrain);
    const refSec = refDuration ? parseDurationToSec(refDuration) : undefined;
      const raceTimesSec =
      refSec && refSec > 0
        ? predictRaceTimesSecMap(5, refSec, { weeklyKmAvg: weeklyKm > 0 ? weeklyKm : undefined })
        : undefined;
    const resolvedGoal =
      selectedProgram?.goal ??
      (resolvedSport === 'strength'
        ? 'forme'
        : resolvedTerrain === 'trail'
          ? 'trail'
          : goal);
    const answers: OnboardingAnswers = {
      level:
        weeklyKm > 0 && resolvedSport !== 'strength'
          ? derivedLevel
          : experience
            ? EXPERIENCE_OPTIONS.find((e) => e.id === experience)?.level ?? level
            : level,
      goal: resolvedGoal,
      trainingDays,
      longRunDay,
      sportCategory: resolvedSport,
      weeklyKmAvg:
        weeklyKm > 0 && resolvedSport !== 'swim' ? weeklyKm : undefined,
      weeklySwimMeters: weeklySwimM > 0 ? Math.round(weeklySwimM) : undefined,
      targetDistanceKm: selectedProgram?.distanceKm,
      vmaKmh: vma ? Number(vma) : undefined,
      fcMax: fcMax ? Number(fcMax) : undefined,
      recentDistanceKm: refSec ? 5 : undefined,
      recentTimeSec: refSec,
      raceTimesSec,
      includePpg:
        resolvedSport === 'triathlon' || resolvedSport === 'ironman'
          ? includePpg === true
          : undefined,
      strengthEquipment:
        strengthEquipment.length > 0 ? strengthEquipment : undefined,
      strengthGoal: strengthGoal ?? undefined,
      runIntent: runIntent ?? undefined,
      terrainFocus: resolvedTerrain ?? undefined,
      trainingTerrain: trainingTerrain ?? undefined,
      runningExperience: experience ?? undefined,
      injuredLast12Months: injured ?? undefined,
      usualVolumeBand: volumeBand ?? undefined,
      weeklySessionsTarget: sessionsTarget ?? undefined,
    };
    dispatch({ type: 'COMPLETE_ONBOARDING', answers });
    void markOnboardingCompleted(
      state.profile.email,
      state.profile.username,
      state.profile.id,
      ...(state.profile.email === TRIAL_ACCOUNT_EMAIL ||
      state.profile.username === '1' ||
      state.profile.email === '1'
        ? [TRIAL_ACCOUNT_EMAIL, TRIAL_EMAIL_INPUT]
        : []),
    );

    if (selectedProgramId && programWeeks && programWeeks > 0) {
      const input: ProgramBuildInput = {
        templateId: selectedProgramId,
        customWeeks: programWeeks,
        trainingDays,
        longRunDay,
        weeklyKmAvg:
          weeklyKm > 0
            ? weeklyKm
            : resolvedSport === 'swim'
              ? Math.max(1, weeklySwimM / 1000)
              : 20,
        recentTimeSec: refSec,
        recentDistanceKm: refSec ? 5 : undefined,
        includePpg: answers.includePpg,
        strengthEquipment: answers.strengthEquipment as ProgramBuildInput['strengthEquipment'],
        strengthGoal: answers.strengthGoal,
        isPremium: true,
      };
      dispatch({ type: 'CREATE_PROGRAM', input });
      router.replace('/(tabs)/calendar');
      return;
    }

    router.replace('/(tabs)');
  };

  const campusCanContinue = (): boolean => {
    switch (currentStepId) {
      case 'relay':
        return true;
      case 'identity':
        return Boolean(gender && firstName.trim() && lastName.trim());
      case 'run_goal':
        return Boolean(runIntent);
      case 'terrain':
        return Boolean(terrain);
      case 'training_type':
        return Boolean(trainingTerrain);
      case 'experience':
        return Boolean(experience);
      case 'injury':
        return injured !== null;
      case 'usual_volume':
        return Boolean(volumeBand);
      case 'weekly_rhythm':
        return Boolean(sessionsTarget);
      case 'reference_time':
        return Boolean(parseDurationToSec(refDuration));
      case 'plan_preview':
        return true;
      case 'program_pick':
        return Boolean(selectedProgramId);
      case 'program_weeks':
        return Boolean(programWeeks && programWeeks > 0);
      default:
        return true;
    }
  };

  const canContinue = isCampusStep(currentStepId)
    ? campusCanContinue()
    : currentStepId === 'sport'
      ? Boolean(sport)
      : stepCanContinue(currentStepId as OnboardingStepId, {
          sport,
          trainingDays,
          weeklyKm,
          weeklySwimM,
          strengthEquipment,
          strengthGoal,
          includePpg,
        });

  const headerTitle = isCampusStep(currentStepId)
    ? campusStepTitle(currentStepId, firstName || state.profile.firstName)
    : currentStepId === 'sport'
      ? 'Quel sport pratiques-tu ?'
      : stepTitle(currentStepId as OnboardingStepId, sport);

  const headerSubtitle =
    currentStepId === 'identity'
      ? IDENTITY_COPY.subtitle
      : currentStepId === 'terrain'
        ? TERRAIN_COPY.prompt
        : currentStepId === 'training_type'
          ? TRAINING_TYPE_COPY.prompt
          : currentStepId === 'experience'
            ? EXPERIENCE_COPY.subtitle
            : currentStepId === 'injury'
              ? INJURY_COPY.subtitle
              : currentStepId === 'usual_volume'
                ? VOLUME_COPY.subtitle
                : currentStepId === 'weekly_rhythm'
                  ? RHYTHM_COPY.subtitle
                  : currentStepId === 'sport'
                    ? 'Choisis ta discipline — les questions suivantes s’adaptent automatiquement.'
                    : undefined;

  if (currentStepId === 'relay') {
    return (
      <View style={{ flex: 1, backgroundColor: BRAND.ink }}>
        <RelayHero
          onStart={() => setStepIndex(1)}
          onBack={() => {
            // Sinon l’index redirige immédiatement vers l’onboarding (session encore active).
            void clearSession();
            dispatch({ type: 'LOGOUT' });
            router.replace('/(auth)/welcome');
          }}
        />
      </View>
    );
  }

  const continueLabel =
    currentStepId === 'weekly_rhythm'
      ? RHYTHM_COPY.cta
      : currentStepId === 'program_weeks'
        ? 'Générer mon programme'
        : stepIndex < stepCount - 1
          ? 'Continuer'
          : 'Terminer';

  return (
    <Screen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 56 }}>
        <IntakeHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          showBack={stepIndex > 0}
          onBack={goBack}
          progressIndex={stepIndex}
          progressTotal={stepCount}
        />

        {currentStepId === 'identity' && (
          <>
            <IntakeGenderRow value={gender} onChange={setGender} />
            <IntakeField
              label={IDENTITY_COPY.firstName}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Eva"
              autoCapitalize="words"
            />
            <IntakeField
              label={IDENTITY_COPY.lastName}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Vite"
              autoCapitalize="words"
            />
            <IntakeField
              label={IDENTITY_COPY.birthDate}
              value={birthDate}
              onChangeText={(t) => setBirthDate(formatDateSlashInput(t))}
              placeholder="01/01/1990"
              keyboardType="number-pad"
              maxLength={10}
            />
            <IntakeField
              label={IDENTITY_COPY.city}
              value={city}
              onChangeText={setCity}
              placeholder="Sprint-sur-Mer, France"
            />
          </>
        )}

        {currentStepId === 'sport' && (
          <>
            {POPULAR_SPORT_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                style={styles.sportCard}
                onPress={() => selectSport(cat.id)}
              >
                <View style={[styles.sportDot, { backgroundColor: sportColor(cat.id) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sportLabel}>{cat.label}</Text>
                  <Text style={styles.sportDesc}>{cat.desc}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
            <Pressable style={styles.sportCard} onPress={() => selectSport('other')}>
              <View style={[styles.sportDot, { backgroundColor: colors.textMuted }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sportLabel}>Duathlon sprint</Text>
                <Text style={styles.sportDesc}>Course · vélo · course — biathlon inclus</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </>
        )}

        {currentStepId === 'run_goal' &&
          RUN_GOAL_OPTIONS.map((opt) => (
            <IntakeChoiceCard
              key={opt.id}
              title={opt.title}
              subtitle={opt.subtitle}
              image={opt.image}
              selected={runIntent === opt.id}
              onPress={() => selectRunIntent(opt.id)}
            />
          ))}

        {currentStepId === 'terrain' &&
          TERRAIN_OPTIONS.map((opt) => (
            <IntakeChoiceCard
              key={opt.id}
              title={opt.label}
              image={opt.image}
              selected={terrain === opt.id}
              onPress={() => setTerrain(opt.id)}
            />
          ))}

        {currentStepId === 'training_type' &&
          TRAINING_TYPE_OPTIONS.map((opt) => (
            <IntakeChoiceCard
              key={opt.id}
              title={opt.title}
              subtitle={opt.subtitle}
              selected={trainingTerrain === opt.id}
              onPress={() => setTrainingTerrain(opt.id)}
            />
          ))}

        {currentStepId === 'experience' &&
          EXPERIENCE_OPTIONS.map((opt) => (
            <IntakeChoiceCard
              key={opt.id}
              title={opt.label}
              selected={experience === opt.id}
              onPress={() => setExperience(opt.id)}
            />
          ))}

        {currentStepId === 'injury' && (
          <>
            <IntakeChoiceCard
              title={INJURY_COPY.no}
              selected={injured === false}
              onPress={() => setInjured(false)}
            />
            <IntakeChoiceCard
              title={INJURY_COPY.yes}
              selected={injured === true}
              onPress={() => setInjured(true)}
            />
          </>
        )}

        {currentStepId === 'usual_volume' &&
          VOLUME_OPTIONS.map((opt) => (
            <IntakeChoiceCard
              key={opt.id}
              title={opt.label}
              selected={volumeBand === opt.id}
              onPress={() => {
                setVolumeBand(opt.id);
                setWeeklyKmInput(String(opt.weeklyKm));
              }}
            />
          ))}

        {currentStepId === 'weekly_rhythm' &&
          RHYTHM_OPTIONS.map((opt) => (
            <IntakeChoiceCard
              key={opt.sessions}
              title={`${opt.sessions} séances`}
              subtitle={opt.kmLabel}
              badge={opt.recommended ? 'RECOMMANDÉ' : undefined}
              selected={sessionsTarget === opt.sessions}
              onPress={() => setSessionsTarget(opt.sessions)}
            />
          ))}

        {currentStepId === 'reference_time' && (
          <ReferenceRaceCard duration={refDuration} onDurationChange={setRefDuration} />
        )}

        {currentStepId === 'plan_preview' && (
          <PlanPreviewCard onContinue={goNext} />
        )}

        {currentStepId === 'program_pick' && (
          <>
            <Muted style={{ marginTop: 4, marginBottom: spacing.sm, lineHeight: 20 }}>
              Choisis le type de programme adapté à ton objectif. L’application générera ton
              plan personnalisé à partir de tes réponses.
            </Muted>
            {programCatalog.map((tpl) => (
              <IntakeChoiceCard
                key={tpl.id}
                title={tpl.title}
                subtitle={tpl.subtitle}
                selected={selectedProgramId === tpl.id}
                onPress={() => selectProgram(tpl)}
              />
            ))}
          </>
        )}

        {currentStepId === 'program_weeks' && (
          <>
            <Muted style={{ marginTop: 4, marginBottom: spacing.sm, lineHeight: 20 }}>
              {selectedProgram
                ? `${selectedProgram.title} — durée recommandée selon ton niveau.`
                : 'Indique la durée de ton programme.'}
            </Muted>
            <View style={styles.row}>
              {weekOptions.map((w) => (
                <Chip
                  key={w}
                  label={`${w} sem.`}
                  selected={programWeeks === w}
                  onPress={() => setProgramWeeks(w)}
                />
              ))}
            </View>
          </>
        )}

        {currentStepId === 'level' && (
          <View style={styles.row}>
            {(
              [
                ['debutant', 'Débutant'],
                ['intermediaire', 'Intermédiaire'],
                ['confirme', 'Confirmé / Athlète'],
              ] as const
            ).map(([v, l]) => (
              <Chip key={v} label={l} selected={level === v} onPress={() => setLevel(v)} />
            ))}
          </View>
        )}

        {currentStepId === 'goal' && sport && (
          <View style={styles.row}>
            {GOAL_OPTIONS[sport].map(({ value, label }) => (
              <Chip
                key={value}
                label={label}
                selected={goal === value}
                onPress={() => setGoal(value)}
              />
            ))}
          </View>
        )}

        {currentStepId === 'equipment' && (
          <StrengthEquipmentPicker
            selected={strengthEquipment}
            onToggle={toggleEquipment}
          />
        )}

        {currentStepId === 'strength_goal' && (
          <StrengthGoalPicker selected={strengthGoal} onSelect={setStrengthGoal} />
        )}

        {currentStepId === 'days' && (
          <>
            <Body style={{ marginTop: 12 }}>Jours où vous pouvez vous entraîner</Body>
            <Muted style={{ marginTop: 4, lineHeight: 18 }}>
              L&apos;algorithme intègre le repos nécessaire entre les séances.
            </Muted>
            <View style={styles.row}>
              {DAYS.map((label, i) => (
                <Chip
                  key={label}
                  label={label}
                  selected={trainingDays.includes(i)}
                  onPress={() => toggleDay(i)}
                />
              ))}
            </View>
          </>
        )}

        {currentStepId === 'days_with_long' && (
          <>
            <Body style={{ marginTop: 12 }}>Jours où vous pouvez vous entraîner</Body>
            <Muted style={{ marginTop: 4, lineHeight: 18 }}>
              Ce ne sont pas forcément des jours de séance : l&apos;algorithme intègre le repos
              nécessaire.
            </Muted>
            <View style={styles.row}>
              {DAYS.map((label, i) => (
                <Chip
                  key={label}
                  label={label}
                  selected={trainingDays.includes(i)}
                  onPress={() => toggleDay(i)}
                />
              ))}
            </View>
            <Body style={{ marginTop: 12 }}>Jour sortie longue préféré</Body>
            <View style={styles.row}>
              {DAYS.map((label, i) => (
                <Chip
                  key={`long-${label}`}
                  label={label}
                  selected={longRunDay === i}
                  onPress={() => setLongRunDay(i)}
                />
              ))}
            </View>
          </>
        )}

        {currentStepId === 'weekly_volume' && (
          <>
            <Body style={{ marginTop: 8 }}>
              {sport === 'bike'
                ? 'Combien de kilomètres parcourez-vous à vélo en moyenne chaque semaine ?'
                : sport === 'triathlon' || sport === 'ironman'
                  ? 'Combien de kilomètres parcourez-vous à pied (course) chaque semaine ?'
                  : 'Combien de kilomètres parcourez-vous en moyenne chaque semaine ?'}
            </Body>
            <AppTextInput
              style={styles.input}
              placeholder="Ex. 25 (km par semaine)"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={weeklyKmInput}
              onChangeText={setWeeklyKmInput}
            />
          </>
        )}

        {currentStepId === 'swim_volume' && (
          <>
            <Body style={{ marginTop: 8 }}>
              Combien de mètres nagez-vous en moyenne chaque semaine ?
            </Body>
            <AppTextInput
              style={styles.input}
              placeholder="Ex. 3000 (mètres par semaine)"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={weeklySwimInput}
              onChangeText={setWeeklySwimInput}
            />
          </>
        )}

        {currentStepId === 'ppg' && (
          <>
            <Body style={{ marginTop: 8 }}>
              Souhaitez-vous inclure des séances de renforcement musculaire dans vos
              programmes (musculation légère, 1 à 2 fois par semaine) ?
            </Body>
            <View style={styles.row}>
              <Chip
                label="Oui, renforcement"
                selected={includePpg === true}
                onPress={() => setIncludePpg(true)}
              />
              <Chip
                label="Non, endurance seule"
                selected={includePpg === false}
                onPress={() => setIncludePpg(false)}
              />
            </View>
          </>
        )}

        {currentStepId === 'references' && (
          <>
            <Muted style={{ marginTop: 8 }}>
              {sport === 'swim'
                ? 'CSS, VMA ou FC max — sinon un test guidé sera planifié la première semaine.'
                : 'Sinon, un test guidé (ex. Demi-Cooper) sera planifié la première semaine.'}
            </Muted>
            <AppTextInput
              style={styles.input}
              placeholder={sport === 'swim' ? 'CSS (sec/100 m) — optionnel' : 'VMA (km/h)'}
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={vma}
              onChangeText={setVma}
            />
            <AppTextInput
              style={styles.input}
              placeholder="FC Max (bpm)"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={fcMax}
              onChangeText={setFcMax}
            />
          </>
        )}

        {currentStepId === 'devices' && null}
        {currentStepId !== 'sport' &&
        currentStepId !== 'relay' &&
        currentStepId !== 'plan_preview' ? (
          <View style={{ marginTop: spacing.lg }}>
            <PrimaryButton
              label={continueLabel}
              disabled={!canContinue}
              onPress={goNext}
            />
          </View>
        ) : null}
      </AppScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  input: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    color: colors.text,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  sportDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  sportLabel: { color: colors.text, fontWeight: '600', fontSize: 16 },
  sportDesc: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  chevron: { color: colors.textMuted, fontSize: 22, marginLeft: 8 },
});

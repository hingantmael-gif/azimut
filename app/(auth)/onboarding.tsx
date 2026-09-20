import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { AppTextInput } from '../../src/ui/AppTextInput';
import { useRouter } from 'expo-router';
import {
  POPULAR_SPORT_CATEGORIES,
  findProgramById,
  getProgramsForRunIntent,
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
  AVAILABILITY_COPY,
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
  IntakeCityField,
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
  getProgramsForSportGoal,
  sportGoalTitle,
  stepCanContinue,
  stepTitle,
  type OnboardingStepId,
} from '../../src/ui/onboarding/sportOnboardingConfig';
import { StrengthEquipmentPicker } from '../../src/ui/onboarding/StrengthSetupFields';
import { Body, Chip, Muted, PrimaryButton, Screen } from '../../src/ui/primitives';
import { WizardDayGrid } from '../../src/ui/program/WizardPickers';
import { AppScrollView } from '../../src/ui/scrolling';
import { sortProgramsNatural } from '../../src/constants/programs';
import { SportArt, artKindFor } from '../../src/ui/program/SportArt';
import { PressableScale } from '../../src/ui/motion/softMotion';
import {
  COVER_CROP_CENTER,
  SPORT_HERO_IMAGES,
  imageForProgram,
  programImageFocus,
} from '../../src/constants/sportVisuals';
import type {
  StrengthEquipment,
  StrengthGoalFocus,
} from '../../src/engines/strengthProgramming';
import { BRAND } from '../../src/constants/brand';
import { formatDateSlashInput } from '../../src/utils/dateInput';
import { clearSession } from '../../src/storage/sessionPersistence';
import { markOnboardingCompleted } from '../../src/storage/onboardingPersistence';
import {
  TRIAL_ACCOUNT_EMAIL,
  TRIAL_EMAIL_INPUT,
} from '../../src/utils/demoAuth';
import { colors, radii, spacing } from '../../src/theme/tokens';

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

/** Onboarding premier compte — textes Campus + branchements route/trail, look Mova. */
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
  const [strengthGoal, setStrengthGoal] = useState<string | null>(null);
  const [sportGoalId, setSportGoalId] = useState<string | null>(null);

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
  const [openWatchAfter, setOpenWatchAfter] = useState(false);
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

  // Même liste, même ordre que « Nouveau programme » (distance croissante) + option sur mesure.
  const programCatalog = useMemo(() => sortProgramsNatural(getProgramsForSport(sport ?? 'run')), [sport]);
  const [customDistance, setCustomDistance] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const customKm = (() => {
    const n = Number(customDistance.replace(',', '.'));
    return n > 0 ? n : undefined;
  })();
  const isCustomProgram = selectedProgramId === 'custom';

  const selectedProgram: TrainingProgramTemplate | undefined =
    selectedProgramId && selectedProgramId !== 'custom' ? findProgramById(selectedProgramId) : undefined;

  const weekOptions = useMemo(() => {
    if (isCustomProgram && customKm) {
      return weekPresetOptions(
        getDurationGuide({ distanceKm: customKm, sportFamily: sport === 'bike' ? 'bike' : undefined }),
        derivedLevel,
      );
    }
    if (!selectedProgram) return [];
    const guide = getDurationGuide({
      goal: selectedProgram.goal,
      distanceKm: selectedProgram.distanceKm,
    });
    return weekPresetOptions(guide, derivedLevel);
  }, [selectedProgram, derivedLevel, isCustomProgram, customKm, sport]);

  const pickCustomProgram = () => {
    setSelectedProgramId('custom');
    setProgramWeeks(null);
  };
  const confirmCustomProgram = () => {
    if (!customKm) return;
    const presets = weekPresetOptions(
      getDurationGuide({ distanceKm: customKm, sportFamily: sport === 'bike' ? 'bike' : undefined }),
      derivedLevel,
    );
    setProgramWeeks(presets[Math.floor(presets.length / 2)] ?? 8);
    setStepIndex((i) => i + 1);
  };

  const selectProgram = (tpl: TrainingProgramTemplate) => {
    setSelectedProgramId(tpl.id);
    setGoal(tpl.goal);
    const guide = getDurationGuide({ goal: tpl.goal, distanceKm: tpl.distanceKm });
    const presets = weekPresetOptions(guide, derivedLevel);
    const defaultW = presets.includes(tpl.weeks)
      ? tpl.weeks
      : presets[Math.floor(presets.length / 2)] ?? tpl.weeks;
    setProgramWeeks(defaultW);
    // Un tap suffit — avance vers la durée
    setStepIndex((i) => i + 1);
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

  // La séance longue tombe TOUJOURS sur un jour d'entraînement retenu (sinon le plan n'aurait pas de séance longue).
  useEffect(() => {
    if (trainingDays.length > 0 && !trainingDays.includes(longRunDay)) {
      setLongRunDay(trainingDays[trainingDays.length - 1]!);
    }
  }, [trainingDays, longRunDay]);

  const toggleDay = (d: number) => {
    setTrainingDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );
  };

  const selectSport = (cat: ProgramSportCategory) => {
    setSport(cat);
    setGoal(DEFAULT_GOAL[cat]);
    setSportGoalId(null);
    setStrengthGoal(null);
    setSelectedProgramId(null);
    setProgramWeeks(null);
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

  const selectSportGoal = (goalId: string) => {
    if (!sport) return;
    const opt = GOAL_OPTIONS[sport].find((o) => o.id === goalId);
    if (!opt) return;
    setSportGoalId(goalId);
    setGoal(opt.goal);
    setSelectedProgramId(null);
    setProgramWeeks(null);
    if (sport === 'strength') {
      const focus =
        goalId === 'hypertrophy' || goalId === 'power' || goalId === 'fitness'
          ? (goalId as StrengthGoalFocus)
          : 'fitness';
      setStrengthGoal(focus);
    }
    if (sport === 'other') {
      // Callisthénie : on réutilise strengthGoal pour stocker endurance|hypertrophy|strength|skill
      setStrengthGoal(goalId);
    }
    setStepIndex((i) => i + 1);
  };

  const selectRunIntent = (intent: RunIntent) => {
    const opt = RUN_GOAL_OPTIONS.find((o) => o.id === intent);
    setRunIntent(intent);
    setSelectedProgramId(null);
    setProgramWeeks(null);
    if (opt) setGoal(opt.goal);
    if (intent === 'race_road') setTerrain('route');
    if (intent === 'race_trail') setTerrain('trail');
    if (intent === 'return_injury') setInjured(true);
    if (intent === 'start') setLevel('debutant');
    // Comme le sport : un tap avance — pas besoin de chercher « Continuer » hors écran
    setStepIndex((i) => i + 1);
  };

  const pickAndAdvance = (apply: () => void) => {
    apply();
    setStepIndex((i) => i + 1);
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

    if (currentStepId === 'availability' && sessionsTarget && trainingDays.length === 0) {
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
    if (prevId === 'goal' || prevId === 'strength_goal') {
      setSportGoalId(null);
      if (prevId === 'strength_goal') setStrengthGoal(null);
    }
    setStepIndex((i) => i - 1);
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
      targetDistanceKm: selectedProgram?.distanceKm ?? (isCustomProgram ? customKm : undefined),
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
      const defaultKm =
        runIntent === 'start' || runIntent === 'return_injury'
          ? 10
          : 20;
      const input: ProgramBuildInput = {
        templateId: selectedProgramId,
        customDistanceKm: isCustomProgram ? customKm : undefined,
        customTitle: isCustomProgram ? customTitle.trim() || undefined : undefined,
        customWeeks: programWeeks,
        trainingDays,
        longRunDay,
        weeklyKmAvg:
          weeklyKm > 0
            ? weeklyKm
            : resolvedSport === 'swim'
              ? Math.max(1, weeklySwimM / 1000)
              : defaultKm,
        recentTimeSec: refSec,
        recentDistanceKm: refSec ? 5 : undefined,
        includePpg: answers.includePpg,
        strengthEquipment: answers.strengthEquipment as ProgramBuildInput['strengthEquipment'],
        strengthGoal: answers.strengthGoal,
        runIntent: runIntent ?? undefined,
        isPremium: true,
      };
      dispatch({ type: 'CREATE_PROGRAM', input });
      router.replace('/(tabs)/calendar');
      if (openWatchAfter) setTimeout(() => router.push('/settings/watch'), 300);
      return;
    }

    router.replace('/(tabs)');
    if (openWatchAfter) setTimeout(() => router.push('/settings/watch'), 300);
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
      case 'availability': {
        const needsVolume = runIntent !== 'start';
        return (
          Boolean(sessionsTarget) &&
          trainingDays.length > 0 &&
          (!needsVolume || Boolean(volumeBand))
        );
      }
      case 'reference_time':
        return Boolean(parseDurationToSec(refDuration));
      case 'plan_preview':
        return true;
      case 'program_pick':
        return isCustomProgram ? Boolean(customKm) : Boolean(selectedProgramId);
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
          sportGoalId,
        });

  const displayName = firstName || state.profile.firstName || '';
  const headerTitle = isCampusStep(currentStepId)
    ? campusStepTitle(currentStepId, displayName)
    : currentStepId === 'sport'
      ? 'Quel sport pratiques-tu ?'
      : currentStepId === 'goal' || currentStepId === 'strength_goal'
        ? sportGoalTitle(displayName)
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
                  : currentStepId === 'availability'
                    ? AVAILABILITY_COPY.subtitle
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
    currentStepId === 'weekly_rhythm' || currentStepId === 'availability'
      ? currentStepId === 'availability'
        ? AVAILABILITY_COPY.cta
        : RHYTHM_COPY.cta
      : currentStepId === 'program_weeks'
        ? 'Voir mon programme'
        : stepIndex < stepCount - 1
          ? 'Continuer'
          : 'Terminer';

  /** Étapes où un tap sur une carte avance déjà — pas de CTA hors écran. */
  const choiceAutoAdvances =
    currentStepId === 'run_goal' ||
    currentStepId === 'goal' ||
    currentStepId === 'strength_goal' ||
    currentStepId === 'terrain' ||
    currentStepId === 'training_type' ||
    currentStepId === 'experience' ||
    currentStepId === 'injury' ||
    currentStepId === 'usual_volume' ||
    currentStepId === 'weekly_rhythm' ||
    (currentStepId === 'program_pick' && !isCustomProgram) ||
    currentStepId === 'program_weeks';

  const showContinueFooter =
    currentStepId !== 'sport' &&
    currentStepId !== 'relay' &&
    currentStepId !== 'plan_preview' &&
    currentStepId !== 'devices' &&
    !choiceAutoAdvances;

  return (
    <Screen style={styles.screenFlex}>
      <AppScrollView
        style={styles.scrollFlex}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: showContinueFooter ? 24 : 56 }}
      >
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
            <IntakeCityField
              label={IDENTITY_COPY.city}
              value={city}
              onChangeText={setCity}
              placeholder="Ta ville — dès la 1re lettre"
            />
          </>
        )}

        {currentStepId === 'sport' && (
          <>
            {POPULAR_SPORT_CATEGORIES.map((cat) => (
              <PressableScale
                key={cat.id}
                variant="nav"
                onPress={() => selectSport(cat.id)}
                accessibilityRole="button"
                accessibilityLabel={cat.label}
              >
                <SportArt
                  kind={artKindFor(cat.id)}
                  seed={cat.id.length}
                  minHeight={120}
                  borderRadius={radii.lg}
                  animated={false}
                  style={styles.sportHero}
                  contentStyle={styles.sportHeroContent}
                >
                  <View style={styles.sportHeroText}>
                    <Text style={styles.sportHeroLabel}>{cat.label}</Text>
                    <Text style={styles.sportHeroDesc}>{cat.desc}</Text>
                  </View>
                  <Text style={styles.sportHeroChevron}>›</Text>
                </SportArt>
              </PressableScale>
            ))}
          </>
        )}

        {currentStepId === 'run_goal' &&
          RUN_GOAL_OPTIONS.map((opt) => (
            <IntakeChoiceCard
              key={opt.id}
              title={opt.title}
              subtitle={opt.subtitle}
              selected={runIntent === opt.id}
              onPress={() => selectRunIntent(opt.id)}
            />
          ))}

        {currentStepId === 'terrain' &&
          TERRAIN_OPTIONS.map((opt) => (
            <IntakeChoiceCard
              key={opt.id}
              title={opt.label}
              selected={terrain === opt.id}
              onPress={() => pickAndAdvance(() => setTerrain(opt.id))}
            />
          ))}

        {currentStepId === 'training_type' &&
          TRAINING_TYPE_OPTIONS.map((opt) => (
            <IntakeChoiceCard
              key={opt.id}
              title={opt.title}
              subtitle={opt.subtitle}
              selected={trainingTerrain === opt.id}
              onPress={() => pickAndAdvance(() => setTrainingTerrain(opt.id))}
            />
          ))}

        {currentStepId === 'experience' &&
          EXPERIENCE_OPTIONS.map((opt) => (
            <IntakeChoiceCard
              key={opt.id}
              title={opt.label}
              selected={experience === opt.id}
              onPress={() =>
                pickAndAdvance(() => {
                  setExperience(opt.id);
                  setLevel(opt.level);
                })
              }
            />
          ))}

        {currentStepId === 'injury' && (
          <>
            <IntakeChoiceCard
              title={INJURY_COPY.no}
              selected={injured === false}
              onPress={() => pickAndAdvance(() => setInjured(false))}
            />
            <IntakeChoiceCard
              title={INJURY_COPY.yes}
              selected={injured === true}
              onPress={() => pickAndAdvance(() => setInjured(true))}
            />
          </>
        )}

        {currentStepId === 'usual_volume' &&
          VOLUME_OPTIONS.map((opt) => (
            <IntakeChoiceCard
              key={opt.id}
              title={opt.label}
              selected={volumeBand === opt.id}
              onPress={() =>
                pickAndAdvance(() => {
                  setVolumeBand(opt.id);
                  setWeeklyKmInput(String(opt.weeklyKm));
                })
              }
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
              onPress={() =>
                pickAndAdvance(() => {
                  setSessionsTarget(opt.sessions);
                  setTrainingDays(defaultTrainingDaysForSessions(opt.sessions));
                })
              }
            />
          ))}

        {currentStepId === 'availability' && (
          <>
            <Body style={{ marginTop: 4, fontWeight: '700' }}>{AVAILABILITY_COPY.days}</Body>
            <Muted style={{ marginTop: 4, lineHeight: 18 }}>
              Ce ne sont pas forcément des jours de séance : l&apos;algo intègre le repos.
            </Muted>
            <View style={styles.daysRow}>
              <WizardDayGrid
                selected={trainingDays}
                onToggle={toggleDay}
                accent={colors.accent}
                tone="surface"
              />
            </View>
            <Body style={{ marginTop: spacing.md, fontWeight: '700' }}>
              {AVAILABILITY_COPY.longRun}
            </Body>
            <View style={styles.daysRow}>
              <WizardDayGrid
                selected={[longRunDay]}
                enabledDays={trainingDays}
                mode="long"
                accent="#F59E0B"
                tone="surface"
                onToggle={(dow) => setLongRunDay(dow)}
              />
            </View>

            {runIntent !== 'start' ? (
              <>
                <Body style={{ marginTop: spacing.md, fontWeight: '700' }}>
                  {AVAILABILITY_COPY.volume}
                </Body>
                <View style={styles.row}>
                  {VOLUME_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.id}
                      label={opt.label}
                      selected={volumeBand === opt.id}
                      onPress={() => {
                        setVolumeBand(opt.id);
                        setWeeklyKmInput(String(opt.weeklyKm));
                      }}
                    />
                  ))}
                </View>
              </>
            ) : null}

            <Body style={{ marginTop: spacing.md, fontWeight: '700' }}>
              {AVAILABILITY_COPY.rhythm}
            </Body>
            <View style={styles.row}>
              {RHYTHM_OPTIONS.map((opt) => (
                <Chip
                  key={opt.sessions}
                  label={`${opt.sessions}×`}
                  selected={sessionsTarget === opt.sessions}
                  onPress={() => {
                    setSessionsTarget(opt.sessions);
                    if (trainingDays.length === 0) {
                      setTrainingDays(defaultTrainingDaysForSessions(opt.sessions));
                    }
                  }}
                />
              ))}
            </View>
            {sessionsTarget ? (
              <Muted style={{ marginTop: 6, lineHeight: 18 }}>
                {RHYTHM_OPTIONS.find((o) => o.sessions === sessionsTarget)?.kmLabel}
              </Muted>
            ) : null}
          </>
        )}

        {currentStepId === 'reference_time' && (
          <ReferenceRaceCard duration={refDuration} onDurationChange={setRefDuration} />
        )}

        {currentStepId === 'plan_preview' && (
          <PlanPreviewCard
            onContinue={goNext}
            recentTimeSec={parseDurationToSec(refDuration)}
            recentDistanceKm={5}
            weeklyKmAvg={weeklyKm > 0 ? weeklyKm : undefined}
            level={derivedLevel}
          />
        )}

        {currentStepId === 'program_pick' && (
          <>
            <Muted style={{ marginTop: 4, marginBottom: spacing.sm, lineHeight: 20 }}>
              {runIntent === 'start'
                ? 'Programmes courts pour démarrer en douceur — les premières séances seront allégées.'
                : runIntent === 'return_injury'
                  ? 'Programmes adaptés à une reprise — les premières séances seront plus tranquilles.'
                  : runIntent === 'progress'
                    ? 'Choisis ton programme : les séances démarrent au rythme classique.'
                    : 'Choisis le type de programme adapté à ton objectif. L’application générera ton plan personnalisé à partir de tes réponses.'}
            </Muted>
            {programCatalog.map((tpl) => (
              <PressableScale
                key={tpl.id}
                variant="nav"
                onPress={() => selectProgram(tpl)}
                accessibilityRole="button"
                accessibilityLabel={tpl.title}
              >
                <SportArt
                  kind={artKindFor(tpl.sportCategory)}
                  seed={tpl.id.length * 7 + tpl.id.charCodeAt(tpl.id.length - 1)}
                  minHeight={112}
                  borderRadius={radii.lg}
                  animated={false}
                  style={styles.sportHero}
                  contentStyle={styles.sportHeroContent}
                >
                  <View style={styles.sportHeroText}>
                    <Text style={styles.sportHeroLabel}>{tpl.title}</Text>
                    <Text style={styles.sportHeroDesc}>{tpl.subtitle}</Text>
                  </View>
                  <Text style={styles.sportHeroChevron}>›</Text>
                </SportArt>
              </PressableScale>
            ))}
            {sport !== 'strength' && sport !== 'other' ? (
              <>
                <PressableScale variant="nav" onPress={pickCustomProgram} accessibilityRole="button" accessibilityLabel="Distance sur mesure">
                  <View style={[styles.customCard, isCustomProgram && styles.customCardOn]}>
                    <Text style={styles.sportHeroLabel}>Distance sur mesure</Text>
                    <Text style={styles.sportHeroDesc}>Ton propre objectif, à la distance que tu veux</Text>
                  </View>
                </PressableScale>
                {isCustomProgram ? (
                  <>
                    <AppTextInput
                      style={styles.input}
                      placeholder={sport === 'swim' ? 'Distance en km (ex. 0,8)' : 'Distance en km (ex. 17)'}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      value={customDistance}
                      onChangeText={setCustomDistance}
                    />
                    <AppTextInput
                      style={styles.input}
                      placeholder="Nom de l’objectif (facultatif)"
                      placeholderTextColor={colors.textMuted}
                      value={customTitle}
                      onChangeText={setCustomTitle}
                    />
                  </>
                ) : null}
              </>
            ) : null}
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
                  onPress={() => {
                    setProgramWeeks(w);
                    // Un tap valide la durée et enchaîne (ou termine)
                    setTimeout(() => {
                      if (stepIndex < stepCount - 1) {
                        setStepIndex((i) => i + 1);
                      } else {
                        finish();
                      }
                    }, 80);
                  }}
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

        {currentStepId === 'goal' &&
          sport &&
          GOAL_OPTIONS[sport].map((opt) => (
            <IntakeChoiceCard
              key={opt.id}
              title={opt.title}
              subtitle={opt.subtitle}
              selected={sportGoalId === opt.id}
              onPress={() => selectSportGoal(opt.id)}
            />
          ))}

        {currentStepId === 'equipment' && (
          <StrengthEquipmentPicker
            selected={strengthEquipment}
            onToggle={toggleEquipment}
          />
        )}

        {currentStepId === 'strength_goal' &&
          GOAL_OPTIONS.strength.map((opt) => (
            <IntakeChoiceCard
              key={opt.id}
              title={opt.title}
              subtitle={opt.subtitle}
              selected={sportGoalId === opt.id}
              onPress={() => selectSportGoal(opt.id)}
            />
          ))}

        {currentStepId === 'days' && (
          <>
            <Body style={{ marginTop: 12 }}>Jours où vous pouvez vous entraîner</Body>
            <Muted style={{ marginTop: 4, lineHeight: 18 }}>
              L&apos;algorithme intègre le repos nécessaire entre les séances.
            </Muted>
            <View style={styles.daysRow}>
              <WizardDayGrid
                selected={trainingDays}
                onToggle={toggleDay}
                accent={colors.accent}
                tone="surface"
              />
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
            <View style={styles.daysRow}>
              <WizardDayGrid
                selected={trainingDays}
                onToggle={toggleDay}
                accent={colors.accent}
                tone="surface"
              />
            </View>
            <Body style={{ marginTop: 12 }}>Jour sortie longue préféré</Body>
            <View style={styles.daysRow}>
              <WizardDayGrid
                selected={[longRunDay]}
                enabledDays={trainingDays}
                mode="long"
                accent="#F59E0B"
                tone="surface"
                onToggle={(dow) => setLongRunDay(dow)}
              />
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

        {currentStepId === 'devices' && (
          <View style={{ marginTop: spacing.md, gap: spacing.md }}>
            <Muted>
              Connecte une montre plus tard dans Paramètres — ce n’est pas
              obligatoire pour démarrer.
            </Muted>
            <PrimaryButton
              label="Connecter ma montre maintenant"
              onPress={() => {
                setOpenWatchAfter(true);
                goNext();
              }}
            />
            <PressableScale variant="subtle" onPress={goNext}>
              <Text
                style={{
                  textAlign: 'center',
                  color: colors.accent,
                  fontWeight: '700',
                  fontSize: 15,
                }}
              >
                Plus tard, dans les paramètres
              </Text>
            </PressableScale>
          </View>
        )}
      </AppScrollView>
      {showContinueFooter ? (
        <View style={styles.continueFooter}>
          <PrimaryButton
            label={continueLabel}
            disabled={!canContinue}
            onPress={currentStepId === 'program_pick' && isCustomProgram ? confirmCustomProgram : goNext}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenFlex: {
    flex: 1,
    paddingBottom: 0,
  },
  scrollFlex: {
    flex: 1,
  },
  // Transparent : plus de pavé blanc rectangulaire derrière le bouton.
  continueFooter: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: 'transparent',
  },
  customCard: {
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.35)',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  customCardOn: { borderColor: '#5EF2B4', borderStyle: 'solid', backgroundColor: 'rgba(94,242,180,0.10)' },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginTop: spacing.md,
    gap: 4,
    width: '100%',
  },
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
  sportHero: {
    marginBottom: spacing.sm,
  },
  sportHeroContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
  },
  sportHeroText: { flex: 1, zIndex: 1 },
  sportHeroLabel: {
    fontWeight: '800',
    fontSize: 18,
    color: '#fff',
    letterSpacing: 0.2,
  },
  sportHeroDesc: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    marginTop: 4,
  },
  sportHeroChevron: {
    fontSize: 26,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '300',
    zIndex: 1,
    marginLeft: spacing.sm,
    marginBottom: 2,
  },
});

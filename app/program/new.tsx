import { useMemo, useState, useEffect, useRef } from 'react';
import {
  ImageBackground,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../../src/ui/Text';
import { AppTextInput } from '../../src/ui/AppTextInput';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import {
  POPULAR_SPORT_CATEGORIES,
  findProgramById,
  searchPrograms,
  type ProgramSportCategory,
  type TrainingProgramTemplate,
} from '../../src/constants/programs';
import {
  SPORT_HERO_IMAGES,
  SWIM_VENUE_IMAGES,
  CUSTOM_DISTANCE_IMAGES,
  customDistanceExample,
  customDistancePlaceholder,
  imageForProgram,
  programImageFocus,
  coverCropImageStyle,
  COVER_CROP_CENTER,
} from '../../src/constants/sportVisuals';
import { NewProgramLabel } from '../../src/ui/brand/NewProgramLabel';
import { ProgramCreatedCelebration } from '../../src/ui/program/ProgramCreatedCelebration';
import { SportCover } from '../../src/ui/program/SportCover';
import { WeekSilhouettePreview } from '../../src/ui/program/WeekSilhouettePreview';
import {
  WizardDayGrid,
  WizardHint,
  WizardOptionCard,
  WizardPill,
  WizardSectionLabel,
  WizardStepShell,
} from '../../src/ui/program/WizardPickers';
import {
  coachPanelForDaySpacing,
  coachPanelForSessionCount,
  recommendedSessionsForSport,
  sessionBandLabel,
  sessionGuideForSport,
  sessionLoadBand,
  suggestSpacedTrainingDays,
  wizardHintTone,
  type WeeklySessionCount,
} from '../../src/engines/sessionFrequencyCoach';
import { PressableScale, StaggerIn } from '../../src/ui/motion/softMotion';
import {
  formatRaceDateFr,
  getDurationGuide,
  recommendedWeeks,
  resolveTrainingWeeks,
  weekPresetOptions,
  weeksUntilDate,
} from '../../src/data/programDurationDb';
import {
  resolveAthleteLevel,
  parseRaceTime,
  formatRaceTime,
  lookupStoredChronoSec,
  resolveVma,
  vmaFromRaceTime,
} from '../../src/engines/athleteProfile';
import { resolvePaceZones } from '../../src/engines/paceZones';
import { formatPace } from '../../src/engines/core';
import { formatDateSlashInput, formatRaceClockInput } from '../../src/utils/dateInput';
import { appAlert, appConfirm } from '../../src/utils/appAlert';
import {
  buildProgramPlan,
  effectiveProgramStartIso,
  PROGRAM_GEN_SAME_DAY_CUTOFF_HOUR,
  type ProgramBuildInput,
} from '../../src/engines/programBuilder';
import { previewSleepStartupRamp } from '../../src/engines/sleepProgramRamp';
import { analyzeCombinedPlanOverload } from '../../src/engines/planOverload';
import {
  spreadIncomingSessions,
  type ProgramScheduleMode,
} from '../../src/engines/concurrentSessions';
import {
  createProgramInstanceId,
  resolveActivePrograms,
  tagPlanForProgram,
} from '../../src/engines/multiProgramPlan';
import {
  usageCountForTemplate,
  usageCountCaption,
  usageCountLabel,
} from '../../src/engines/programPopularity';
import {
  STRENGTH_BODY_FOCUS_OPTIONS,
  STRENGTH_EQUIPMENT_OPTIONS,
  STRENGTH_GOAL_OPTIONS,
  normalizeStrengthEquipment,
  type StrengthBodyFocus,
  type StrengthEquipment,
  type StrengthGoalFocus,
} from '../../src/engines/strengthProgramming';
import { CALISTHENICS_GOAL_OPTIONS } from '../../src/engines/calisthenicsProgramming';
import {
  StrengthBodyFocusPicker,
  StrengthEquipmentPicker,
  StrengthGoalPicker,
} from '../../src/ui/onboarding/StrengthSetupFields';
import {
  Body,
  Muted,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Title,
} from '../../src/ui/primitives';
import { DISCIPLINE_META } from '../../src/constants/disciplines';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { AppScrollView } from '../../src/ui/scrolling';

const VISIBLE_PROGRAM_COUNT = 5;

/** 0 sport · (+1 venue natation) · objectif · séances · dispos · renforcement · temps · durée */
const BASE_STEP_COUNT = 7;

function formatDistanceQuestion(km?: number, sport?: ProgramSportCategory | null): string {
  if (km == null || !(km > 0)) {
    return sport === 'swim' ? '100 mètres' : '5 kilomètres';
  }
  if (sport === 'swim') {
    const meters = Math.round(km * 1000);
    if (meters < 1000) return `${meters} mètres`;
    const rounded = Math.round(km * 10) / 10;
    return `${String(rounded).replace('.', ',')} kilomètres`;
  }
  if (Math.abs(km - 5) < 0.3) return '5 kilomètres';
  if (Math.abs(km - 10) < 0.3) return '10 kilomètres';
  if (Math.abs(km - 21.1) < 0.4) return 'Semi (21,1 km)';
  if (Math.abs(km - 42.195) < 0.5) return 'marathon (42,2 km)';
  const rounded = Math.round(km * 10) / 10;
  return `${String(rounded).replace('.', ',')} kilomètres`;
}

function swimTimePlaceholder(km?: number): string {
  const m = km != null ? Math.round(km * 1000) : 100;
  if (m <= 50) return 'ex. 0038 → 00:38';
  if (m <= 100) return 'ex. 0125 → 01:25';
  if (m <= 200) return 'ex. 0305 → 03:05';
  if (m <= 400) return 'ex. 0630 → 06:30';
  if (m <= 800) return 'ex. 1400 → 14:00';
  if (m <= 1500) return 'ex. 2800 → 28:00';
  return 'ex. 4500 → 45:00';
}

type DurationMode = 'weeks' | 'date';
type StrengthDurationMode = 'weeks' | 'ongoing';

function parseUserDate(raw: string): string | null {
  const t = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const fr = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(t);
  if (fr) {
    const dd = fr[1].padStart(2, '0');
    const mm = fr[2].padStart(2, '0');
    const yyyy = fr[3];
    const d = new Date(`${yyyy}-${mm}-${dd}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

function parseDistanceKm(raw: string): number | undefined {
  const n = Number(raw.replace(',', '.'));
  return n > 0 ? n : undefined;
}

export default function NewProgramScreen() {
  const { dispatch, state } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ templateId?: string }>();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [step, setStep] = useState(0);

  const profileWeeklyKm = state.profile.onboarding?.weeklyKmAvg ?? 0;
  const onboarding = state.profile.onboarding;
  const activePrograms = useMemo(
    () => resolveActivePrograms(state.profile),
    [state.profile],
  );

  const [sport, setSport] = useState<ProgramSportCategory | null>(
    () => (onboarding?.sportCategory as ProgramSportCategory | undefined) ?? null,
  );
  const [swimVenue, setSwimVenue] = useState<'pool' | 'open_water' | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<
    TrainingProgramTemplate | 'custom' | null
  >(null);
  const [customDistance, setCustomDistance] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [createdCelebration, setCreatedCelebration] = useState<{
    title: string;
    subtitle: string;
  } | null>(null);
  /** Quand d’autres programmes sont actifs : superposer ou remplacer */
  const [scheduleModeChoice, setScheduleModeChoice] =
    useState<ProgramScheduleMode>('stack');

  const [weeklySessionsTarget, setWeeklySessionsTarget] = useState<WeeklySessionCount>(
    () => {
      const fromProfile = onboarding?.weeklySessionsTarget;
      if (fromProfile && fromProfile >= 1 && fromProfile <= 7) {
        return fromProfile as WeeklySessionCount;
      }
      return 3;
    },
  );
  const [trainingDays, setTrainingDays] = useState<number[]>(
    () =>
      onboarding?.trainingDays?.length
        ? onboarding.trainingDays
        : suggestSpacedTrainingDays(3),
  );
  const [longRunDay, setLongRunDay] = useState(
    () => onboarding?.longRunDay ?? 6,
  );

  const [weeklyKmInput, setWeeklyKmInput] = useState('');
  const [includePpg, setIncludePpg] = useState(onboarding?.includePpg ?? false);
  const savedEquipment = normalizeStrengthEquipment(onboarding?.strengthEquipment);
  const hasProfileEquipment = savedEquipment.length > 0;

  const [strengthEquipment, setStrengthEquipment] = useState<StrengthEquipment[]>(
    () => savedEquipment,
  );
  const [strengthGoal, setStrengthGoal] = useState<string | null>(
    () => onboarding?.strengthGoal ?? null,
  );
  const [strengthSetupPhase, setStrengthSetupPhase] = useState<
    'equipment' | 'goal' | 'focus'
  >(() => (hasProfileEquipment ? 'goal' : 'equipment'));
  const [strengthBodyFocus, setStrengthBodyFocus] = useState<StrengthBodyFocus | null>(
    () =>
      onboarding?.strengthBodyFocus === 'upper' ||
      onboarding?.strengthBodyFocus === 'lower' ||
      onboarding?.strengthBodyFocus === 'full'
        ? onboarding.strengthBodyFocus
        : null,
  );
  const [strengthLevel, setStrengthLevel] = useState<'debutant' | 'intermediaire' | 'confirme'>(
    () => onboarding?.level ?? 'intermediaire',
  );

  const [raceTimeInput, setRaceTimeInput] = useState('');
  const raceTimePrefillKey = useRef<string | null>(null);
  /** Clés pour lesquelles l’utilisateur a volontairement vidé le chrono */
  const raceTimeClearedKeys = useRef<Set<string>>(new Set());

  const [durationMode, setDurationMode] = useState<DurationMode>('weeks');
  const [strengthDurationMode, setStrengthDurationMode] =
    useState<StrengthDurationMode>('weeks');
  const [manualWeeks, setManualWeeks] = useState<number | null>(null);
  const [raceDateInput, setRaceDateInput] = useState('');

  const weeklyKm =
    sport === 'strength'
      ? strengthLevel === 'debutant'
        ? 8
        : strengthLevel === 'confirme'
          ? 40
          : 20
      : profileWeeklyKm > 0
        ? profileWeeklyKm
        : Number(weeklyKmInput.replace(',', '.')) || 0;
  const isStrength = sport === 'strength';
  const isCalis = sport === 'other';
  const isBodyProgram = isStrength || isCalis;
  const isSwim = sport === 'swim';
  /** Décalage d’étapes : natation ajoute Piscine / Eau libre */
  const swimShift = isSwim ? 1 : 0;
  /** Musculation / callisthénie : sport → setup → séances → jours → niveau → semaines */
  const STEP_COUNT = isBodyProgram ? 6 : BASE_STEP_COUNT + swimShift;
  /** Index d’étape logique (indépendant du décalage natation) */
  const S = isBodyProgram
    ? {
        sport: 0,
        venue: -1,
        program: -1,
        setup: 1,
        sessions: 2,
        days: 3,
        ppg: -1,
        time: -1,
        level: 4,
        duration: 5,
      }
    : isSwim
      ? {
          sport: 0,
          venue: 1,
          program: 2,
          setup: -1,
          sessions: 3,
          days: 4,
          ppg: 5,
          time: 6,
          level: -1,
          duration: 7,
        }
      : {
          sport: 0,
          venue: -1,
          program: 1,
          setup: -1,
          sessions: 2,
          days: 3,
          ppg: 4,
          time: 5,
          level: -1,
          duration: 6,
        };
  const countedIds =
    state.profile.programUsageCountedIds ?? state.profile.programUsageCountedId;

  useEffect(() => {
    if (!sport) return;
    const rec = recommendedSessionsForSport(sport);
    setWeeklySessionsTarget(rec);
    setTrainingDays(suggestSpacedTrainingDays(rec));
  }, [sport]);

  const sessionCoach = useMemo(
    () => coachPanelForSessionCount(weeklySessionsTarget, sport),
    [weeklySessionsTarget, sport],
  );
  const sessionGuide = useMemo(() => sessionGuideForSport(sport), [sport]);
  const daysSpacingCoach = useMemo(
    () => coachPanelForDaySpacing(trainingDays),
    [trainingDays],
  );

  const filteredPrograms = useMemo(() => {
    const list = sport
      ? searchPrograms(search, sport, sport === 'swim' ? swimVenue ?? undefined : undefined)
      : [];
    return [...list].sort((a, b) => {
      const ca = usageCountForTemplate(a.id, countedIds);
      const cb = usageCountForTemplate(b.id, countedIds);
      return cb - ca || a.title.localeCompare(b.title, 'fr');
    });
  }, [search, sport, swimVenue, countedIds]);
  const visiblePrograms = filteredPrograms.slice(0, VISIBLE_PROGRAM_COUNT);

  useEffect(() => {
    const raw = params.templateId;
    const id = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (!id) return;
    const prog = findProgramById(id);
    if (!prog) return;
    setSport(prog.sportCategory);
    setSelectedTemplate(prog);
    // Après choix programme : étape séances (index dépend du sport — recalculé au render suivant)
    setStep(prog.sportCategory === 'swim' ? 3 : 2);
  }, [params.templateId]);

  const distanceKm =
    selectedTemplate === 'custom'
      ? parseDistanceKm(customDistance)
      : selectedTemplate?.distanceKm;

  /** Distance du chrono demandé (= objectif course, sinon 5 km / 100 m nage) */
  const refDistanceKm =
    distanceKm && distanceKm > 0 ? distanceKm : isSwim ? 0.1 : 5;
  const distanceQuestion = formatDistanceQuestion(refDistanceKm, sport);

  const raceTimeContextKey = useMemo(() => {
    const templateKey =
      selectedTemplate === 'custom'
        ? `custom:${customDistance}`
        : selectedTemplate?.id ?? 'none';
    return `${sport ?? ''}:${refDistanceKm}:${templateKey}`;
  }, [sport, refDistanceKm, selectedTemplate, customDistance]);

  /**
   * Préremplit le chrono depuis données sportives / programmes précédents.
   * Conservé au retour arrière ; ne revient pas si l’utilisateur a vidé le champ.
   */
  useEffect(() => {
    if (isStrength || !sport) return;
    if (step !== S.time) return;

    const key = raceTimeContextKey;

    if (raceTimeClearedKeys.current.has(key)) {
      if (raceTimeInput.trim()) setRaceTimeInput('');
      raceTimePrefillKey.current = key;
      return;
    }

    const sameKey = raceTimePrefillKey.current === key;
    if (sameKey && raceTimeInput.trim()) return;

    raceTimePrefillKey.current = key;

    const programs = [
      ...resolveActivePrograms(state.profile),
      ...(state.profile.programHistory ?? []),
    ];
    const sec = lookupStoredChronoSec({
      onboarding: state.profile.onboarding,
      sport,
      distanceKm: refDistanceKm,
      programs,
    });
    setRaceTimeInput(sec != null && sec > 0 ? formatRaceTime(sec) : '');
  }, [
    isStrength,
    sport,
    step,
    S.time,
    raceTimeContextKey,
    refDistanceKm,
    raceTimeInput,
    state.profile.onboarding,
    state.profile.activePrograms,
    state.profile.activeProgram,
    state.profile.programHistory,
  ]);

  const parsedTimeSec = parseRaceTime(raceTimeInput);
  const derivedLevel =
    weeklyKm > 0 || parsedTimeSec
      ? resolveAthleteLevel({
          weeklyKm: weeklyKm > 0 ? weeklyKm : 20,
          recentDistanceKm: parsedTimeSec ? refDistanceKm : undefined,
          recentTimeSec: parsedTimeSec ?? undefined,
        })
      : 'intermediaire';

  const derivedVma = resolveVma({
    level: derivedLevel,
    recentDistanceKm: parsedTimeSec ? refDistanceKm : undefined,
    recentTimeSec: parsedTimeSec ?? undefined,
    weeklyKmAvg: weeklyKm > 0 ? weeklyKm : undefined,
    activities: state.activities,
  });
  const inferredZones = useMemo(
    () =>
      resolvePaceZones({
        level: derivedLevel,
        weeklyKmAvg: weeklyKm > 0 ? weeklyKm : undefined,
        recentDistanceKm: parsedTimeSec ? refDistanceKm : undefined,
        recentTimeSec: parsedTimeSec ?? undefined,
        activities: state.activities,
      }),
    [derivedLevel, weeklyKm, parsedTimeSec, refDistanceKm, state.activities],
  );

  const guide = useMemo(
    () =>
      getDurationGuide({
        goal: selectedTemplate !== 'custom' ? selectedTemplate?.goal : undefined,
        distanceKm,
        sportFamily: sport === 'bike' ? 'bike' : undefined,
      }),
    [selectedTemplate, distanceKm, sport],
  );

  const weekPresets = useMemo(
    () => weekPresetOptions(guide, derivedLevel),
    [guide, derivedLevel],
  );
  const defaultRecWeeks =
    selectedTemplate !== null && selectedTemplate !== 'custom'
      ? selectedTemplate.weeks
      : recommendedWeeks(guide, isStrength ? strengthLevel : derivedLevel);
  const strengthWeekPresets = useMemo(
    () => weekPresetOptions(guide, strengthLevel),
    [guide, strengthLevel],
  );
  const parsedRaceDate =
    durationMode === 'date' ? parseUserDate(raceDateInput) : null;

  const durationResolved = useMemo(
    () =>
      resolveTrainingWeeks({
        guide,
        level: derivedLevel,
        manualWeeks:
          durationMode === 'weeks' ? (manualWeeks ?? defaultRecWeeks) : undefined,
        raceDateIso: durationMode === 'date' ? parsedRaceDate ?? undefined : undefined,
      }),
    [guide, derivedLevel, durationMode, manualWeeks, defaultRecWeeks, parsedRaceDate],
  );

  const selectSport = (cat: ProgramSportCategory) => {
    setSport(cat);
    setSelectedTemplate(null);
    setSearch('');
    setSwimVenue(null);
    if (cat === 'strength') {
      // Pas de liste « Musculation générale » — on enchaîne sur le setup
      const base = findProgramById('prog-strength-base');
      setSelectedTemplate(base ?? 'custom');
      setStrengthSetupPhase(hasProfileEquipment ? 'goal' : 'equipment');
      setStep(1);
      return;
    }
    if (cat === 'other') {
      const base = findProgramById('prog-calisthenics-base');
      setSelectedTemplate(base ?? 'custom');
      setStep(1);
      return;
    }
    setStep(1);
  };

  const selectSwimVenue = (venue: 'pool' | 'open_water') => {
    setSwimVenue(venue);
    setSelectedTemplate(null);
    setSearch('');
    setStep(2);
  };

  const toggleStrengthEquipment = (id: StrengthEquipment) => {
    setStrengthEquipment((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectProgram = (prog: TrainingProgramTemplate) => {
    setSelectedTemplate(prog);
    if (prog.sportCategory === 'strength') {
      if (hasProfileEquipment) {
        setStrengthSetupPhase(strengthGoal ? 'focus' : 'goal');
        setStep(1);
      } else {
        setStrengthSetupPhase('equipment');
        setStep(1);
      }
    } else if (prog.sportCategory === 'swim') {
      setSwimVenue(prog.swimVenue ?? swimVenue ?? 'pool');
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const selectCustom = () => {
    setSelectedTemplate('custom');
  };

  const applySessionCount = (n: WeeklySessionCount) => {
    setWeeklySessionsTarget(n);
    setTrainingDays((prev) => {
      if (prev.length === n) return prev;
      if (prev.length > n) {
        const trimmed = suggestSpacedTrainingDays(n).filter((d) => prev.includes(d));
        const base =
          trimmed.length === n
            ? trimmed
            : [...prev].sort((a, b) => a - b).slice(0, n);
        const days = base.length === n ? base : suggestSpacedTrainingDays(n);
        if (days.length && !days.includes(longRunDay)) {
          setLongRunDay(days[days.length - 1]!);
        }
        return days;
      }
      const days = suggestSpacedTrainingDays(n);
      if (days.length && !days.includes(longRunDay)) {
        setLongRunDay(days[days.length - 1]!);
      }
      return days;
    });
  };

  const toggleDay = (d: number) => {
    setTrainingDays((prev) => {
      if (prev.includes(d)) {
        const next = prev.filter((x) => x !== d);
        if (next.length && !next.includes(longRunDay)) {
          setLongRunDay(next[next.length - 1]!);
        }
        return next;
      }
      if (prev.length >= weeklySessionsTarget) {
        // Remplace le dernier pour rester sur le quota exact
        const withoutLast = prev.slice(0, -1);
        const next = [...withoutLast, d].sort((a, b) => a - b);
        if (!next.includes(longRunDay)) {
          setLongRunDay(d);
        }
        return next;
      }
      const next = [...prev, d].sort((a, b) => a - b);
      if (!next.includes(longRunDay)) {
        setLongRunDay(d);
      }
      return next;
    });
  };

  const finish = async () => {
    if (generating) return;
    if (!selectedTemplate) {
      await appAlert('Programme', 'Choisissez d’abord un objectif ou une distance.');
      return;
    }

    const effectiveWeeklyKm =
      isBodyProgram
        ? weeklyKm
        : profileWeeklyKm > 0
          ? profileWeeklyKm
          : Number(weeklyKmInput.replace(',', '.')) || 20;

    if (!isBodyProgram && profileWeeklyKm <= 0) {
      const ok = await appConfirm(
        'Volume estimé',
        `Aucun volume hebdo dans votre profil — le plan utilisera ${effectiveWeeklyKm} km/sem. Continuer ?`,
        'Continuer',
        'Annuler',
      );
      if (!ok) return;
    }

    await commitProgram(effectiveWeeklyKm);
  };

  const commitProgram = async (effectiveWeeklyKm: number) => {
    try {
      const programInput = {
        ...buildProgramInput(),
        weeklyKmAvg: effectiveWeeklyKm,
      };
      const preview = buildProgramPlan(programInput);
      const previewTagged = tagPlanForProgram(
        preview.plan,
        createProgramInstanceId(preview.meta.catalogId ?? preview.meta.id),
      );
      const existingActive = resolveActivePrograms(state.profile);

      const runCreate = (scheduleMode: ProgramScheduleMode) => {
        setGenerating(true);
        try {
          dispatch({
            type: 'CREATE_PROGRAM',
            input: programInput,
            scheduleMode,
          });
          const name =
            selectedTemplate === 'custom'
              ? 'Programme personnalisé'
              : selectedTemplate?.title ?? 'Nouveau programme';
          const weeks =
            programInput.customWeeks ??
            preview.meta.weeks ??
            0;
          const weeksLabel =
            weeks > 0
              ? `${weeks} semaine${weeks > 1 ? 's' : ''}`
              : 'Plan en cours';
          setCreatedCelebration({
            title: name,
            subtitle: `${weeksLabel} · séances ajoutées au calendrier`,
          });
          setGenerating(false);
        } catch (err) {
          setGenerating(false);
          void appAlert(
            'Erreur',
            err instanceof Error ? err.message : 'Impossible de générer le programme.',
          );
        }
      };

      const commitWithMode = async (scheduleMode: ProgramScheduleMode) => {
        const sleepPreview = previewSleepStartupRamp(state.health.sleepHistory, {
          brand: state.profile.watch?.brandId,
        });
        if (sleepPreview.wouldApply && sleepPreview.message) {
          await appAlert('Démarrage adapté au sommeil', sleepPreview.message);
        }
        runCreate(scheduleMode);
      };

      const warnThenCommit = async (scheduleMode: ProgramScheduleMode) => {
        const previewForLoad =
          scheduleMode === 'spread'
            ? spreadIncomingSessions(
                state.plan,
                previewTagged,
                programInput.trainingDays,
              )
            : previewTagged;
        const overload = analyzeCombinedPlanOverload(
          state.plan,
          previewForLoad,
          sport ?? undefined,
        );

        if (overload.level === 'strong') {
          const ok = await appConfirm(
            'Risque de blessure',
            `${overload.message}\n\nTrop de séances ou de sports en parallèle augmente le risque de surcharge.`,
            'Créer quand même',
            'Annuler',
          );
          if (!ok) return;
        } else if (overload.level === 'caution') {
          const ok = await appConfirm(
            'Attention à la charge',
            overload.message,
            'Continuer',
            'Revoir',
          );
          if (!ok) return;
        }
        await commitWithMode(scheduleMode);
      };

      const mode: ProgramScheduleMode =
        existingActive.length > 0 ? scheduleModeChoice : 'stack';
      if (
        (mode === 'stack' || mode === 'spread') &&
        existingActive.length > 0
      ) {
        const { hasPremiumAccess, canStackAnotherProgram } = await import(
          '../../src/premium/entitlement'
        );
        const premium = hasPremiumAccess({
          plan: state.profile.plan,
          subscription: state.profile.subscription,
          premiumSource: state.profile.premiumSource,
        });
        if (!canStackAnotherProgram(existingActive.length, premium)) {
          const go = await appConfirm(
            'Premium — multi-programmes',
            'En gratuit : un seul programme actif. Remplace l’actuel, ou passe en Premium pour superposer.',
            'Voir Premium',
            'Remplacer plutôt',
          );
          if (go) {
            router.push('/settings/subscription');
            return;
          }
          await commitWithMode('replace');
          return;
        }
      }
      if (mode === 'replace') {
        await commitWithMode('replace');
      } else {
        await warnThenCommit(mode === 'spread' ? 'spread' : 'stack');
      }
    } catch (err) {
      setGenerating(false);
      await appAlert(
        'Erreur',
        err instanceof Error ? err.message : 'Impossible de générer le programme.',
      );
    }
  };

  function buildProgramInput(): ProgramBuildInput {
    const weeks =
      durationMode === 'weeks'
        ? manualWeeks ?? defaultRecWeeks
        : durationResolved.weeks;
    const strengthWeeks =
      strengthDurationMode === 'weeks'
        ? manualWeeks ?? defaultRecWeeks
        : undefined;

    return {
      templateId: selectedTemplate === 'custom' ? 'custom' : selectedTemplate!.id,
      customDistanceKm:
        selectedTemplate === 'custom' ? parseDistanceKm(customDistance) : undefined,
      customWeeks: isBodyProgram
        ? strengthWeeks
        : durationMode === 'weeks'
          ? weeks
          : undefined,
      raceDateIso:
        durationMode === 'date' && parsedRaceDate ? parsedRaceDate : undefined,
      customTitle:
        selectedTemplate === 'custom' ? customTitle || undefined : undefined,
      trainingDays,
      longRunDay,
      weeklySessionsTarget,
      weeklyKmAvg: weeklyKm,
      recentTimeSec: parsedTimeSec ?? undefined,
      recentDistanceKm: parsedTimeSec ? refDistanceKm : undefined,
      includePpg: isBodyProgram ? false : includePpg,
      ongoing: isStrength ? strengthDurationMode === 'ongoing' : undefined,
      runIntent: state.profile.onboarding?.runIntent,
      strengthEquipment:
        isStrength && strengthEquipment.length > 0 ? strengthEquipment : undefined,
      strengthGoal: isBodyProgram ? strengthGoal ?? undefined : undefined,
      strengthBodyFocus: isStrength ? strengthBodyFocus ?? undefined : undefined,
      isPremium: true,
    };
  }

  const summaryTitle = isCalis
    ? [
        'Callisthénie',
        CALISTHENICS_GOAL_OPTIONS.find((g) => g.id === strengthGoal)?.label,
      ]
        .filter(Boolean)
        .join(' · ')
    : isStrength
    ? [
        'Musculation',
        STRENGTH_BODY_FOCUS_OPTIONS.find((f) => f.id === strengthBodyFocus)?.label,
        STRENGTH_GOAL_OPTIONS.find((g) => g.id === strengthGoal)?.label,
      ]
        .filter(Boolean)
        .join(' · ')
    : selectedTemplate === 'custom'
      ? customTitle || `Objectif ${customDistance} km`
      : selectedTemplate?.title ?? '';

  const stepTitles = isCalis
    ? [
        'Quel sport ?',
        'Quel est ton objectif callisthénie ?',
        'Combien de séances / semaine ?',
        'Vos disponibilités',
        'Votre niveau',
        'Durée en semaines',
      ]
    : isStrength
    ? [
        'Quel sport ?',
        'Quel est ton objectif principal ?',
        'Combien de séances / semaine ?',
        'Vos disponibilités',
        'Votre niveau',
        'Durée en semaines',
      ]
    : isSwim
      ? [
          'Quel sport ?',
          'Piscine ou eau libre ?',
          'Quelle distance ?',
          'Combien de séances / semaine ?',
          'Vos disponibilités',
          'Renforcement musculaire',
          `Votre temps sur ${distanceQuestion}`,
          'Durée du programme',
        ]
      : [
          'Quel sport ?',
          'Quel objectif ?',
          'Combien de séances / semaine ?',
          'Vos disponibilités',
          'Renforcement musculaire',
          `Votre temps sur ${distanceQuestion}`,
          'Durée du programme',
        ];

  const strengthStep2Title =
    strengthSetupPhase === 'focus'
      ? 'Quel muscle souhaites-tu travailler ?'
      : strengthSetupPhase === 'goal' || hasProfileEquipment
        ? 'Quel est ton objectif principal ?'
        : 'Votre matériel';

  const displayTitle =
    step === S.setup && isStrength
      ? strengthStep2Title
      : step === S.setup && isCalis
        ? 'Quel est ton objectif callisthénie ?'
        : stepTitles[step];

  const advanceStep = () => {
    if (step === S.setup && isStrength) {
      if (strengthSetupPhase === 'equipment') {
        setStrengthSetupPhase('goal');
        return;
      }
      if (strengthSetupPhase === 'goal') {
        setStrengthSetupPhase('focus');
        return;
      }
    }
    if (isSwim && step === S.venue && swimVenue) {
      setStep(S.program);
      return;
    }
    setStep((s) => s + 1);
  };

  const goBackStep = () => {
    if (step === S.setup && isStrength) {
      if (strengthSetupPhase === 'focus') {
        setStrengthSetupPhase('goal');
        return;
      }
      if (strengthSetupPhase === 'goal' && !hasProfileEquipment) {
        setStrengthSetupPhase('equipment');
        return;
      }
    }
    // Retour vers la liste des disciplines (étape 1)
    if (step <= 1) {
      setSport(null);
      setSelectedTemplate(null);
      setSwimVenue(null);
      setSearch('');
      setStep(0);
      return;
    }
    setStep((s) => s - 1);
  };

  const exitWizard = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/calendar');
    }
  };

  /** Flèche header : étapes du wizard, sortie seulement à l’étape 0 */
  const onHeaderBack = () => {
    if (step <= 0) {
      exitWizard();
      return;
    }
    goBackStep();
  };
  const showContinue =
    step === S.sessions ||
    step === S.days ||
    step === S.ppg ||
    (step === S.program && selectedTemplate === 'custom') ||
    (isBodyProgram && step === S.level) ||
    (isBodyProgram &&
      step === S.setup &&
      isStrength &&
      strengthSetupPhase === 'equipment');
  const showSkip = step === S.time && !isBodyProgram;
  const showGenerate = step === S.duration;

  const canContinue =
    step === S.setup && isStrength && strengthSetupPhase === 'equipment'
      ? strengthEquipment.length >= 1
      : step === S.sessions
        ? weeklySessionsTarget >= 1
        : step === S.days
          ? trainingDays.length === weeklySessionsTarget
          : step === S.ppg
            ? true
            : step === S.level && isBodyProgram
              ? true
              : step === S.program && selectedTemplate === 'custom'
                ? parseDistanceKm(customDistance) != null
                : false;

  const canGenerate =
    Boolean(selectedTemplate) &&
    (isBodyProgram || durationMode === 'weeks' || Boolean(parsedRaceDate));

  /** Fond programme dès l’étape séances — image du programme choisi, nette. */
  const wizardBg = useMemo(() => {
    if (step < S.sessions || !sport) return null;
    if (selectedTemplate === 'custom') {
      return CUSTOM_DISTANCE_IMAGES[sport] ?? SPORT_HERO_IMAGES[sport] ?? SPORT_HERO_IMAGES.run;
    }
    if (selectedTemplate) {
      return imageForProgram(selectedTemplate.sportCategory, selectedTemplate.id);
    }
    return SPORT_HERO_IMAGES[sport] ?? SPORT_HERO_IMAGES.run;
  }, [step, sport, selectedTemplate, S.days]);

  const onHero = Boolean(wizardBg);

  const wizardBody = (
    <>
      <View style={[styles.header, onHero && styles.headerOnHero]}>
        <PressableScale
          onPress={onHeaderBack}
          variant="pop"
          accessibilityLabel={step <= 0 ? 'Fermer' : 'Retour'}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={28} color={onHero ? '#fff' : colors.text} />
        </PressableScale>
        <NewProgramLabel
          color={onHero ? '#fff' : colors.text}
          size={20}
          style={styles.headerTitle}
        />
      </View>
      <AppScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: onHero ? spacing.md : 0 },
        ]}
      >
        <Muted style={[styles.stepMeta, onHero ? styles.mutedOnHero : undefined]}>
          Étape {step + 1} / {STEP_COUNT}
        </Muted>
        <Title style={[styles.stepTitle, onHero && styles.titleOnHero]}>{displayTitle}</Title>

        {step > 0 ? (
          <WeekSilhouettePreview
            stepIndex={step}
            stepCount={STEP_COUNT}
            daysStepIndex={S.days}
            selectedDays={trainingDays}
            accent={colors.accent}
            tone={onHero ? 'hero' : 'surface'}
          />
        ) : null}

        {step === 0 && (
          <WizardStepShell resetKey="sport-0">
            <Body style={{ marginTop: 8, marginBottom: spacing.md }}>
              Touchez une discipline — passage automatique à l&apos;étape suivante.
            </Body>
            {POPULAR_SPORT_CATEGORIES.map((cat, idx) => (
              <StaggerIn key={cat.id} index={idx} step={70} duration={560}>
                <PressableScale
                  variant="nav"
                  onPress={() => selectSport(cat.id)}
                  accessibilityRole="button"
                  accessibilityLabel={cat.label}
                  style={styles.sportCardPress}
                >
                  <SportCover
                    source={SPORT_HERO_IMAGES[cat.id]}
                    height={168}
                    minHeight={168}
                    borderRadius={radii.lg}
                    objectPosition={COVER_CROP_CENTER}
                    scrim="rgba(7, 17, 31, 0.22)"
                    style={styles.sportHero}
                    contentStyle={styles.sportHeroContent}
                  >
                    <View style={styles.sportHeroText}>
                      <Text style={styles.sportHeroLabel} numberOfLines={1}>
                        {cat.label}
                      </Text>
                      <Text style={styles.sportHeroDesc} numberOfLines={2}>
                        {cat.desc}
                      </Text>
                    </View>
                    <Text style={styles.sportHeroChevron}>›</Text>
                  </SportCover>
                </PressableScale>
              </StaggerIn>
            ))}
          </WizardStepShell>
        )}

        {step === S.venue && isSwim && (
          <WizardStepShell resetKey="swim-venue">
            <Body style={{ marginTop: 8, marginBottom: spacing.md }}>
              Choisis ton environnement — les distances et chronos s&apos;adaptent.
            </Body>
            <StaggerIn index={0} step={70} duration={560}>
              <PressableScale
                variant="nav"
                onPress={() => selectSwimVenue('pool')}
                accessibilityRole="button"
                accessibilityLabel="Piscine"
                style={styles.sportCardPress}
              >
                <SportCover
                  source={SWIM_VENUE_IMAGES.pool}
                  height={168}
                  minHeight={168}
                  borderRadius={radii.lg}
                  objectPosition={COVER_CROP_CENTER}
                  scrim="rgba(7, 17, 31, 0.22)"
                  style={[
                    styles.sportHero,
                    swimVenue === 'pool' && { borderWidth: 2, borderColor: colors.accent },
                  ]}
                  contentStyle={styles.sportHeroContent}
                >
                  <View style={styles.sportHeroText}>
                    <Text style={styles.sportHeroLabel} numberOfLines={1}>
                      Piscine
                    </Text>
                    <Text style={styles.sportHeroDesc} numberOfLines={2}>
                      50 · 100 · 200 · 400 · 800 · 1500 m nage libre
                    </Text>
                  </View>
                  <Text style={styles.sportHeroChevron}>›</Text>
                </SportCover>
              </PressableScale>
            </StaggerIn>
            <StaggerIn index={1} step={70} duration={560}>
              <PressableScale
                variant="nav"
                onPress={() => selectSwimVenue('open_water')}
                accessibilityRole="button"
                accessibilityLabel="Eau libre"
                style={styles.sportCardPress}
              >
                <SportCover
                  source={SWIM_VENUE_IMAGES.open_water}
                  height={168}
                  minHeight={168}
                  borderRadius={radii.lg}
                  objectPosition={COVER_CROP_CENTER}
                  scrim="rgba(7, 17, 31, 0.22)"
                  style={[
                    styles.sportHero,
                    swimVenue === 'open_water' && {
                      borderWidth: 2,
                      borderColor: colors.accent,
                    },
                  ]}
                  contentStyle={styles.sportHeroContent}
                >
                  <View style={styles.sportHeroText}>
                    <Text style={styles.sportHeroLabel} numberOfLines={1}>
                      Eau libre
                    </Text>
                    <Text style={styles.sportHeroDesc} numberOfLines={2}>
                      1 · 2 · 5 km open water — orientation & endurance
                    </Text>
                  </View>
                  <Text style={styles.sportHeroChevron}>›</Text>
                </SportCover>
              </PressableScale>
            </StaggerIn>
          </WizardStepShell>
        )}

        {step === S.program && sport && (
          <WizardStepShell resetKey={`program-${sport}-${swimVenue ?? 'x'}`}>
            {isSwim && swimVenue ? (
              <Muted style={{ marginBottom: spacing.sm }}>
                {swimVenue === 'pool'
                  ? 'Distances piscine (World Aquatics)'
                  : 'Distances eau libre'}
              </Muted>
            ) : null}
            <AppTextInput
              style={styles.search}
              placeholder={
                isSwim
                  ? swimVenue === 'pool'
                    ? 'Rechercher (ex. 100 m…)'
                    : 'Rechercher (ex. 2 km…)'
                  : 'Rechercher (ex. marathon…)'
              }
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {visiblePrograms.map((prog, idx) => (
              <ProgramCard
                key={prog.id}
                prog={prog}
                index={idx}
                usageCount={usageCountForTemplate(prog.id, countedIds)}
                onPress={() => selectProgram(prog)}
              />
            ))}
            {filteredPrograms.length > VISIBLE_PROGRAM_COUNT && !search ? (
              <Muted style={{ textAlign: 'center', marginVertical: spacing.sm }}>
                + {filteredPrograms.length - VISIBLE_PROGRAM_COUNT} — recherchez pour
                voir plus
              </Muted>
            ) : null}
            {search
              ? filteredPrograms.slice(VISIBLE_PROGRAM_COUNT).map((prog, idx) => (
                  <ProgramCard
                    key={prog.id}
                    prog={prog}
                    index={VISIBLE_PROGRAM_COUNT + idx}
                    usageCount={usageCountForTemplate(prog.id, countedIds)}
                    onPress={() => selectProgram(prog)}
                  />
                ))
              : null}
            <StaggerIn index={visiblePrograms.length + 1} step={60} duration={520}>
              <PressableScale variant="nav" style={styles.otherCard} onPress={selectCustom}>
                <Text style={styles.otherTitle}>Distance sur mesure</Text>
                <Text style={styles.otherDesc}>{customDistanceExample(sport)}</Text>
              </PressableScale>
            </StaggerIn>
            {selectedTemplate === 'custom' ? (
              <>
                <AppTextInput
                  style={styles.input}
                  placeholder={customDistancePlaceholder(sport)}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={customDistance}
                  onChangeText={setCustomDistance}
                />
                <AppTextInput
                  style={styles.input}
                  placeholder="Nom de l'objectif (optionnel)"
                  placeholderTextColor={colors.textMuted}
                  value={customTitle}
                  onChangeText={setCustomTitle}
                />
              </>
            ) : null}
          </WizardStepShell>
        )}

        {step === S.setup && isCalis && (
          <WizardStepShell resetKey="calis-goal">
            <Body style={{ marginTop: 8, marginBottom: spacing.md }}>
              Touchez un objectif — passage automatique à l&apos;étape suivante.
            </Body>
            {CALISTHENICS_GOAL_OPTIONS.map((opt) => (
              <WizardOptionCard
                key={opt.id}
                title={opt.label}
                subtitle={opt.desc}
                selected={strengthGoal === opt.id}
                onPress={() => {
                  setStrengthGoal(opt.id);
                  setStep((s) => s + 1);
                }}
                accent={colors.accent}
                tone="surface"
              />
            ))}
          </WizardStepShell>
        )}

        {step === S.setup && isStrength && strengthSetupPhase === 'equipment' && (
          <StrengthEquipmentPicker
            selected={strengthEquipment}
            onToggle={toggleStrengthEquipment}
            accent={colors.accent}
            tone="surface"
          />
        )}

        {step === S.setup && isStrength && strengthSetupPhase === 'goal' && (
          <StrengthGoalPicker
            selected={
              strengthGoal === 'fitness' ||
              strengthGoal === 'hypertrophy' ||
              strengthGoal === 'power'
                ? strengthGoal
                : null
            }
            onSelect={(id) => {
              setStrengthGoal(id);
              setStrengthSetupPhase('focus');
            }}
            accent={colors.accent}
            tone="surface"
          />
        )}

        {step === S.setup && isStrength && strengthSetupPhase === 'focus' && (
          <StrengthBodyFocusPicker
            selected={strengthBodyFocus}
            onSelect={(id) => {
              setStrengthBodyFocus(id);
              setStep((s) => s + 1);
            }}
            accent={colors.accent}
            tone="surface"
          />
        )}

        {step === S.sessions && (
          <WizardStepShell resetKey={`sessions-${sport}-${step}`}>
            <Muted style={[{ marginBottom: 8 }, onHero && styles.mutedOnHero]}>
              {sessionGuide.blurb} ★ = idéal
            </Muted>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {([1, 2, 3, 4, 5, 6, 7] as WeeklySessionCount[]).map((n, idx) => {
                const isRec = n === sessionGuide.recommended;
                return (
                  <WizardPill
                    key={n}
                    index={idx}
                    label={`${n}${isRec ? ' ★' : ''}`}
                    selected={weeklySessionsTarget === n}
                    onPress={() => applySessionCount(n)}
                    accent={colors.accent}
                    tone={onHero ? 'hero' : 'surface'}
                  />
                );
              })}
            </View>
            <WizardHint
              title={`${sessionBandLabel(sessionLoadBand(weeklySessionsTarget))} · ${weeklySessionsTarget}×`}
              tone={wizardHintTone(sessionCoach.tone)}
              surface={onHero ? 'hero' : 'surface'}
            >
              {sessionCoach.body}
            </WizardHint>
          </WizardStepShell>
        )}

        {step === S.days && !isBodyProgram && (
          <WizardStepShell resetKey={`days-${sport}-${step}`}>
            <WizardSectionLabel light tone="hero">
              {`Choisis ${weeklySessionsTarget} jour${weeklySessionsTarget > 1 ? 's' : ''} disponible${weeklySessionsTarget > 1 ? 's' : ''}`}
            </WizardSectionLabel>
            <WizardDayGrid
              selected={trainingDays}
              onToggle={toggleDay}
              accent={colors.accent}
              tone="hero"
            />
            <Muted style={[{ marginTop: 10 }, onHero && styles.mutedOnHero]}>
              {trainingDays.length} / {weeklySessionsTarget} jour
              {weeklySessionsTarget > 1 ? 's' : ''} sélectionné
              {trainingDays.length > 1 ? 's' : ''}
            </Muted>
            {daysSpacingCoach ? (
              <WizardHint
                title={daysSpacingCoach.title}
                tone={wizardHintTone(daysSpacingCoach.tone)}
                surface="hero"
              >
                {daysSpacingCoach.body}
              </WizardHint>
            ) : null}
            <WizardSectionLabel light tone="hero">
              Sortie longue
            </WizardSectionLabel>
            <WizardDayGrid
              selected={[longRunDay]}
              mode="long"
              accent="#F59E0B"
              tone="hero"
              onToggle={(i) => {
                setLongRunDay(i);
                if (!trainingDays.includes(i)) {
                  setTrainingDays((prev) => {
                    if (prev.length >= weeklySessionsTarget) {
                      return [...prev.slice(0, -1), i].sort((a, b) => a - b);
                    }
                    return [...prev, i].sort((a, b) => a - b);
                  });
                }
              }}
            />
          </WizardStepShell>
        )}

        {step === S.days && isBodyProgram && (
          <WizardStepShell resetKey={`days-str-${step}`}>
            <WizardSectionLabel light tone={onHero ? 'hero' : 'surface'}>
              {`Choisis ${weeklySessionsTarget} jour${weeklySessionsTarget > 1 ? 's' : ''} d'entraînement`}
            </WizardSectionLabel>
            <WizardDayGrid
              selected={trainingDays}
              onToggle={toggleDay}
              accent={colors.accent}
              tone={onHero ? 'hero' : 'surface'}
            />
            <Muted
              style={[
                { marginTop: 10 },
                onHero && styles.mutedOnHero,
              ]}
            >
              {trainingDays.length} / {weeklySessionsTarget} ·{' '}
              {strengthBodyFocus === 'upper'
                ? 'focus haut du corps'
                : strengthBodyFocus === 'lower'
                  ? 'focus bas du corps'
                  : weeklySessionsTarget >= 5
                    ? 'split push / pull / legs'
                    : weeklySessionsTarget >= 4
                      ? 'haut / bas'
                      : 'full body'}
            </Muted>
            {daysSpacingCoach ? (
              <WizardHint
                title={daysSpacingCoach.title}
                tone={wizardHintTone(daysSpacingCoach.tone)}
                surface={onHero ? 'hero' : 'surface'}
              >
                {daysSpacingCoach.body}
              </WizardHint>
            ) : null}
          </WizardStepShell>
        )}

        {step === S.ppg && !isBodyProgram && (
          <WizardStepShell resetKey={`ppg-${sport}-${step}`}>
            <WizardOptionCard
              index={0}
              title="Oui, avec renfo"
              subtitle="Gainage, mobilité, force utile à ta discipline"
              emoji="💪"
              selected={includePpg}
              onPress={() => setIncludePpg(true)}
              accent={colors.accent}
              tone="hero"
            />
            <WizardOptionCard
              index={1}
              title="Non, sport seul"
              subtitle="Uniquement les séances de ta discipline"
              emoji="🏃"
              selected={!includePpg}
              onPress={() => setIncludePpg(false)}
              accent={colors.accent}
              tone="hero"
            />
            {profileWeeklyKm > 0 ? (
              <WizardHint tone="ok" surface="hero">{`Volume : ${profileWeeklyKm} km/sem`}</WizardHint>
            ) : (
              <WizardHint tone="warn" surface="hero">
                Volume inconnu · défaut 20 km.
              </WizardHint>
            )}
          </WizardStepShell>
        )}

        {step === S.level && isBodyProgram && (
          <WizardStepShell resetKey={`lvl-${step}`}>
            {(
              [
                ['debutant', 'Débutant', 'Bases & technique'],
                ['intermediaire', 'Intermédiaire', 'Volume progressif'],
                ['confirme', 'Confirmé', 'Charge & intensité'],
              ] as const
            ).map(([id, label, sub], idx) => (
              <WizardOptionCard
                key={id}
                index={idx}
                title={label}
                subtitle={sub}
                selected={strengthLevel === id}
                onPress={() => setStrengthLevel(id)}
                accent={colors.accent}
                tone={onHero ? 'hero' : 'surface'}
              />
            ))}
          </WizardStepShell>
        )}

        {step === S.time && !isBodyProgram && (
          <WizardStepShell resetKey={`time-${sport}-${step}`}>
            <WizardSectionLabel light tone="hero">
              {`Ton chrono · ${distanceQuestion}`}
            </WizardSectionLabel>
            <AppTextInput
              style={[styles.input, styles.timeInputHero, onHero && styles.inputOnHero]}
              placeholder={
                isSwim
                  ? swimTimePlaceholder(refDistanceKm)
                  : refDistanceKm >= 21
                    ? 'ex. 14500 → 1:45:00'
                    : 'ex. 1530 → 15:30'
              }
              placeholderTextColor={onHero ? 'rgba(18,32,28,0.45)' : colors.textMuted}
              value={raceTimeInput}
              onChangeText={(t) => {
                const next = formatRaceClockInput(t);
                setRaceTimeInput(next);
                const key = raceTimeContextKey;
                if (!next.trim()) {
                  raceTimeClearedKeys.current.add(key);
                } else {
                  raceTimeClearedKeys.current.delete(key);
                }
              }}
              keyboardType="number-pad"
              selectionColor={onHero ? '#0F766E' : colors.accent}
            />
            {parsedTimeSec ? (
              <WizardHint tone="ok" surface="hero">{`Allure ${formatPace(parsedTimeSec / refDistanceKm)} · VMA ${vmaFromRaceTime(refDistanceKm, parsedTimeSec).toFixed(1)} km/h`}</WizardHint>
            ) : raceTimeInput.trim() ? (
              <WizardHint tone="warn" surface="hero">
                Format : chiffres (ex. 1530 → 15:30)
              </WizardHint>
            ) : (
              <WizardHint surface="hero">{`Sans chrono, Mova estime via ton volume${
                weeklyKm > 0 ? ` (${weeklyKm} km/sem)` : ''
              } — VMA ~ ${Number(inferredZones.vmaKmh).toFixed(1)} km/h`}</WizardHint>
            )}
          </WizardStepShell>
        )}

        {step === S.duration && isBodyProgram && (
          <WizardStepShell resetKey={`dur-str-${step}`}>
            <WizardOptionCard
              index={0}
              title="Nombre de semaines"
              subtitle={`Recommandé : ${defaultRecWeeks} sem.`}
              selected={strengthDurationMode === 'weeks'}
              onPress={() => setStrengthDurationMode('weeks')}
              accent={colors.accent}
              tone={onHero ? 'hero' : 'surface'}
            />
            <WizardOptionCard
              index={1}
              title="Sans date de fin"
              subtitle="Cycle glissant jusqu’à annulation"
              selected={strengthDurationMode === 'ongoing'}
              onPress={() => setStrengthDurationMode('ongoing')}
              accent={colors.accent}
              tone={onHero ? 'hero' : 'surface'}
            />

            {strengthDurationMode === 'weeks' ? (
              <View style={[styles.row, { marginTop: spacing.md }]}>
                {strengthWeekPresets.map((w, idx) => (
                  <WizardPill
                    key={w}
                    index={idx}
                    label={`${w} sem.`}
                    selected={(manualWeeks ?? defaultRecWeeks) === w}
                    onPress={() => setManualWeeks(w)}
                    accent={colors.accent}
                    tone={onHero ? 'hero' : 'surface'}
                  />
                ))}
              </View>
            ) : (
              <WizardHint tone="ok" surface={onHero ? 'hero' : 'surface'}>
                Le programme continue semaine après semaine jusqu&apos;à ce que tu
                l&apos;annules.
              </WizardHint>
            )}

            <View style={[styles.recapCard, { marginTop: spacing.md }]}>
              <Text style={styles.recapTitle}>{summaryTitle}</Text>
              <Text style={styles.recapSub}>
                {strengthDurationMode === 'ongoing'
                  ? 'Sans date de fin'
                  : `${manualWeeks ?? defaultRecWeeks} semaines`}{' '}
                · {trainingDays.length} j/sem ·{' '}
                {strengthEquipment
                  .map(
                    (id) => STRENGTH_EQUIPMENT_OPTIONS.find((e) => e.id === id)?.label,
                  )
                  .filter(Boolean)
                  .join(', ') || 'Matériel'}
              </Text>
            </View>
          </WizardStepShell>
        )}

        {step === S.duration && !isBodyProgram && (
          <WizardStepShell resetKey={`dur-${sport}-${step}`}>
            <WizardOptionCard
              index={0}
              title="Nombre de semaines"
              subtitle={`Recommandé : ${defaultRecWeeks} sem.`}
              selected={durationMode === 'weeks'}
              onPress={() => setDurationMode('weeks')}
              accent={colors.accent}
              tone="hero"
            />
            <WizardOptionCard
              index={1}
              title="Date de la course"
              subtitle="On calcule la durée jusqu’au jour J"
              selected={durationMode === 'date'}
              onPress={() => setDurationMode('date')}
              accent={colors.accent}
              tone="hero"
            />

            {durationMode === 'weeks' ? (
              <View style={[styles.row, { marginTop: spacing.md }]}>
                {weekPresets.map((w, idx) => (
                  <WizardPill
                    key={w}
                    index={idx}
                    label={`${w} sem.`}
                    selected={(manualWeeks ?? defaultRecWeeks) === w}
                    onPress={() => setManualWeeks(w)}
                    accent={colors.accent}
                    tone="hero"
                  />
                ))}
              </View>
            ) : (
              <>
                <AppTextInput
                  style={[styles.input, onHero && styles.inputOnHero]}
                  placeholder="JJ/MM/AAAA — ex. 22/10/2026"
                  placeholderTextColor={onHero ? 'rgba(18,32,28,0.45)' : colors.textMuted}
                  value={raceDateInput}
                  onChangeText={(t) => setRaceDateInput(formatDateSlashInput(t))}
                  keyboardType="number-pad"
                  maxLength={10}
                  selectionColor={onHero ? '#0F766E' : colors.accent}
                />
                {parsedRaceDate ? (
                  <WizardHint tone="ok" surface="hero">{`${formatRaceDateFr(parsedRaceDate)} · ${weeksUntilDate(parsedRaceDate)} sem. → plan de ${durationResolved.weeks} semaines`}</WizardHint>
                ) : null}
              </>
            )}
          </WizardStepShell>
        )}
      </AppScrollView>

      {showContinue || showSkip || showGenerate ? (
        <View style={[styles.footer, onHero && styles.footerOnHero]}>
          {showContinue ? (
            <PrimaryButton
              label="Continuer"
              disabled={!canContinue}
              onPress={advanceStep}
            />
          ) : null}
          {showSkip ? (
            parsedTimeSec ? (
              <PrimaryButton label="Continuer" onPress={() => setStep(S.duration)} />
            ) : (
              <SecondaryButton
                label="Passer sans chrono"
                onPress={() => setStep(S.duration)}
              />
            )
          ) : null}
          {showGenerate ? (
            <>
              {activePrograms.length > 0 ? (
                <View style={styles.multiProgramNotice}>
                  <View style={styles.modeRow}>
                    <PressableScale
                      variant="nav"
                      style={[
                        styles.modeCard,
                        scheduleModeChoice === 'stack' && styles.modeCardOn,
                      ]}
                      contentStyle={styles.modeCardInner}
                      onPress={() => setScheduleModeChoice('stack')}
                      accessibilityLabel="Superposer"
                    >
                      <Text
                        style={[
                          styles.modeTitle,
                          scheduleModeChoice === 'stack' && styles.modeTitleOn,
                        ]}
                      >
                        Superposer
                      </Text>
                      <Text
                        style={[
                          styles.modeSub,
                          scheduleModeChoice === 'stack' && styles.modeSubOn,
                        ]}
                      >
                        Mêmes jours
                      </Text>
                    </PressableScale>
                    <PressableScale
                      variant="nav"
                      style={[
                        styles.modeCard,
                        scheduleModeChoice === 'replace' && styles.modeCardOn,
                      ]}
                      contentStyle={styles.modeCardInner}
                      onPress={() => setScheduleModeChoice('replace')}
                      accessibilityLabel="Remplacer"
                    >
                      <Text
                        style={[
                          styles.modeTitle,
                          scheduleModeChoice === 'replace' && styles.modeTitleOn,
                        ]}
                      >
                        Remplacer
                      </Text>
                      <Text
                        style={[
                          styles.modeSub,
                          scheduleModeChoice === 'replace' && styles.modeSubOn,
                        ]}
                      >
                        Nouvel seul
                      </Text>
                    </PressableScale>
                  </View>
                </View>
              ) : null}
              {(() => {
                const hour = new Date().getHours();
                if (hour < PROGRAM_GEN_SAME_DAY_CUTOFF_HOUR) return null;
                const start = effectiveProgramStartIso();
                const [, m, d] = start.split('-');
                return (
                  <WizardHint tone="ok" surface={onHero ? 'hero' : 'surface'}>
                    {`Soir · 1ʳᵉ séance dès ${d}/${m}.`}
                  </WizardHint>
                );
              })()}
              <PrimaryButton
                label={generating ? 'Préparation…' : 'Voir mon programme'}
                disabled={!canGenerate || generating}
                onPress={finish}
              />
            </>
          ) : null}
        </View>
      ) : null}
    </>
  );

  const wizardFocus =
    selectedTemplate && selectedTemplate !== 'custom'
      ? programImageFocus(selectedTemplate.id)
      : COVER_CROP_CENTER;

  if (wizardBg) {
    return (
      <View style={styles.heroRoot}>
        <ProgramCreatedCelebration
          visible={Boolean(createdCelebration)}
          title={createdCelebration?.title ?? ''}
          subtitle={createdCelebration?.subtitle}
          onDone={() => {
            setCreatedCelebration(null);
            router.replace('/(tabs)/calendar');
          }}
        />
        <ImageBackground
          source={wizardBg}
          style={styles.heroBg}
          imageStyle={[styles.heroBgImage, coverCropImageStyle(wizardFocus)]}
          resizeMode="cover"
        >
          <View style={styles.heroScrim} pointerEvents="none" />
          <View style={styles.heroContent}>{wizardBody}</View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <Screen>
      <ProgramCreatedCelebration
        visible={Boolean(createdCelebration)}
        title={createdCelebration?.title ?? ''}
        subtitle={createdCelebration?.subtitle}
        onDone={() => {
          setCreatedCelebration(null);
          router.replace('/(tabs)/calendar');
        }}
      />
      {wizardBody}
    </Screen>
  );
}
function ProgramCard({
  prog,
  usageCount,
  onPress,
  index = 0,
}: {
  prog: TrainingProgramTemplate;
  usageCount?: number;
  onPress: () => void;
  index?: number;
}) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const sportTag = sportColor(prog.sportCategory, colors);
  const image = imageForProgram(prog.sportCategory, prog.id);
  const focus = programImageFocus(prog.id);
  return (
    <StaggerIn index={index} step={55} duration={520}>
      <PressableScale
        variant="nav"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={prog.title}
        style={styles.sportCardPress}
      >
        <SportCover
          source={image}
          height={128}
          minHeight={128}
          borderRadius={radii.lg}
          objectPosition={focus}
          scrim="rgba(7,17,31,0.28)"
          style={styles.progHero}
          contentStyle={styles.sportHeroContent}
        >
          <View style={styles.progHeroBody}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.progHeroTitle} numberOfLines={1}>
                {prog.title}
              </Text>
              <View style={[styles.sportBadge, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
                <Text style={[styles.sportBadgeText, { color: '#fff' }]}>
                  {POPULAR_SPORT_CATEGORIES.find((c) => c.id === prog.sportCategory)?.label ??
                    prog.sportCategory}
                </Text>
              </View>
            </View>
            <Text style={styles.progHeroSub} numberOfLines={2}>
              {prog.subtitle}
            </Text>
            {usageCount != null ? (
              <Text style={[styles.progUsage, { color: sportTag }]} numberOfLines={1}>
                {usageCountLabel(usageCount)} {usageCountCaption()}
              </Text>
            ) : null}
          </View>
          <Text style={styles.sportHeroChevron}>›</Text>
        </SportCover>
      </PressableScale>
    </StaggerIn>
  );
}

function sportColor(cat: ProgramSportCategory, colors: ColorPalette): string {
  const map: Record<ProgramSportCategory, string> = {
    run: DISCIPLINE_META.run.color,
    bike: DISCIPLINE_META.bike.color,
    swim: DISCIPLINE_META.swim.color,
    triathlon: DISCIPLINE_META.brick.color,
    strength: DISCIPLINE_META.strength.color,
    ironman: '#C45C26',
    other: colors.textMuted,
  };
  return map[cat];
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    heroRoot: { flex: 1, backgroundColor: colors.bgSecondary },
    heroBg: { flex: 1 },
    heroBgImage: {},
    heroScrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(7, 17, 31, 0.38)',
    },
    heroContent: {
      flex: 1,
      paddingTop: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      paddingHorizontal: spacing.md,
    },
    headerOnHero: {
      paddingHorizontal: spacing.md,
    },
    backBtn: {
      marginRight: spacing.xs,
      marginLeft: -6,
      paddingVertical: 2,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      flex: 1,
      color: colors.text,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingBottom: spacing.sm,
      flexGrow: 1,
    },
    stepMeta: { fontSize: 12 },
    stepTitle: { marginTop: 2, fontSize: 22 },
    footer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.bgSecondary,
      gap: spacing.sm,
    },
    footerOnHero: {
      backgroundColor: 'rgba(7, 17, 31, 0.92)',
      borderTopColor: 'rgba(255,255,255,0.12)',
    },
    multiProgramNotice: {
      gap: 8,
    },
    multiProgramAsk: {
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    modeRow: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
    },
    modeCard: {
      flex: 1,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.28)',
      backgroundColor: 'rgba(7, 17, 31, 0.88)',
      height: 76,
      minHeight: 76,
    },
    modeCardOn: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    modeCardInner: {
      flex: 1,
      height: '100%',
      paddingVertical: 12,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeTitle: {
      color: '#fff',
      fontWeight: '900',
      fontSize: 15,
      textAlign: 'center',
    },
    modeTitleOn: { color: '#fff' },
    modeSub: {
      marginTop: 4,
      color: 'rgba(255,255,255,0.7)',
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 14,
    },
    modeSubOn: { color: 'rgba(255,255,255,0.92)' },
    textOnHero: { color: '#fff', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 6 },
    titleOnHero: {
      color: '#fff',
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowRadius: 8,
    },
    bodyOnHero: {
      color: 'rgba(255,255,255,0.95)',
      textShadowColor: 'rgba(0,0,0,0.35)',
      textShadowRadius: 4,
    },
    mutedOnHero: {
      color: 'rgba(255,255,255,0.82)',
      textShadowColor: 'rgba(0,0,0,0.35)',
      textShadowRadius: 4,
    },
    inputOnHero: {
      backgroundColor: '#FFFFFF',
      borderColor: 'rgba(18, 32, 28, 0.18)',
      // Toujours sombre sur fond blanc — litible en mode clair et sombre
      color: '#12201C',
    },
    sportHero: {
      marginBottom: spacing.sm,
      width: '100%',
    },
    sportCardPress: {
      width: '100%',
      alignSelf: 'stretch',
    },
    sportHeroContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: spacing.md,
    },
    sportHeroText: { flex: 1, zIndex: 1, minWidth: 0 },
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
      lineHeight: 18,
    },
    sportHeroChevron: {
      fontSize: 26,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '300',
      zIndex: 1,
      marginLeft: spacing.sm,
      marginBottom: 2,
    },
    sportDot: { width: 12, height: 12, borderRadius: 6 },
    chevron: { fontSize: 22, color: colors.textMuted, fontWeight: '300' },
    search: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.bg,
      marginBottom: spacing.md,
      marginTop: spacing.sm,
    },
    progHero: {
      marginBottom: spacing.sm,
    },
    progHeroBody: { flex: 1, zIndex: 1 },
    progHeroTitle: { fontWeight: '800', color: '#fff', fontSize: 16 },
    progHeroSub: {
      color: 'rgba(255,255,255,0.86)',
      fontSize: 12,
      marginTop: 4,
      lineHeight: 17,
    },
    sportBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.sm,
    },
    sportBadgeText: { fontSize: 10, fontWeight: '800' },
    progUsage: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 6,
    },
    otherCard: {
      padding: spacing.md,
      marginTop: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      backgroundColor: colors.bg,
    },
    otherTitle: { fontWeight: '800', color: colors.text, fontSize: 15 },
    otherDesc: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.bg,
      marginTop: spacing.sm,
    },
    timeInputHero: {
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: 1,
      textAlign: 'center',
      paddingVertical: 18,
      borderRadius: 18,
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
    recapCard: {
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    recapTitle: { fontWeight: '800', fontSize: 17, color: colors.text },
    recapSub: { color: colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 },
    ongoingCard: {
      backgroundColor: colors.accentLight,
      borderColor: colors.accent,
    },
    ongoingBadge: {
      fontWeight: '800',
      fontSize: 17,
      color: colors.accentDark,
    },
    calcBox: {
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.accentLight,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    calcTitle: { fontWeight: '800', color: colors.accentDark, fontSize: 15 },
    calcSub: { color: colors.text, marginTop: 4, fontSize: 14, lineHeight: 20 },
  });
}

import { useMemo, useState, useEffect, useRef } from 'react';
import {
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { SPORT_HERO_IMAGES, SWIM_VENUE_IMAGES, CUSTOM_DISTANCE_IMAGES, customDistanceExample, customDistancePlaceholder, imageForProgram, programImageFocus } from '../../src/constants/sportVisuals';
import { NewProgramLabel } from '../../src/ui/brand/NewProgramLabel';
import { ProgramCreatedCelebration } from '../../src/ui/program/ProgramCreatedCelebration';
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
import { describePaceZoneSource, resolvePaceZones } from '../../src/engines/paceZones';
import { formatPace } from '../../src/engines/core';
import { formatDateSlashInput, formatRaceClockInput } from '../../src/utils/dateInput';
import { appAlert, appConfirm } from '../../src/utils/appAlert';
import { buildProgramPlan, type ProgramBuildInput } from '../../src/engines/programBuilder';
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
import {
  StrengthBodyFocusPicker,
  StrengthEquipmentPicker,
  StrengthGoalPicker,
} from '../../src/ui/onboarding/StrengthSetupFields';
import {
  Body,
  Chip,
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

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const VISIBLE_PROGRAM_COUNT = 5;

/** 0 sport · (+1 venue natation) · objectif · dispos · renforcement · temps · durée */
const BASE_STEP_COUNT = 6;

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
  if (Math.abs(km - 21.1) < 0.4) return 'semi-marathon (21,1 km)';
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
  /** Quand d’autres programmes sont actifs : répartir (défaut) ou superposer */
  const [scheduleModeChoice, setScheduleModeChoice] =
    useState<ProgramScheduleMode>('spread');

  const [trainingDays, setTrainingDays] = useState<number[]>(
    () => onboarding?.trainingDays?.length ? onboarding.trainingDays : [2, 4, 6],
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
  const [strengthGoal, setStrengthGoal] = useState<StrengthGoalFocus | null>(
    () => (onboarding?.strengthGoal as StrengthGoalFocus | undefined) ?? null,
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
  const isSwim = sport === 'swim';
  /** Décalage d’étapes : natation ajoute Piscine / Eau libre */
  const swimShift = isSwim ? 1 : 0;
  /** Musculation : 5 étapes (sport → setup → jours → niveau → semaines) */
  const STEP_COUNT = isStrength ? 5 : BASE_STEP_COUNT + swimShift;
  /** Index d’étape logique (indépendant du décalage natation) */
  const S = isStrength
    ? {
        sport: 0,
        venue: -1,
        program: -1,
        setup: 1,
        days: 2,
        ppg: -1,
        time: -1,
        level: 3,
        duration: 4,
      }
    : isSwim
      ? {
          sport: 0,
          venue: 1,
          program: 2,
          setup: -1,
          days: 3,
          ppg: 4,
          time: 5,
          level: -1,
          duration: 6,
        }
      : {
          sport: 0,
          venue: -1,
          program: 1,
          setup: -1,
          days: 2,
          ppg: 3,
          time: 4,
          level: -1,
          duration: 5,
        };
  const countedId = state.profile.programUsageCountedId;

  const filteredPrograms = useMemo(() => {
    const list = sport
      ? searchPrograms(search, sport, sport === 'swim' ? swimVenue ?? undefined : undefined)
      : [];
    return [...list].sort((a, b) => {
      const ca = usageCountForTemplate(a.id, countedId);
      const cb = usageCountForTemplate(b.id, countedId);
      return cb - ca || a.title.localeCompare(b.title, 'fr');
    });
  }, [search, sport, swimVenue, countedId]);
  const visiblePrograms = filteredPrograms.slice(0, VISIBLE_PROGRAM_COUNT);

  useEffect(() => {
    const raw = params.templateId;
    const id = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (!id) return;
    const prog = findProgramById(id);
    if (!prog) return;
    setSport(prog.sportCategory);
    setSelectedTemplate(prog);
    setStep(2);
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
    isStrength &&
    selectedTemplate !== null &&
    selectedTemplate !== 'custom'
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
        setStrengthSetupPhase('goal');
        setStep(strengthGoal ? 3 : 2);
      } else {
        setStrengthSetupPhase('equipment');
        setStep(2);
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

  const toggleDay = (d: number) => {
    setTrainingDays((prev) => {
      const next = prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d].sort();
      if (next.length && !next.includes(longRunDay)) {
        setLongRunDay(next[next.length - 1]);
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
      isStrength
        ? weeklyKm
        : profileWeeklyKm > 0
          ? profileWeeklyKm
          : Number(weeklyKmInput.replace(',', '.')) || 20;

    if (!isStrength && profileWeeklyKm <= 0) {
      const ok = await appConfirm(
        'Volume estimé',
        `Aucun volume hebdo dans votre profil — le plan utilisera ${effectiveWeeklyKm} km/sem. Continuer ?`,
        'Générer quand même',
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
      await warnThenCommit(mode);
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
      customWeeks: isStrength
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
      weeklyKmAvg: weeklyKm,
      recentTimeSec: parsedTimeSec ?? undefined,
      recentDistanceKm: parsedTimeSec ? refDistanceKm : undefined,
      includePpg: isStrength ? false : includePpg,
      ongoing: isStrength ? strengthDurationMode === 'ongoing' : undefined,
      strengthEquipment:
        isStrength && strengthEquipment.length > 0 ? strengthEquipment : undefined,
      strengthGoal: isStrength ? strengthGoal ?? undefined : undefined,
      strengthBodyFocus: isStrength ? strengthBodyFocus ?? undefined : undefined,
      isPremium: true,
    };
  }

  const summaryTitle = isStrength
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

  const stepTitles = isStrength
    ? [
        'Quel sport ?',
        'Quel est ton objectif principal ?',
        'Vos disponibilités',
        'Votre niveau',
        'Durée en semaines',
      ]
    : isSwim
      ? [
          'Quel sport ?',
          'Piscine ou eau libre ?',
          'Quelle distance ?',
          'Vos disponibilités',
          'Renforcement musculaire',
          `Votre temps sur ${distanceQuestion}`,
          'Durée du programme',
        ]
      : [
          'Quel sport ?',
          'Quel objectif ?',
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
    step === S.setup && isStrength ? strengthStep2Title : stepTitles[step];

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
    step === S.days ||
    step === S.ppg ||
    (step === S.program && selectedTemplate === 'custom') ||
    (isStrength && step === S.level) ||
    (isStrength && step === S.setup) ||
    (isSwim && step === S.venue && Boolean(swimVenue));
  const showSkip = step === S.time && !isStrength;
  const showGenerate = step === S.duration;

  const canContinue =
    step === S.setup && isStrength
      ? strengthSetupPhase === 'equipment'
        ? strengthEquipment.length >= 1
        : strengthSetupPhase === 'goal'
          ? Boolean(strengthGoal)
          : Boolean(strengthBodyFocus)
      : step === S.days
        ? trainingDays.length >= 2
        : step === S.ppg
          ? true
          : step === S.level && isStrength
            ? true
            : step === S.program && selectedTemplate === 'custom'
              ? parseDistanceKm(customDistance) != null
              : isSwim && step === S.venue
                ? Boolean(swimVenue)
                : false;

  const canGenerate =
    Boolean(selectedTemplate) &&
    (isStrength || durationMode === 'weeks' || Boolean(parsedRaceDate));

  /** Fond programme dès l’étape 3 (index 2) — image du programme choisi, nette. */
  const wizardBg = useMemo(() => {
    if (step < S.days || !sport) return null;
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
        <Pressable
          onPress={onHeaderBack}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityLabel={step <= 0 ? 'Fermer' : 'Retour'}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={28} color={onHero ? '#fff' : colors.text} />
        </Pressable>
        <NewProgramLabel
          color={onHero ? '#fff' : colors.text}
          size={22}
          style={styles.headerTitle}
        />
      </View>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: onHero ? spacing.md : 0 }}>
        <Muted style={onHero ? styles.mutedOnHero : undefined}>
          Étape {step + 1} / {STEP_COUNT}
        </Muted>
        <Title style={[{ marginTop: 4 }, onHero && styles.titleOnHero]}>{displayTitle}</Title>

        {step === 0 && (
          <>
            <Body style={{ marginTop: 8, marginBottom: spacing.md }}>
              Touchez une discipline — passage automatique à l&apos;étape suivante.
            </Body>
            {POPULAR_SPORT_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => selectSport(cat.id)}
                accessibilityRole="button"
                accessibilityLabel={cat.label}
              >
                <ImageBackground
                  source={SPORT_HERO_IMAGES[cat.id]}
                  style={styles.sportHero}
                  imageStyle={styles.sportHeroImage}
                  resizeMode="cover"
                >
                  <View style={styles.sportHeroScrim} />
                  <View style={styles.sportHeroText}>
                    <Text style={styles.sportHeroLabel}>{cat.label}</Text>
                    <Text style={styles.sportHeroDesc}>{cat.desc}</Text>
                  </View>
                  <Text style={styles.sportHeroChevron}>›</Text>
                </ImageBackground>
              </Pressable>
            ))}
            <Pressable
              onPress={() => selectSport('other')}
              accessibilityRole="button"
              accessibilityLabel="Duathlon sprint"
            >
              <ImageBackground
                source={SPORT_HERO_IMAGES.other}
                style={styles.sportHero}
                imageStyle={styles.sportHeroImage}
                resizeMode="cover"
              >
                <View style={styles.sportHeroScrim} />
                <View style={styles.sportHeroText}>
                  <Text style={styles.sportHeroLabel}>Duathlon sprint</Text>
                  <Text style={styles.sportHeroDesc}>Course · vélo · course — biathlon inclus</Text>
                </View>
                <Text style={styles.sportHeroChevron}>›</Text>
              </ImageBackground>
            </Pressable>
          </>
        )}

        {step === S.venue && isSwim && (
          <>
            <Body style={{ marginTop: 8, marginBottom: spacing.md }}>
              Choisis ton environnement — les distances et chronos s&apos;adaptent.
            </Body>
            <Pressable
              onPress={() => selectSwimVenue('pool')}
              accessibilityRole="button"
              accessibilityLabel="Piscine"
            >
              <ImageBackground
                source={SWIM_VENUE_IMAGES.pool}
                style={[
                  styles.sportHero,
                  swimVenue === 'pool' && { borderWidth: 2, borderColor: colors.accent },
                ]}
                imageStyle={styles.sportHeroImage}
                resizeMode="cover"
              >
                <View style={styles.sportHeroScrim} />
                <View style={styles.sportHeroText}>
                  <Text style={styles.sportHeroLabel}>Piscine</Text>
                  <Text style={styles.sportHeroDesc}>
                    50 · 100 · 200 · 400 · 800 · 1500 m nage libre
                  </Text>
                </View>
                <Text style={styles.sportHeroChevron}>›</Text>
              </ImageBackground>
            </Pressable>
            <Pressable
              onPress={() => selectSwimVenue('open_water')}
              accessibilityRole="button"
              accessibilityLabel="Eau libre"
            >
              <ImageBackground
                source={SWIM_VENUE_IMAGES.open_water}
                style={[
                  styles.sportHero,
                  swimVenue === 'open_water' && { borderWidth: 2, borderColor: colors.accent },
                ]}
                imageStyle={styles.sportHeroImage}
                resizeMode="cover"
              >
                <View style={styles.sportHeroScrim} />
                <View style={styles.sportHeroText}>
                  <Text style={styles.sportHeroLabel}>Eau libre</Text>
                  <Text style={styles.sportHeroDesc}>
                    1 · 2 · 5 km open water — orientation & endurance
                  </Text>
                </View>
                <Text style={styles.sportHeroChevron}>›</Text>
              </ImageBackground>
            </Pressable>
          </>
        )}

        {step === S.program && sport && (
          <>
            {isSwim && swimVenue ? (
              <Muted style={{ marginBottom: spacing.sm }}>
                {swimVenue === 'pool' ? 'Distances piscine (World Aquatics)' : 'Distances eau libre'}
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
            {visiblePrograms.map((prog) => (
              <ProgramCard
                key={prog.id}
                prog={prog}
                usageCount={usageCountForTemplate(prog.id, countedId)}
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
              ? filteredPrograms.slice(VISIBLE_PROGRAM_COUNT).map((prog) => (
                  <ProgramCard
                    key={prog.id}
                    prog={prog}
                    usageCount={usageCountForTemplate(prog.id, countedId)}
                    onPress={() => selectProgram(prog)}
                  />
                ))
              : null}
            <Pressable style={styles.otherCard} onPress={selectCustom}>
              <Text style={styles.otherTitle}>Distance sur mesure</Text>
              <Text style={styles.otherDesc}>{customDistanceExample(sport)}</Text>
            </Pressable>
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
          </>
        )}

        {step === S.setup && isStrength && strengthSetupPhase === 'equipment' && (
          <StrengthEquipmentPicker
            selected={strengthEquipment}
            onToggle={toggleStrengthEquipment}
          />
        )}

        {step === S.setup && isStrength && strengthSetupPhase === 'goal' && (
          <StrengthGoalPicker selected={strengthGoal} onSelect={setStrengthGoal} />
        )}

        {step === S.setup && isStrength && strengthSetupPhase === 'focus' && (
          <StrengthBodyFocusPicker
            selected={strengthBodyFocus}
            onSelect={setStrengthBodyFocus}
          />
        )}

        {step === S.days && !isStrength && (
          <>
            <Body style={[{ marginTop: 8 }, onHero && styles.bodyOnHero]}>
              Indiquez vos jours possibles. L&apos;algorithme planifie des séances espacées
              avec des jours de repos — même si vous cochez toute la semaine.
            </Body>
            <Body style={[{ marginTop: spacing.md }, onHero && styles.bodyOnHero]}>
              Jours d&apos;entraînement
            </Body>
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
            <Muted style={[{ marginTop: 4 }, onHero && styles.mutedOnHero]}>
              {trainingDays.length} jour{trainingDays.length > 1 ? 's' : ''} par semaine
            </Muted>
            <Body style={[{ marginTop: spacing.md }, onHero && styles.bodyOnHero]}>
              Jour de la sortie longue
            </Body>
            <View style={styles.row}>
              {DAYS.map((label, i) => (
                <Chip
                  key={`long-${label}`}
                  label={label}
                  selected={longRunDay === i}
                  onPress={() => {
                    setLongRunDay(i);
                    if (!trainingDays.includes(i)) {
                      setTrainingDays((prev) => [...prev, i].sort());
                    }
                  }}
                />
              ))}
            </View>
          </>
        )}

        {step === S.days && isStrength && (
          <>
            <Body style={[{ marginTop: 8 }, onHero && styles.bodyOnHero]}>
              {strengthBodyFocus === 'upper'
                ? 'Choisis tes jours : les séances cibleront le haut du corps (variantes push / pull).'
                : strengthBodyFocus === 'lower'
                  ? 'Choisis tes jours : les séances cibleront le bas du corps.'
                  : 'Choisis tes jours. Avec 3 jours → full body. Avec 4 → haut/bas. Avec 5–6 → push / pull / legs.'}
            </Body>
            <Body style={[{ marginTop: spacing.md }, onHero && styles.bodyOnHero]}>
              Jours d&apos;entraînement
            </Body>
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
            <Muted style={[{ marginTop: 4 }, onHero && styles.mutedOnHero]}>
              {trainingDays.length} séance{trainingDays.length > 1 ? 's' : ''} / semaine
            </Muted>
          </>
        )}

        {step === S.ppg && !isStrength && (
          <>
            <Body style={[{ marginTop: 8 }, onHero && styles.bodyOnHero]}>
              Ajouter du renforcement musculaire à votre programme ?
            </Body>
            <View style={styles.row}>
              <Chip
                label="Oui"
                selected={includePpg}
                onPress={() => setIncludePpg(true)}
              />
              <Chip label="Non" selected={!includePpg} onPress={() => setIncludePpg(false)} />
            </View>
            {profileWeeklyKm > 0 ? (
              <Muted style={[{ marginTop: spacing.md, lineHeight: 18 }, onHero && styles.mutedOnHero]}>
                Volume profil : {profileWeeklyKm} km/sem · niveau{' '}
                {derivedLevel === 'debutant'
                  ? 'débutant'
                  : derivedLevel === 'confirme'
                    ? 'confirmé'
                    : 'intermédiaire'}
              </Muted>
            ) : (
              <Muted
                style={[
                  { marginTop: spacing.md, lineHeight: 18 },
                  onHero ? styles.mutedOnHero : { color: colors.danger },
                ]}
              >
                Volume profil non renseigné — un défaut de 20 km/sem sera utilisé à la
                génération (modifiable ensuite).
              </Muted>
            )}
          </>
        )}

        {step === S.level && isStrength && (
          <>
            <Body style={[{ marginTop: 8 }, onHero && styles.bodyOnHero]}>
              Quel est ton niveau en musculation ? Cela ajuste le nombre de séries.
            </Body>
            <View style={styles.row}>
              {(
                [
                  ['debutant', 'Débutant'],
                  ['intermediaire', 'Intermédiaire'],
                  ['confirme', 'Confirmé'],
                ] as const
              ).map(([id, label]) => (
                <Chip
                  key={id}
                  label={label}
                  selected={strengthLevel === id}
                  onPress={() => setStrengthLevel(id)}
                />
              ))}
            </View>
            <Muted style={[{ marginTop: spacing.md, lineHeight: 20 }, onHero && styles.mutedOnHero]}>
              Masse : 8 à 12 répétitions · Force : 3 à 5 · Tonifier : 12 à 15. Chaque
              exercice indique le mouvement clairement (ex. « Développé haltères sur banc »).
            </Muted>
          </>
        )}

        {step === S.time && !isStrength && (
          <>
            <Body style={[{ marginTop: spacing.md }, onHero && styles.bodyOnHero]}>
              Quel est votre temps sur {distanceQuestion} ?
            </Body>
            <Muted style={[{ marginTop: 6, lineHeight: 20 }, onHero && styles.mutedOnHero]}>
              {raceTimeInput.trim()
                ? 'Chrono déjà connu — valide-le ou modifie-le.'
                : isSwim
                  ? 'Indique ton chrono bassin (départ plongeoir ou poussée). Le 100 m nage libre est la distance la plus utilisée en club.'
                  : 'Donnez une valeur approximative, ou le chrono exact d’un temps récent.'}
            </Muted>
            <AppTextInput
              style={[styles.input, onHero && styles.inputOnHero]}
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
              <Muted style={[{ marginTop: 4 }, onHero && styles.mutedOnHero]}>
                Allure moyenne : {formatPace(parsedTimeSec / refDistanceKm)} · VMA
                estimée : {vmaFromRaceTime(refDistanceKm, parsedTimeSec).toFixed(1)} km/h
              </Muted>
            ) : raceTimeInput.trim() ? (
              <Muted style={{ color: colors.danger }}>
                Format : tape les chiffres (ex. 1530 → 15:30)
              </Muted>
            ) : (
              <Muted style={[{ marginTop: spacing.sm, lineHeight: 20 }, onHero && styles.mutedOnHero]}>
                Pas de chrono ? L&apos;application estime vos allures via votre volume (
                {weeklyKm > 0 ? `${weeklyKm} km/sem` : 'profil'}
                ), votre niveau
                {state.activities.length > 0 ? ' et vos activités enregistrées' : ''} — VMA
                estimée : {Number(inferredZones.vmaKmh).toFixed(1)} km/h (
                {describePaceZoneSource(inferredZones.source)}).
              </Muted>
            )}
          </>
        )}

        {step === S.duration && isStrength && (
          <>
            <Body style={[{ marginTop: 8 }, onHero && styles.bodyOnHero]}>
              Combien de semaines dure ton cycle de musculation ?
            </Body>
            <View style={styles.row}>
              <Chip
                label="Nombre de semaines"
                selected={strengthDurationMode === 'weeks'}
                onPress={() => setStrengthDurationMode('weeks')}
              />
              <Chip
                label="Sans date de fin"
                selected={strengthDurationMode === 'ongoing'}
                onPress={() => setStrengthDurationMode('ongoing')}
              />
            </View>

            {strengthDurationMode === 'weeks' ? (
              <>
                <Muted style={[{ marginTop: spacing.sm }, onHero && styles.mutedOnHero]}>
                  Recommandé : {defaultRecWeeks} semaines
                </Muted>
                <View style={styles.row}>
                  {strengthWeekPresets.map((w) => (
                    <Chip
                      key={w}
                      label={`${w} semaines`}
                      selected={(manualWeeks ?? defaultRecWeeks) === w}
                      onPress={() => setManualWeeks(w)}
                    />
                  ))}
                </View>
              </>
            ) : (
              <View style={[styles.recapCard, styles.ongoingCard, { marginTop: spacing.md }]}>
                <Text style={styles.ongoingBadge}>Sans date de fin</Text>
                <Muted style={{ marginTop: 6, lineHeight: 20 }}>
                  Le programme continue semaine après semaine jusqu&apos;à ce que tu
                  l&apos;annules. Les séances restent adaptées à ton matériel et ton focus.
                </Muted>
              </View>
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
          </>
        )}

        {step === S.duration && !isStrength && (
          <>
            <Body style={[{ marginTop: 8 }, onHero && styles.bodyOnHero]}>
              Durée de préparation ou date de votre objectif.
            </Body>
            <View style={styles.row}>
              <Chip
                label="Nombre de semaines"
                selected={durationMode === 'weeks'}
                onPress={() => setDurationMode('weeks')}
              />
              <Chip
                label="Date de la course"
                selected={durationMode === 'date'}
                onPress={() => setDurationMode('date')}
              />
            </View>

            {durationMode === 'weeks' ? (
              <>
                <Muted style={[{ marginTop: spacing.sm }, onHero && styles.mutedOnHero]}>
                  Recommandé : {defaultRecWeeks} semaines
                </Muted>
                <View style={styles.row}>
                  {weekPresets.map((w) => (
                    <Chip
                      key={w}
                      label={`${w} sem.`}
                      selected={(manualWeeks ?? defaultRecWeeks) === w}
                      onPress={() => setManualWeeks(w)}
                    />
                  ))}
                </View>
              </>
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
                  <View style={styles.calcBox}>
                    <Text style={styles.calcTitle}>
                      {formatRaceDateFr(parsedRaceDate)}
                    </Text>
                    <Text style={styles.calcSub}>
                      {weeksUntilDate(parsedRaceDate)} sem. restantes → plan de{' '}
                      {durationResolved.weeks} semaines
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </>
        )}

        <View style={styles.nav}>
          <View style={{ flex: 1 }} />
          {showContinue ? (
            <View style={styles.navBtn}>
              <PrimaryButton
                label="Continuer"
                disabled={!canContinue}
                onPress={advanceStep}
              />
            </View>
          ) : null}
          {showSkip ? (
            <View style={styles.navBtn}>
              {parsedTimeSec ? (
                <PrimaryButton label="Continuer" onPress={() => setStep(S.duration)} />
              ) : (
                <SecondaryButton
                  label="Passer sans chrono"
                  onPress={() => setStep(S.duration)}
                />
              )}
            </View>
          ) : null}
          {showGenerate ? (
            <View style={styles.navBtn}>
              {activePrograms.length > 0 ? (
                <View style={styles.multiProgramNotice}>
                  <Muted style={onHero ? styles.mutedOnHero : undefined}>
                    {activePrograms.length === 1
                      ? `Un programme est déjà actif (« ${activePrograms[0].title} »). Comment placer le nouveau ?`
                      : `${activePrograms.length} programmes déjà actifs. Comment placer le nouveau ?`}
                  </Muted>
                  <View style={[styles.row, { marginTop: spacing.sm }]}>
                    <Chip
                      label="Répartir"
                      selected={scheduleModeChoice === 'spread'}
                      onPress={() => setScheduleModeChoice('spread')}
                    />
                    <Chip
                      label="Superposer"
                      selected={scheduleModeChoice === 'stack'}
                      onPress={() => setScheduleModeChoice('stack')}
                    />
                  </View>
                  <Muted
                    style={[
                      { marginTop: spacing.xs, fontSize: 12, lineHeight: 17 },
                      onHero ? styles.mutedOnHero : undefined,
                    ]}
                  >
                    {scheduleModeChoice === 'spread'
                      ? 'Répartir : autres jours, avec des repos entre courses dures et renfos (pas tous les jours).'
                      : 'Superposer : mêmes jours si possible (séances allégées) ; on décale si deux dures se suivent.'}
                  </Muted>
                </View>
              ) : null}
              <PrimaryButton
                label={generating ? 'Génération…' : 'Générer mon programme'}
                disabled={!canGenerate || generating}
                onPress={finish}
              />
            </View>
          ) : null}
        </View>
      </AppScrollView>
    </>
  );

  const wizardFocus =
    selectedTemplate && selectedTemplate !== 'custom'
      ? programImageFocus(selectedTemplate.id)
      : '50% 40%';

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
          imageStyle={[
            styles.heroBgImage,
            Platform.OS === 'web'
              ? ({ objectPosition: wizardFocus, objectFit: 'cover' } as object)
              : null,
          ]}
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
}: {
  prog: TrainingProgramTemplate;
  usageCount?: number;
  onPress: () => void;
}) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const sportTag = sportColor(prog.sportCategory, colors);
  const image = imageForProgram(prog.sportCategory, prog.id);
  const focus = programImageFocus(prog.id);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={prog.title}>
      <ImageBackground
        source={image}
        style={styles.progHero}
        imageStyle={[
          styles.progHeroImage,
          Platform.OS === 'web'
            ? ({ objectPosition: focus, objectFit: 'cover' } as object)
            : null,
        ]}
        resizeMode="cover"
      >
        <View style={styles.progHeroScrim} />
        <View style={styles.progHeroBody}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={styles.progHeroTitle}>{prog.title}</Text>
            <View style={[styles.sportBadge, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
              <Text style={[styles.sportBadgeText, { color: '#fff' }]}>
                {POPULAR_SPORT_CATEGORIES.find((c) => c.id === prog.sportCategory)?.label ??
                  prog.sportCategory}
              </Text>
            </View>
          </View>
          <Text style={styles.progHeroSub}>{prog.subtitle}</Text>
          {usageCount != null ? (
            <Text style={[styles.progUsage, { color: sportTag }]}>
              {usageCountLabel(usageCount)} {usageCountCaption()}
            </Text>
          ) : null}
        </View>
        <Text style={styles.sportHeroChevron}>›</Text>
      </ImageBackground>
    </Pressable>
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
      paddingTop: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    headerOnHero: {
      paddingHorizontal: spacing.md,
    },
    backBtn: {
      marginRight: spacing.xs,
      marginLeft: -6,
      paddingVertical: 4,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      flex: 1,
      color: colors.text,
    },
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
      minHeight: 168,
      marginBottom: spacing.sm,
      borderRadius: radii.lg,
      overflow: 'hidden',
      justifyContent: 'flex-end',
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    sportHeroImage: { borderRadius: radii.lg },
    sportHeroScrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(7, 17, 31, 0.22)',
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
      minHeight: 128,
      marginBottom: spacing.sm,
      borderRadius: radii.lg,
      overflow: 'hidden',
      justifyContent: 'flex-end',
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    progHeroImage: { borderRadius: radii.lg },
    progHeroScrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(7,17,31,0.28)',
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
    nav: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.xl,
      alignItems: 'stretch',
      justifyContent: 'flex-end',
    },
    navBtn: {
      flexGrow: 1,
      flexBasis: 120,
      minWidth: 120,
    },
    multiProgramNotice: {
      marginBottom: spacing.sm,
      paddingVertical: spacing.xs,
    },
  });
}

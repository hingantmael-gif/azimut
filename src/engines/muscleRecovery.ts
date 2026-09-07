import type { OnboardingAnswers, PlannedWorkout, RpeFeedback, StravaActivity } from '../types/domain';
import { analyzeSessionMuscles } from './sportSessionAnalysis';

/** États de récupération — modèle inspiré Arvo / Built (4 états discrets + %) */
export type MuscleRecoveryLevel = 'fresh' | 'recovering' | 'fatigued' | 'strained';

export type MuscleGroupId =
  | 'neck'
  | 'traps'
  | 'deltoids'
  | 'chest'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'lats'
  | 'erector'
  | 'glutes'
  | 'hip_flexors'
  | 'quads'
  | 'hamstrings'
  | 'calves';

export interface MuscleGroupState {
  id: MuscleGroupId;
  label: string;
  level: MuscleRecoveryLevel;
  recoveryPct: number;
  /** Pourcentage exact (décimal) — pour animations / ticks horaires */
  recoveryPctExact: number;
  hoursToFresh: number;
  /** Minutes restantes avant fraîcheur (plus précis que heures seules) */
  minutesToFresh: number;
  lastTrainedAt?: string;
  recommendation: string;
  trainingLoad: 'normal' | 'moderate' | 'light' | 'rest';
  /** Charge du muscle lors de la dernière séance (0–1) — pour le classement dynamique */
  recentSessionLoad: number;
  /** Points de récupération gagnés depuis la dernière séance (0–100) */
  recoveredSinceSessionPct: number;
  /** Détail d’analyse (sport, intensité, repos conseillé) */
  analysisDetail?: string;
  restHoursRecommended?: number;
}

export const MUSCLE_RECOVERY_META: Record<
  MuscleRecoveryLevel,
  {
    label: string;
    color: string;
    description: string;
    trainingLoad: MuscleGroupState['trainingLoad'];
  }
> = {
  fresh: {
    label: 'Récupéré',
    color: '#16A34A',
    description: 'Récupération ≥ 85 % — entraînement normal possible.',
    trainingLoad: 'normal',
  },
  recovering: {
    label: 'Récupération active',
    color: '#CA8A04',
    description: 'Récupération 65–84 % — volume modéré recommandé.',
    trainingLoad: 'moderate',
  },
  fatigued: {
    label: 'Fatigue résiduelle',
    color: '#EA580C',
    description: 'Récupération 35–64 % — séance légère ou technique uniquement.',
    trainingLoad: 'light',
  },
  strained: {
    label: 'Surcharge',
    color: '#DC2626',
    description: 'Récupération < 35 % — repos actif ou sport très léger.',
    trainingLoad: 'rest',
  },
};

/**
 * τ (heures) — demi-vie effective de la fatigue musculaire locale.
 * Course/excentrique : quads/ischios plus longs ; mollets plus rapides ;
 * natation (haut du corps) τ intermédiaires.
 */
const MUSCLE_TAU_H: Record<MuscleGroupId, number> = {
  neck: 30,
  traps: 40,
  deltoids: 44,
  chest: 46,
  biceps: 34,
  triceps: 36,
  forearms: 28,
  abs: 32,
  obliques: 34,
  lats: 50,
  erector: 58,
  glutes: 56,
  hip_flexors: 44,
  quads: 72,
  hamstrings: 68,
  calves: 40,
};

/** Libellés anatomiques (noms de muscles) */
const MUSCLE_LABELS: Record<MuscleGroupId, string> = {
  neck: 'Cou',
  traps: 'Trapèzes',
  deltoids: 'Deltoïdes',
  chest: 'Pectoraux',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Avant-bras',
  abs: 'Abdos',
  obliques: 'Obliques',
  lats: 'Grand dorsal',
  erector: 'Lombaires',
  glutes: 'Fessiers',
  hip_flexors: 'Fléchisseurs de hanche',
  quads: 'Quadriceps',
  hamstrings: 'Ischio-jambiers',
  calves: 'Mollets',
};

/** Groupes trop techniques / peu utiles à afficher dans l’onglet Corps */
const HIDDEN_BODY_MUSCLES = new Set<MuscleGroupId>(['forearms']);

const ALL_MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroupId[];

export function isBodyUiMuscle(id: MuscleGroupId): boolean {
  return !HIDDEN_BODY_MUSCLES.has(id);
}
function levelFromPct(pct: number): MuscleRecoveryLevel {
  if (pct >= 85) return 'fresh';
  if (pct >= 65) return 'recovering';
  if (pct >= 35) return 'fatigued';
  return 'strained';
}

function hoursToFreshExact(pctExact: number, tau: number): number {
  if (pctExact >= 95) return 0;
  const fatigue = 100 - pctExact;
  return tau * Math.log(100 / Math.max(fatigue, 5));
}

function recommendation(level: MuscleRecoveryLevel, label: string, hoursExact: number): string {
  const meta = MUSCLE_RECOVERY_META[level];
  if (hoursExact <= 0) return `${label} : ${meta.description}`;
  return `${label} : ${meta.description} Estimation : ${formatRecoveryEta(hoursExact)} avant récupération complète.`;
}

/** Affiche « 3 h », « 1 h 20 », « 45 min » selon le reste */
export function formatRecoveryEta(hoursExact: number): string {
  if (hoursExact <= 0) return 'prêt';
  const totalMin = Math.max(1, Math.round(hoursExact * 60));
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m.toString().padStart(2, '0')}`;
}

interface MuscleAccum {
  load: number;
  lastAt?: string;
  lastImpulse: number;
  lastSportHint?: string;
  /** Charge juste après la dernière séance (sans décroissance) pour mesurer le gain */
  lastImpulseAtSession: number;
}

/**
 * Agrège 7 jours d’activités avec analyse multi-sport + décroissance
 * exponentielle par muscle (impulse-response).
 * `nowMs` permet de recalculer la progression minute par minute.
 */
export function computeMuscleStates(
  input: {
    activities: StravaActivity[];
    feedbacks: RpeFeedback[];
    plan: PlannedWorkout[];
    onboarding?: OnboardingAnswers;
  },
  nowMs: number = Date.now(),
): MuscleGroupState[] {
  const now = nowMs;
  const acc = new Map<MuscleGroupId, MuscleAccum>(
    ALL_MUSCLES.map((id) => [id, { load: 0, lastImpulse: 0, lastImpulseAtSession: 0 }]),
  );

  const sorted = [...input.activities].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  for (const activity of sorted) {
    const at = new Date(activity.startDate).getTime();
    const hoursSince = (now - at) / 3600000;
    if (hoursSince > 180 || hoursSince < -1) continue;

    const planned = input.plan.find((p) => p.date === activity.startDate.slice(0, 10));
    const analysis = analyzeSessionMuscles(activity, planned, {
      onboarding: input.onboarding,
      recentActivities: input.activities,
    });

    for (const [muscle, impulseRaw] of Object.entries(analysis.muscleImpulse)) {
      const muscleId = muscle as MuscleGroupId;
      const impulse = impulseRaw ?? 0;
      if (impulse <= 0) continue;
      const tau = MUSCLE_TAU_H[muscleId];
      // Dommage excentrique : décroissance un peu plus lente les 48 premières heures
      const eccSlow =
        analysis.eccentricFactor >= 1.25 && hoursSince < 48
          ? tau * (1 + (analysis.eccentricFactor - 1) * 0.25)
          : tau;
      const decayed = impulse * Math.exp(-hoursSince / eccSlow);
      const cur = acc.get(muscleId)!;
      const isLatest =
        !cur.lastAt || at >= new Date(cur.lastAt).getTime();
      acc.set(muscleId, {
        load: Math.min(99, cur.load + decayed),
        lastAt: isLatest ? activity.startDate : cur.lastAt,
        lastImpulse: isLatest ? decayed : cur.lastImpulse,
        lastImpulseAtSession: isLatest ? impulse : cur.lastImpulseAtSession,
        lastSportHint: isLatest ? analysis.summary : cur.lastSportHint,
      });
    }
  }

  const lastFb = input.feedbacks[input.feedbacks.length - 1];
  if (lastFb) {
    const hSince = (now - new Date(lastFb.submittedAt).getTime()) / 3600000;
    if (hSince < 72) {
      const painBoost =
        lastFb.muscle === 'douleur_ciblee' ? 28 : lastFb.muscle === 'courbatures' ? 14 : 0;
      const rpeBoost = lastFb.rpe >= 8 ? 12 : lastFb.rpe >= 6 ? 6 : 0;
      const boost = painBoost + rpeBoost;
      if (boost > 0) {
        const top = [...acc.entries()]
          .sort((a, b) => b[1].lastImpulseAtSession - a[1].lastImpulseAtSession)
          .slice(0, 6)
          .map(([id]) => id);
        const targets =
          top.length > 0
            ? top
            : (['quads', 'hamstrings', 'calves', 'glutes'] as MuscleGroupId[]);
        for (const m of targets) {
          const cur = acc.get(m)!;
          acc.set(m, { ...cur, load: Math.min(98, cur.load + boost * 0.85) });
        }
      }
    }
  }

  return ALL_MUSCLES.map((id) => {
    const { load, lastAt, lastImpulse, lastImpulseAtSession, lastSportHint } = acc.get(id)!;
    const recoveryPctExact = Math.max(2, Math.min(100, 100 - load));
    const recoveryPct = Math.round(recoveryPctExact);
    const level = levelFromPct(recoveryPctExact);
    const tau = MUSCLE_TAU_H[id];
    const hFreshExact = hoursToFreshExact(recoveryPctExact, tau);
    const hFresh = Math.round(hFreshExact);
    const minutesToFresh = Math.max(0, Math.round(hFreshExact * 60));
    const recoveredSinceSessionPct =
      lastImpulseAtSession > 0
        ? Math.round(
            Math.max(
              0,
              Math.min(100, ((lastImpulseAtSession - lastImpulse) / lastImpulseAtSession) * 100),
            ),
          )
        : 0;
    const restHoursRecommended =
      level === 'strained'
        ? Math.max(hFresh, 48)
        : level === 'fatigued'
          ? Math.max(hFresh, 24)
          : hFresh;

    const detailParts = [
      lastSportHint ? `Dernière charge : ${lastSportHint}` : null,
      restHoursRecommended > 0
        ? `Repos conseillé ≈ ${formatRecoveryEta(restHoursRecommended)} avant charge élevée`
        : 'Prêt pour une charge normale',
      recoveredSinceSessionPct > 0
        ? `+${recoveredSinceSessionPct} % récupérés depuis la séance`
        : null,
    ].filter(Boolean);

    return {
      id,
      label: MUSCLE_LABELS[id],
      level,
      recoveryPct,
      recoveryPctExact,
      hoursToFresh: hFresh,
      minutesToFresh,
      lastTrainedAt: lastAt,
      recommendation: recommendation(level, MUSCLE_LABELS[id], hFreshExact),
      trainingLoad: MUSCLE_RECOVERY_META[level].trainingLoad,
      recentSessionLoad: Math.min(1, lastImpulseAtSession / 85),
      recoveredSinceSessionPct,
      analysisDetail: detailParts.join('. '),
      restHoursRecommended,
    };
  });
}

/** Score global + résumé de la dernière analyse séance */
export function bodyAnalysisDigest(
  input: {
    activities: StravaActivity[];
    feedbacks: RpeFeedback[];
    plan: PlannedWorkout[];
    onboarding?: OnboardingAnswers;
  },
  nowMs: number = Date.now(),
): {
  readiness: ReturnType<typeof overallReadiness>;
  lastSessionSummary: string;
  topStressed: string[];
} {
  const states = computeMuscleStates(input, nowMs);
  const readiness = overallReadiness(states);
  const latest = [...input.activities].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  )[0];
  let lastSessionSummary = 'Importez une séance pour une analyse musculaire détaillée.';
  if (latest) {
    const planned = input.plan.find((p) => p.date === latest.startDate.slice(0, 10));
    lastSessionSummary = analyzeSessionMuscles(latest, planned, {
      onboarding: input.onboarding,
      recentActivities: input.activities,
    }).summary;
  }
  const topStressed = sortMusclesBySolicitation(states)
    .filter((m) => isBodyUiMuscle(m.id) && m.recoveryPct < 85)
    .slice(0, 4)
    .map((m) => `${m.label} (${m.recoveryPct} %)`);
  return { readiness, lastSessionSummary, topStressed };
}

/** Classement dynamique — muscles les plus sollicités en premier (liste Corps) */
export function sortMusclesBySolicitation(states: MuscleGroupState[]): MuscleGroupState[] {
  return [...states]
    .filter((m) => isBodyUiMuscle(m.id))
    .sort((a, b) => {
      const scoreA = 100 - a.recoveryPct + a.recentSessionLoad * 60;
      const scoreB = 100 - b.recoveryPct + b.recentSessionLoad * 60;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.recoveryPct - b.recoveryPct;
    });
}

export function overallReadiness(states: MuscleGroupState[]): {
  score: number;
  label: string;
  summary: string;
} {
  if (states.length === 0) {
    return { score: 100, label: 'Optimal', summary: 'Aucune charge récente détectée.' };
  }
  const avg = Math.round(
    states.reduce((s, m) => s + (m.recoveryPctExact ?? m.recoveryPct), 0) / states.length,
  );
  const strained = states.filter((m) => m.level === 'strained').length;
  const label =
    avg >= 85 ? 'Prêt à performer' : avg >= 65 ? 'Entraînement modéré' : avg >= 45 ? 'Gérer la charge' : 'Prioriser la récupération';
  const summary =
    strained > 0
      ? `${strained} groupe(s) en surcharge — planifiez en conséquence.`
      : `Récupération moyenne ${avg} % sur l'ensemble du corps.`;
  return { score: avg, label, summary };
}

export const MUSCLE_LOAD_META = MUSCLE_RECOVERY_META;

export function buildYearSummary(input: {
  activities: StravaActivity[];
  lifetime: { totalKm: number; totalSessions: number };
  profileName: string;
}) {
  const year = new Date().getFullYear();
  const yearActivities = input.activities.filter(
    (a) => new Date(a.startDate).getFullYear() === year,
  );
  const km = yearActivities.reduce((s, a) => s + a.distanceM / 1000, 0);
  const bestMonth = monthWithMostActivities(yearActivities);
  return {
    year,
    totalSessions: yearActivities.length,
    totalKm: Math.round(km),
    bestMonth,
    highlight: yearActivities.length
      ? `Votre meilleure régularité : ${bestMonth.label} (${bestMonth.count} séances).`
      : 'Commencez votre saison — votre bilan se construit ici.',
    athleteLabel: input.profileName,
  };
}

function monthWithMostActivities(activities: StravaActivity[]) {
  const counts = new Array(12).fill(0);
  for (const a of activities) {
    counts[new Date(a.startDate).getMonth()]++;
  }
  const max = Math.max(...counts, 0);
  const idx = counts.indexOf(max);
  const labels = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];
  return { label: labels[idx] ?? '—', count: max };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const u = Math.max(0, Math.min(1, t));
  return rgbToHex(r1 + (r2 - r1) * u, g1 + (g2 - g1) * u, b1 + (b2 - b1) * u);
}

/** Dégradé progressif vert → jaune → orange → rouge selon % récupération */
export function colorForRecoveryPct(pct: number): string {
  const p = Math.max(0, Math.min(100, pct));
  const stops: Array<[number, string]> = [
    [0, '#B91C1C'],
    [15, '#DC2626'],
    [30, '#EA580C'],
    [45, '#F97316'],
    [55, '#FBBF24'],
    [65, '#EAB308'],
    [75, '#A3E635'],
    [85, '#65D946'],
    [92, '#22C55E'],
    [100, '#16A34A'],
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (p >= p0 && p <= p1) {
      const t = (p - p0) / (p1 - p0);
      return lerpColor(c0, c1, t);
    }
  }
  return stops[stops.length - 1][1];
}

export function recoveryGradientStops(): string[] {
  return ['#B91C1C', '#EA580C', '#FBBF24', '#A3E635', '#16A34A'];
}

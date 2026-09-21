import type { AthleticLevel, OnboardingAnswers, PlannedWorkout, WorkoutStep } from '../types/domain';
import { paceBandForRunKind, warmupBandForMain, type PaceBand, type PaceZones, type RunPaceKind } from './paceZones';
import { pickBestRaceReference } from './athleteProfile';

/**
 * « Séance rapide » : l'utilisateur choisit le sport, le TYPE de séance, la durée puis l'intensité (3 crans).
 * Toutes les allures viennent des zones de l'athlète (chrono / VMA / volume), exactement comme le plan.
 */
export type QuickSport = 'run' | 'bike' | 'swim';
export type Intensity = 'gentle' | 'moderate' | 'hard';

export const INTENSITIES: Array<{ id: Intensity; label: string; hint: string }> = [
  { id: 'gentle', label: 'Tranquille', hint: 'Tu peux parler sans effort' },
  { id: 'moderate', label: 'Modéré', hint: 'Effort soutenu, mais tenable' },
  { id: 'hard', label: 'Intense', hint: 'Dans le rouge, tu vas piocher' },
];

export type QuickKindId = 'easy' | 'long' | 'intervals' | 'tempo' | 'endurance';

export type QuickKindOption = {
  id: QuickKindId;
  label: string;
  sub: string;
  /** « une sortie longue » — pour les messages. */
  noun: string;
  /** Plage de durée cohérente (minutes). */
  min: number;
  max: number;
  ideal: number;
};

export const QUICK_KINDS: Record<QuickSport, QuickKindOption[]> = {
  run: [
    { id: 'easy', label: 'Footing', sub: 'Sortie courte, à l’aise', noun: 'un footing', min: 15, max: 75, ideal: 30 },
    { id: 'long', label: 'Sortie longue', sub: 'Endurance, on prend son temps', noun: 'une sortie longue', min: 60, max: 180, ideal: 75 },
    { id: 'intervals', label: 'Fractionné', sub: 'Accélérations et récupérations', noun: 'un fractionné', min: 30, max: 80, ideal: 45 },
    { id: 'tempo', label: 'Seuil / tempo', sub: 'Un long bloc à allure soutenue', noun: 'une séance seuil', min: 30, max: 90, ideal: 45 },
  ],
  bike: [
    { id: 'endurance', label: 'Sortie endurance', sub: 'Pédaler à l’aise', noun: 'une sortie endurance', min: 30, max: 150, ideal: 60 },
    { id: 'long', label: 'Sortie longue', sub: 'Plusieurs heures en selle', noun: 'une sortie longue', min: 120, max: 240, ideal: 150 },
    { id: 'intervals', label: 'Intervalles', sub: 'Blocs d’effort en puissance', noun: 'une séance d’intervalles', min: 45, max: 100, ideal: 60 },
  ],
  swim: [
    { id: 'endurance', label: 'Endurance', sub: 'Nage continue', noun: 'une séance d’endurance', min: 20, max: 90, ideal: 40 },
    { id: 'intervals', label: 'Séries', sub: 'Répétitions avec repos courts', noun: 'une séance de séries', min: 30, max: 90, ideal: 45 },
  ],
};

export function quickKind(sport: QuickSport, id: QuickKindId): QuickKindOption {
  return QUICK_KINDS[sport].find((k) => k.id === id) ?? QUICK_KINDS[sport][0]!;
}

/** Durée maximale proposée par le curseur selon le sport. */
export function sliderMax(sport: 'run' | 'bike' | 'swim' | 'strength' | 'calisthenics'): number {
  return sport === 'run' ? 180 : sport === 'bike' ? 240 : sport === 'swim' ? 90 : 90;
}

export type Coherence = { ok: true } | { ok: false; message: string; suggestedMinutes: number; alt?: { id: QuickKindId; label: string } };

/** Vérifie que la durée choisie a un sens pour ce type de séance, sinon explique et propose une correction. */
export function checkQuickCoherence(sport: QuickSport, kindId: QuickKindId, minutes: number, level: AthleticLevel = 'intermediaire'): Coherence {
  const k = quickKind(sport, kindId);
  const min = kindId === 'long' && sport === 'run' && level === 'debutant' ? 45 : k.min;
  if (minutes < min) {
    // Une durée trop courte pour une sortie longue → proposer plutôt un footing / une sortie endurance.
    const alt = kindId === 'long' ? (sport === 'run' ? { id: 'easy' as const, label: 'Footing' } : { id: 'endurance' as const, label: 'Sortie endurance' }) : undefined;
    return {
      ok: false,
      message: `${cap(k.noun)} en ${minutes} min, ce n’est pas cohérent : compte au moins ${min} min.${alt ? ` Pour ${minutes} min, un ${alt.label.toLowerCase()} est plus adapté.` : ''}`,
      suggestedMinutes: min,
      alt,
    };
  }
  if (minutes > k.max) {
    const alt = kindId === 'easy' ? { id: 'long' as const, label: 'Sortie longue' } : undefined;
    return {
      ok: false,
      message: `${cap(k.noun)} de ${minutes} min, c’est trop pour ce type de séance : au-delà de ${k.max} min, on ne tient plus la qualité.${alt ? ' Une sortie longue serait plus adaptée.' : ''}`,
      suggestedMinutes: k.max,
      alt,
    };
  }
  return { ok: true };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ——— Données manquantes (étape « Compléter », facultative) ———

export type MissingField = 'run-pace' | 'bike-ftp' | 'swim-pace';

/** Ce qui manque pour caler les allures au plus juste. Vide = on a assez d'informations. */
export function missingQuickData(sport: QuickSport, ob?: OnboardingAnswers | null): MissingField[] {
  if (sport === 'run') {
    const hasRace = pickBestRaceReference(ob) != null;
    const hasVma = (ob?.vmaKmh ?? 0) >= 8;
    const hasVolume = (ob?.weeklyKmAvg ?? 0) >= 8;
    return hasRace || hasVma || hasVolume ? [] : ['run-pace'];
  }
  if (sport === 'bike') return (ob?.ftpWatts ?? 0) >= 80 ? [] : ['bike-ftp'];
  const swim = ob?.sportTimesSec?.swim ?? {};
  const has = [swim['50m'], swim['100m'], swim['200m'], swim['400m']].some((v) => typeof v === 'number' && v > 0);
  return has ? [] : ['swim-pace'];
}

// ——— Constructeurs ———

const shift = (b: PaceBand, sec: number): PaceBand => ({ minSecPerKm: b.minSecPerKm + sec, maxSecPerKm: b.maxSecPerKm + sec });
const pace = (b: PaceBand) => ({ type: 'pace' as const, minSecPerKm: b.minSecPerKm, maxSecPerKm: b.maxSecPerKm });
const mid = (b: PaceBand) => (b.minSecPerKm + b.maxSecPerKm) / 2;
const power = (ftp: number, lo: number, hi: number) => ({ type: 'power' as const, minWatts: Math.round(ftp * lo), maxWatts: Math.round(ftp * hi) });

function totalSec(steps: WorkoutStep[]): number {
  return steps.reduce((t, s) => t + (s.durationSec ?? 0) * (s.repeat ?? 1), 0);
}

function runDistanceM(steps: WorkoutStep[]): number {
  let m = 0;
  for (const s of steps) {
    if (s.target?.type === 'pace' && s.durationSec) m += (s.durationSec * (s.repeat ?? 1) / mid(s.target)) * 1000;
  }
  return Math.round(m / 10) * 10;
}

export type QuickBuildCtx = { zones: PaceZones; ftp: number; swimPace100: number; level: AthleticLevel };

/** Course : durée exacte demandée, allures issues des zones de l'athlète. */
export function buildQuickRun(ctx: QuickBuildCtx, date: string, kind: QuickKindId, minutesIn: number, intensity: Intensity): PlannedWorkout {
  const minutes = Math.max(10, Math.round(minutesIn));
  const z = ctx.zones;
  const band = (k: RunPaceKind) => paceBandForRunKind(z, k);
  const wuBand = (main: RunPaceKind) => warmupBandForMain(z, main);
  const coolBand = band('cooldown');
  const steps: WorkoutStep[] = [];
  const step = (id: string, type: WorkoutStep['type'], label: string, sec: number, b: PaceBand, repeat?: number): WorkoutStep => ({
    id,
    type,
    label,
    endCondition: 'duration',
    durationSec: Math.round(sec),
    target: pace(b),
    repeat,
  });
  const I = intensity;
  let title: string;
  let rpe: number;

  if (kind === 'easy' || kind === 'long') {
    const long = kind === 'long';
    const warm = long ? 8 : minutes >= 30 ? 6 : 4;
    const cool = long ? 6 : minutes >= 30 ? 4 : 3;
    const main = Math.max(5, minutes - warm - cool);
    const base: RunPaceKind = long ? 'long' : 'easy';
    steps.push(step('wu', 'warmup', 'Échauffement · footing lent', warm * 60, wuBand(base)));
    if (I === 'hard') {
      // Progression : on termine à allure marathon.
      const first = Math.round(main * (long ? 0.7 : 0.6));
      steps.push(step('m1', 'active', long ? 'Endurance' : 'Footing facile', first * 60, band(base)));
      steps.push(step('m2', 'active', 'Finale plus soutenue', (main - first) * 60, band('marathon')));
      title = long ? `Sortie longue progressive ${minutes} min` : `Footing soutenu ${minutes} min`;
      rpe = long ? 6 : 5;
    } else if (I === 'gentle') {
      steps.push(step('m1', 'active', long ? 'Endurance très douce' : 'Footing très facile', main * 60, long ? shift(band('long'), 12) : band('recovery')));
      title = long ? `Sortie longue tranquille ${minutes} min` : `Footing tranquille ${minutes} min`;
      rpe = 2;
    } else {
      steps.push(step('m1', 'active', long ? 'Endurance' : 'Footing facile', main * 60, band(base)));
      title = long ? `Sortie longue ${minutes} min` : `Footing ${minutes} min`;
      rpe = long ? 4 : 3;
    }
    steps.push(step('cd', 'cooldown', 'Retour au calme', cool * 60, coolBand));
  } else if (kind === 'intervals') {
    const warm = minutes >= 60 ? 15 : minutes >= 45 ? 12 : 10;
    const cool = minutes >= 60 ? 8 : 5;
    const main = Math.max(10, minutes - warm - cool);
    const cfg =
      I === 'gentle'
        ? { kind: 'marathon' as RunPaceKind, rep: 120, rec: 120, name: 'Fartlek doux', rpe: 6 }
        : I === 'hard'
          ? { kind: 'interval' as RunPaceKind, rep: 120, rec: 90, name: 'Fractionné VMA', rpe: 9 }
          : { kind: 'threshold' as RunPaceKind, rep: 240, rec: 120, name: 'Fractionné au seuil', rpe: 7 };
    const reps = Math.max(3, Math.min(12, Math.floor((main * 60) / (cfg.rep + cfg.rec))));
    const used = reps * (cfg.rep + cfg.rec);
    const extra = Math.max(0, main * 60 - used);
    steps.push(step('wu', 'warmup', 'Échauffement · footing facile', warm * 60, wuBand(cfg.kind)));
    steps.push(step('rep', 'active', `${reps} × ${cfg.rep >= 120 ? `${cfg.rep / 60} min` : `${cfg.rep} s`}`, cfg.rep, band(cfg.kind), reps));
    steps.push(step('rec', 'rest', 'Récupération en trottinant', cfg.rec, band('recovery'), reps));
    steps.push(step('cd', 'cooldown', 'Retour au calme', cool * 60 + extra, coolBand));
    title = `${cfg.name} ${minutes} min`;
    rpe = cfg.rpe;
  } else {
    // Seuil / tempo : un long bloc continu.
    const warm = minutes >= 60 ? 15 : minutes >= 45 ? 12 : 10;
    const cool = minutes >= 60 ? 8 : 5;
    const main = Math.max(10, minutes - warm - cool);
    const mainKind: RunPaceKind = I === 'gentle' ? 'marathon' : 'threshold';
    steps.push(step('wu', 'warmup', 'Échauffement · footing facile', warm * 60, wuBand(mainKind)));
    if (I === 'hard') {
      const first = Math.round(main * 0.6);
      steps.push(step('t1', 'active', 'Bloc au seuil', first * 60, band('threshold')));
      steps.push(step('t2', 'active', 'Bloc final plus vite', (main - first) * 60, band('race')));
      title = `Tempo progressif ${minutes} min`;
      rpe = 8;
    } else {
      steps.push(step('t1', 'active', I === 'gentle' ? 'Bloc à allure marathon' : 'Bloc au seuil', main * 60, band(mainKind)));
      title = I === 'gentle' ? `Allure marathon ${minutes} min` : `Tempo seuil ${minutes} min`;
      rpe = I === 'gentle' ? 5 : 7;
    }
    steps.push(step('cd', 'cooldown', 'Retour au calme', cool * 60, coolBand));
  }

  return {
    id: `w-${date}-quick-run-${kind}-${minutes}`,
    title,
    date,
    discipline: 'run',
    plannedDurationSec: totalSec(steps),
    plannedDistanceM: runDistanceM(steps),
    expectedRpe: rpe,
    periodization: 'developpement_general',
    steps,
  };
}

/** Vélo : cibles en watts (% de la FTP). */
export function buildQuickBike(ctx: QuickBuildCtx, date: string, kind: QuickKindId, minutesIn: number, intensity: Intensity): PlannedWorkout {
  const minutes = Math.max(20, Math.round(minutesIn));
  const ftp = ctx.ftp;
  const I = intensity;
  const steps: WorkoutStep[] = [];
  const add = (id: string, type: WorkoutStep['type'], label: string, sec: number, lo: number, hi: number, repeat?: number) =>
    steps.push({ id, type, label, endCondition: 'duration', durationSec: Math.round(sec), target: power(ftp, lo, hi), repeat });
  let title: string;
  let rpe: number;

  if (kind === 'intervals') {
    const warm = minutes >= 60 ? 15 : 10;
    const cool = minutes >= 60 ? 10 : 6;
    const main = Math.max(10, minutes - warm - cool);
    const cfg =
      I === 'gentle'
        ? { lo: 0.83, hi: 0.92, rep: 300, rec: 180, name: 'Tempo vélo', rpe: 6 }
        : I === 'hard'
          ? { lo: 1.1, hi: 1.2, rep: 180, rec: 180, name: 'Intervalles VO2', rpe: 9 }
          : { lo: 0.95, hi: 1.05, rep: 300, rec: 180, name: 'Intervalles au seuil', rpe: 7 };
    const reps = Math.max(3, Math.min(10, Math.floor((main * 60) / (cfg.rep + cfg.rec))));
    const extra = Math.max(0, main * 60 - reps * (cfg.rep + cfg.rec));
    add('wu', 'warmup', 'Échauffement progressif', warm * 60, 0.5, 0.7);
    add('rep', 'active', `${reps} × ${cfg.rep / 60} min`, cfg.rep, cfg.lo, cfg.hi, reps);
    add('rec', 'rest', 'Récupération en pédalant souple', cfg.rec, 0.4, 0.55, reps);
    add('cd', 'cooldown', 'Retour au calme', cool * 60 + extra, 0.4, 0.55);
    title = `${cfg.name} ${minutes} min`;
    rpe = cfg.rpe;
  } else {
    const long = kind === 'long';
    const warm = long ? 10 : minutes >= 45 ? 8 : 5;
    const cool = long ? 8 : minutes >= 45 ? 5 : 3;
    const main = Math.max(10, minutes - warm - cool);
    add('wu', 'warmup', 'Échauffement progressif', warm * 60, 0.45, 0.6);
    if (I === 'hard') {
      const first = Math.round(main * 0.7);
      add('m1', 'active', 'Endurance', first * 60, 0.68, 0.78);
      add('m2', 'active', 'Finale soutenue', (main - first) * 60, 0.8, 0.9);
      title = long ? `Sortie longue soutenue ${minutes} min` : `Sortie soutenue ${minutes} min`;
      rpe = long ? 6 : 6;
    } else if (I === 'gentle') {
      add('m1', 'active', 'Endurance douce', main * 60, 0.5, 0.62);
      title = long ? `Sortie longue tranquille ${minutes} min` : `Sortie tranquille ${minutes} min`;
      rpe = 2;
    } else {
      add('m1', 'active', 'Endurance', main * 60, 0.62, 0.74);
      title = long ? `Sortie longue ${minutes} min` : `Sortie endurance ${minutes} min`;
      rpe = long ? 4 : 3;
    }
    add('cd', 'cooldown', 'Retour au calme', cool * 60, 0.4, 0.55);
  }
  const avgKmh = I === 'gentle' ? 24 : I === 'hard' ? 31 : 27;
  return {
    id: `w-${date}-quick-bike-${kind}-${minutes}`,
    title,
    date,
    discipline: 'bike',
    plannedDurationSec: totalSec(steps),
    plannedDistanceM: Math.round(((minutes / 60) * avgKmh * 1000) / 100) * 100,
    expectedRpe: rpe,
    periodization: 'developpement_general',
    steps,
  };
}

/** Natation : allure au 100 m modulée par l'intensité (durée de chaque étape en secondes). */
export function buildQuickSwim(ctx: QuickBuildCtx, date: string, kind: QuickKindId, minutesIn: number, intensity: Intensity): PlannedWorkout {
  const minutes = Math.max(15, Math.round(minutesIn));
  const p = ctx.swimPace100;
  const I = intensity;
  const factor = I === 'gentle' ? 1.08 : I === 'hard' ? 0.94 : 1;
  const wuM = minutes >= 40 ? 400 : 300;
  const cdM = 200;
  const wuSec = Math.round((wuM / 100) * p * 1.15);
  const cdSec = Math.round((cdM / 100) * p * 1.1);
  const mainSec = Math.max(300, minutes * 60 - wuSec - cdSec);
  const steps: WorkoutStep[] = [
    { id: 'wu', type: 'warmup', label: `Échauffement ${wuM} m + éducatifs`, endCondition: 'distance', distanceMeters: wuM, durationSec: wuSec },
  ];
  let title: string;
  let rpe: number;
  let mainM: number;
  if (kind === 'intervals') {
    const repPace = Math.round(p * (I === 'gentle' ? 1.02 : I === 'hard' ? 0.93 : 0.97));
    const rest = I === 'gentle' ? 25 : I === 'hard' ? 15 : 20;
    const reps = Math.max(4, Math.min(24, Math.floor(mainSec / (repPace + rest))));
    steps.push({ id: 'rep', type: 'active', label: `${reps} × 100 m`, endCondition: 'distance', distanceMeters: 100, durationSec: repPace, repeat: reps });
    steps.push({ id: 'rest', type: 'rest', label: `Repos ${rest} s au mur`, endCondition: 'duration', durationSec: rest, repeat: reps });
    mainM = reps * 100;
    title = `Séries ${I === 'gentle' ? 'tranquilles' : I === 'hard' ? 'intenses' : 'au seuil'} ${minutes} min`;
    rpe = I === 'gentle' ? 5 : I === 'hard' ? 8 : 7;
  } else {
    mainM = Math.max(200, Math.round(((mainSec / (p * factor)) * 100) / 50) * 50);
    steps.push({ id: 'main', type: 'active', label: `Nage continue ${mainM} m`, endCondition: 'distance', distanceMeters: mainM, durationSec: mainSec });
    title = `Endurance ${I === 'gentle' ? 'tranquille' : I === 'hard' ? 'soutenue' : ''} ${minutes} min`.replace(/\s+/g, ' ').trim();
    rpe = I === 'gentle' ? 3 : I === 'hard' ? 6 : 4;
  }
  steps.push({ id: 'cd', type: 'cooldown', label: `Retour au calme ${cdM} m`, endCondition: 'distance', distanceMeters: cdM, durationSec: cdSec });
  return {
    id: `w-${date}-quick-swim-${kind}-${minutes}`,
    title,
    date,
    discipline: 'swim',
    plannedDurationSec: totalSec(steps),
    plannedDistanceM: wuM + mainM + cdM,
    expectedRpe: rpe,
    periodization: 'developpement_general',
    steps,
  };
}

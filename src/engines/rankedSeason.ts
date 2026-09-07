import { clampXp, levelFromXp } from './core';
import type { RankTier, RankedProgress } from '../types/domain';
import {
  DIVISION_POOL_SIZE,
  allRankSteps,
  formatRankLabel,
  type RankDivision,
  type RankStep,
} from './rankedLadder';

/**
 * Ladder hebdomadaire (inspiré Soft Ladder / ligues en ligne) :
 * - chaque lundi, le peloton (~100) est tranché
 * - top → promotion, bas → rétrogradation (sauf Bronze 3 = plancher)
 * - plus on monte, moins de places de promotion (50 → 5 vers Champion)
 */

/** Places de promotion (sur 100) — plus facile en bas, plus serré en haut */
export const LADDER_PROMOTE_SLOTS: number[] = [
  55, // Bronze 3 → 2
  50, // Bronze 2 → 1
  45, // Bronze 1 → Argent 3
  38, // Argent 3 → 2
  32, // Argent 2 → 1
  28, // Argent 1 → Or 3
  24, // Or 3 → 2
  20, // Or 2 → 1
  17, // Or 1 → Diamant 3
  14, // Diamant 3 → 2
  12, // Diamant 2 → 1
  10, // Diamant 1 → Platine 3
  9, // Platine 3 → 2
  8, // Platine 2 → 1
  7, // Platine 1 → Élite 3
  10, // Élite 3 → 2
  7, // Élite 2 → 1
  3, // Élite 1 → Champion
];

/** Places de rétrogradation (bas du peloton). Bronze 3 = 0 (plancher). */
export const LADDER_RELEGATE_SLOTS: number[] = [
  0, // Bronze 3
  12,
  16,
  18,
  20,
  22,
  24,
  26,
  28,
  28,
  30,
  30,
  32,
  33,
  34,
  32, // Élite 3
  30, // Élite 2
  28, // Élite 1
  35, // Champion → Élite 1
];

export type LadderZone = 'promote' | 'safe' | 'relegate';

/** Semaine ISO (lundi → dimanche) : 2026-W35 */
export function ladderWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Prochain lundi 00:00 locale */
export function nextLadderSettleAt(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 dim … 1 lun
  const add = day === 1 ? 7 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + add);
  return d;
}

export function msUntilLadderSettle(from: Date = new Date()): number {
  return Math.max(0, nextLadderSettleAt(from).getTime() - from.getTime());
}

export function formatCountdown(ms: number): string {
  const totalH = Math.floor(ms / 3_600_000);
  const d = Math.floor(totalH / 24);
  const h = totalH % 24;
  if (d > 0) return `${d} j ${h} h`;
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h} h ${m} min`;
}

export function rankStepIndex(tier: RankTier, division: RankDivision | null | undefined): number {
  const steps = allRankSteps();
  const t = tier === 'master' ? 'champion' : tier;
  const idx = steps.findIndex(
    (s) => s.tier === t && (t === 'champion' ? true : s.division === (division ?? 3)),
  );
  return idx >= 0 ? idx : 0;
}

export function stepAt(index: number): RankStep {
  const steps = allRankSteps();
  return steps[Math.max(0, Math.min(steps.length - 1, index))];
}

export function promoteSlotsFor(tier: RankTier, division: RankDivision | null | undefined): number {
  const idx = rankStepIndex(tier, division);
  if (idx >= LADDER_PROMOTE_SLOTS.length) return 0; // Champion
  return LADDER_PROMOTE_SLOTS[idx];
}

export function relegateSlotsFor(tier: RankTier, division: RankDivision | null | undefined): number {
  const idx = rankStepIndex(tier, division);
  return LADDER_RELEGATE_SLOTS[Math.min(idx, LADDER_RELEGATE_SLOTS.length - 1)] ?? 0;
}

export function ladderZoneForPlace(
  place: number,
  tier: RankTier,
  division: RankDivision | null | undefined,
  poolSize: number = DIVISION_POOL_SIZE,
): LadderZone {
  const promoteN = promoteSlotsFor(tier, division);
  const relegateN = relegateSlotsFor(tier, division);
  if (promoteN > 0 && place <= promoteN) return 'promote';
  if (relegateN > 0 && place > poolSize - relegateN) return 'relegate';
  return 'safe';
}

export function normalizeRankedLadder(ranked: RankedProgress): RankedProgress {
  const week = ladderWeekKey();
  const xp = clampXp(ranked.xp ?? 0);
  const level = levelFromXp(xp);
  return {
    ...ranked,
    xp,
    level,
    division: ranked.division === undefined ? 3 : ranked.division,
    weekXp: clampXp(ranked.weekXp ?? 0),
    ladderWeekKey: ranked.ladderWeekKey ?? week,
    // Première sync : pas d’anim surprise — on considère le niveau déjà « vu »
    lastCelebratedLevel:
      ranked.lastCelebratedLevel != null ? ranked.lastCelebratedLevel : level,
  };
}

/** Boucliers Premium : 3 chances avant une vraie rétrogradation */
export const PREMIUM_RELEGATION_SHIELDS = 3;

/** Avance d’une semaine ISO (ex. 2026-W35 → 2026-W36) */
export function advanceLadderWeekKey(weekKey: string): string {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!m) return ladderWeekKey();
  const year = Number(m[1]);
  const week = Number(m[2]);
  // Approximation stable : lundi de la semaine ISO via le jeudi de la semaine 1
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  simple.setUTCDate(simple.getUTCDate() + 7);
  const next = ladderWeekKey(simple);
  // Garde-fou si la clé n’a pas bougé
  if (next === weekKey) {
    simple.setUTCDate(simple.getUTCDate() + 7);
    return ladderWeekKey(simple);
  }
  return next;
}

export type SettleLadderOpts = {
  premium?: boolean;
  poolSize?: number;
  /** Si true, avance d’une seule semaine (rattrapage multi-semaines) */
  singleStep?: boolean;
};

/**
 * Applique le verdict hebdo selon la place (1 = premier).
 * Remet weekXp à 0 (tout le monde repart à zéro dans la ligue),
 * conserve l’XP profil. Premium : jusqu’à 3 boucliers anti-rétrogradation.
 */
export function settleWeeklyLadder(
  ranked: RankedProgress,
  place: number,
  opts: SettleLadderOpts = {},
): RankedProgress {
  const poolSize = opts.poolSize ?? DIVISION_POOL_SIZE;
  const premium = Boolean(opts.premium);
  const base = normalizeRankedLadder(ranked);
  const steps = allRankSteps();
  const idx = rankStepIndex(base.tier, base.division ?? 3);
  const promoteN = idx < LADDER_PROMOTE_SLOTS.length ? LADDER_PROMOTE_SLOTS[idx] : 0;
  const relegateN = LADDER_RELEGATE_SLOTS[Math.min(idx, LADDER_RELEGATE_SLOTS.length - 1)];

  let shields =
    base.relegationShieldsLeft ??
    (premium ? PREMIUM_RELEGATION_SHIELDS : 0);
  if (!premium) shields = 0;
  else if (base.relegationShieldsLeft == null) shields = PREMIUM_RELEGATION_SHIELDS;

  let nextIdx = idx;
  let outcome: RankedProgress['lastLadderOutcome'] = 'held';

  if (promoteN > 0 && place >= 1 && place <= promoteN && idx < steps.length - 1) {
    nextIdx = idx + 1;
    outcome = 'promoted';
    // Promotion : on recharge les boucliers Premium
    if (premium) shields = PREMIUM_RELEGATION_SHIELDS;
  } else if (relegateN > 0 && place > poolSize - relegateN && idx > 0) {
    if (premium && shields > 0) {
      // Bouclier : reste dans la ligue, peloton renouvelé (nouvelle semaine)
      nextIdx = idx;
      outcome = 'shielded';
      shields -= 1;
    } else {
      nextIdx = idx - 1;
      outcome = 'relegated';
    }
  }

  const next = steps[nextIdx];
  const fromKey = base.ladderWeekKey ?? ladderWeekKey();
  const nextKey = opts.singleStep
    ? advanceLadderWeekKey(fromKey)
    : ladderWeekKey();

  return {
    ...base,
    xp: base.xp,
    level: base.level,
    tier: next.tier,
    division: next.division,
    weekXp: 0,
    ladderWeekKey: nextKey,
    lastLadderOutcome: outcome,
    lastLadderPlace: place,
    seasonId: base.seasonId,
    relegationShieldsLeft: premium ? shields : 0,
  };
}

/**
 * Rattrape plusieurs lundis manqués (ex. 3 semaines sans ouvrir l’app).
 * 1er settle : place réelle ; suivants (inactif, weekXp déjà 0) : fond de peloton.
 */
export function settleMissedLadderWeeks(
  ranked: RankedProgress,
  place: number,
  opts: { premium?: boolean; poolSize?: number; maxWeeks?: number } = {},
): RankedProgress {
  const current = ladderWeekKey();
  const poolSize = opts.poolSize ?? DIVISION_POOL_SIZE;
  const maxWeeks = opts.maxWeeks ?? 12;
  let next = normalizeRankedLadder(ranked);
  if (!next.ladderWeekKey) {
    return { ...next, ladderWeekKey: current };
  }
  let n = 0;
  while (next.ladderWeekKey !== current && n < maxWeeks) {
    const placeForWeek = n === 0 ? place : poolSize;
    next = settleWeeklyLadder(next, placeForWeek, {
      premium: opts.premium,
      poolSize,
      singleStep: true,
    });
    n += 1;
    // Sécurité : si la clé n’avance pas, on force current
    if (n > 0 && next.ladderWeekKey === ranked.ladderWeekKey) {
      next = { ...next, ladderWeekKey: current };
      break;
    }
  }
  if (next.ladderWeekKey !== current) {
    next = { ...next, ladderWeekKey: current };
  }
  return next;
}

export function ladderOutcomeLabel(
  outcome: RankedProgress['lastLadderOutcome'],
  place?: number,
  shieldsLeft?: number,
): string {
  if (outcome === 'promoted') {
    return 'Promu — montée de ligue.';
  }
  if (outcome === 'relegated') {
    return 'Rétrogradé — descente d’une ligue.';
  }
  if (outcome === 'shielded') {
    const left =
      shieldsLeft != null ? ` · ${shieldsLeft} bouclier${shieldsLeft > 1 ? 's' : ''} restant${shieldsLeft > 1 ? 's' : ''}` : '';
    return `Bouclier Premium — ligue sauvée${left}.`;
  }
  if (outcome === 'held') {
    return 'Ligue maintenue.';
  }
  return '';
}

export function ladderRulesBlurb(
  tier: RankTier,
  division: RankDivision | null | undefined,
): string {
  const promoteN = promoteSlotsFor(tier, division);
  const relegateN = relegateSlotsFor(tier, division);
  const label = formatRankLabel(tier, division ?? null);
  if (tier === 'champion' || promoteN === 0) {
    return `${label} : top ${DIVISION_POOL_SIZE - relegateN} pour rester · bas ${relegateN} rétrogradés. Reset chaque lundi.`;
  }
  if (relegateN === 0) {
    return `${label} : top ${promoteN} / ${DIVISION_POOL_SIZE} promus · pas de rétrogradation (plancher). Reset chaque lundi.`;
  }
  return `${label} : top ${promoteN} promus · bas ${relegateN} rétrogradés · milieu en sécurité. Reset chaque lundi.`;
}

export type LadderZoneSummary = {
  poolSize: number;
  promote: { from: number; to: number; nextLabel: string } | null;
  safe: { from: number; to: number };
  relegate: { from: number; to: number; prevLabel: string } | null;
};

/** Tranches promo / sécu / rétro pour un échelon (affichage UI). */
export function ladderZoneSummary(
  tier: RankTier,
  division: RankDivision | null | undefined,
  poolSize: number = DIVISION_POOL_SIZE,
): LadderZoneSummary {
  const promoteN = promoteSlotsFor(tier, division);
  const relegateN = relegateSlotsFor(tier, division);
  const idx = rankStepIndex(tier, division);
  const steps = allRankSteps();
  const next = idx < steps.length - 1 ? steps[idx + 1] : null;
  const prev = idx > 0 ? steps[idx - 1] : null;
  const safeFrom = promoteN > 0 ? promoteN + 1 : 1;
  const safeTo = relegateN > 0 ? poolSize - relegateN : poolSize;
  return {
    poolSize,
    promote:
      promoteN > 0 && next
        ? { from: 1, to: promoteN, nextLabel: next.label }
        : null,
    safe: {
      from: Math.min(safeFrom, safeTo),
      to: Math.max(safeFrom, safeTo),
    },
    relegate:
      relegateN > 0
        ? {
            from: poolSize - relegateN + 1,
            to: poolSize,
            prevLabel: prev?.label ?? '—',
          }
        : null,
  };
}

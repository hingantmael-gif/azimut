/**
 * Récompenses podium — style apps compétitives (ligues Duolingo / Strava Challenges) :
 * #1 mondial ou national gagne XP + titre + bouclier.
 * Clé = discipline + scope + semaine ISO (reset lundi).
 */

import type { OdysseySport } from './kmOdyssey';
import { ODYSSEY_SPORT_META } from './kmOdyssey';
import type { WorldBoardId } from './worldRankings';
import { ladderWeekKey } from './rankedSeason';
import type { RankedProgress } from '../types/domain';
import { applyXp } from './core';

export type RankingRewardScope = 'world' | 'national';

export type RankingRewardKind =
  | { board: 'odyssey'; sport: OdysseySport; scope: RankingRewardScope }
  | { board: 'world'; worldId: WorldBoardId; scope: RankingRewardScope };

export type RankingRewardDef = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  xp: number;
  /** Titre profil temporaire */
  profileTitle?: string;
  /** +1 bouclier anti-descente (plafonné côté claim) */
  shieldBonus?: number;
};

export type ClaimedRankingReward = {
  id: string;
  claimedAt: string;
  weekKey: string;
};

function weekKeyNow(): string {
  return ladderWeekKey();
}

export function rankingRewardId(
  kind: RankingRewardKind,
  weekKey: string = weekKeyNow(),
): string {
  if (kind.board === 'odyssey') {
    return `ody-${kind.scope}-${kind.sport}-${weekKey}`;
  }
  return `wr-${kind.scope}-${kind.worldId}-${weekKey}`;
}

export function rewardDefFor(kind: RankingRewardKind): RankingRewardDef {
  const week = weekKeyNow();
  const id = rankingRewardId(kind, week);
  if (kind.board === 'odyssey') {
    const meta = ODYSSEY_SPORT_META[kind.sport];
    const scopeLabel = kind.scope === 'world' ? 'mondial' : 'national';
    const xp = kind.scope === 'world' ? 250 : 150;
    return {
      id,
      title: `Couronne ${meta.short} ${scopeLabel}`,
      subtitle: `#1 Odyssée ${meta.title} · ${scopeLabel}`,
      emoji: kind.scope === 'world' ? '🌍' : '🏳️',
      xp,
      profileTitle:
        kind.scope === 'world'
          ? `Roi ${meta.short} mondial`
          : `Champion ${meta.short} national`,
      shieldBonus: kind.scope === 'world' ? 1 : 0,
    };
  }
  const labels: Record<WorldBoardId, string> = {
    xp_total: 'XP carrière',
    xp_week: 'XP semaine',
    km: 'Km',
    country: 'National XP',
    champions: 'Champions',
  };
  const scopeLabel = kind.scope === 'world' ? 'mondial' : 'national';
  const xp = kind.scope === 'world' ? 200 : 120;
  return {
    id,
    title: `Couronne ${labels[kind.worldId]}`,
    subtitle: `#1 ${labels[kind.worldId]} · ${scopeLabel}`,
    emoji: '👑',
    xp,
    profileTitle: `#1 ${labels[kind.worldId]}`,
    shieldBonus: kind.worldId === 'xp_week' ? 1 : 0,
  };
}

export function isRewardClaimed(
  claimed: ClaimedRankingReward[] | undefined,
  rewardId: string,
): boolean {
  return (claimed ?? []).some((c) => c.id === rewardId);
}

export function applyRankingRewardClaim(
  ranked: RankedProgress,
  def: RankingRewardDef,
  opts?: { premium?: boolean; shieldsCap?: number },
): RankedProgress {
  let next = applyXp(ranked, def.xp);
  if (def.shieldBonus && opts?.premium) {
    const cap = opts.shieldsCap ?? 3;
    const cur = next.relegationShieldsLeft ?? 0;
    next = {
      ...next,
      relegationShieldsLeft: Math.min(cap, cur + def.shieldBonus),
    };
  }
  return next;
}

/** Affiche une carte récompense si place === 1 et pas encore claim. */
export function podiumRewardCard(opts: {
  kind: RankingRewardKind;
  yourPlace: number;
  claimed?: ClaimedRankingReward[];
}): { def: RankingRewardDef; claimable: boolean } | null {
  if (opts.yourPlace !== 1) return null;
  const def = rewardDefFor(opts.kind);
  const claimable = !isRewardClaimed(opts.claimed, def.id);
  return { def, claimable };
}

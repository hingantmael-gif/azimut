import type { ProgramSportCategory } from '../constants/programs';

export type WeeklySessionCount = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type SessionLoadBand = 'low' | 'beginner' | 'confirmed' | 'expert' | 'max';

export type CoachPanelTone = 'info' | 'ok' | 'warn' | 'danger';

export type CoachPanel = {
  tone: CoachPanelTone;
  title: string;
  body: string;
};

/**
 * Fréquences adaptées par discipline (pratique coach, pas un 3 unique).
 * recommended = défaut wizard · sweetMin/Max = zone « idéal ».
 */
const SPORT_SESSION_GUIDE: Record<
  ProgramSportCategory,
  {
    recommended: WeeklySessionCount;
    sweetMin: number;
    sweetMax: number;
    /** Une seule ligne courte */
    blurb: string;
  }
> = {
  run: {
    recommended: 4,
    sweetMin: 3,
    sweetMax: 5,
    blurb: 'Course : 4×/sem. idéal.',
  },
  bike: {
    recommended: 3,
    sweetMin: 3,
    sweetMax: 4,
    blurb: 'Vélo : 3×/sem. idéal.',
  },
  swim: {
    recommended: 3,
    sweetMin: 3,
    sweetMax: 4,
    blurb: 'Nage : 3×/sem. idéal.',
  },
  triathlon: {
    recommended: 5,
    sweetMin: 4,
    sweetMax: 6,
    blurb: 'Tri : 5×/sem. idéal.',
  },
  ironman: {
    recommended: 6,
    sweetMin: 5,
    sweetMax: 6,
    blurb: 'Ironman : 6×/sem. idéal.',
  },
  strength: {
    recommended: 3,
    sweetMin: 3,
    sweetMax: 4,
    blurb: 'Muscu : 3×/sem. idéal.',
  },
  other: {
    recommended: 4,
    sweetMin: 3,
    sweetMax: 5,
    blurb: 'Callis : 4×/sem. idéal.',
  },
};

export function sessionGuideForSport(sport: ProgramSportCategory | null | undefined) {
  return SPORT_SESSION_GUIDE[sport ?? 'run'] ?? SPORT_SESSION_GUIDE.run;
}

export function recommendedSessionsForSport(
  sport: ProgramSportCategory | null | undefined,
): WeeklySessionCount {
  return sessionGuideForSport(sport).recommended;
}

/** Bande « coach » selon le nombre choisi (tous sports). */
export function sessionLoadBand(count: number): SessionLoadBand {
  if (count <= 1) return 'low';
  if (count === 2) return 'beginner';
  if (count === 3 || count === 4) return 'confirmed';
  if (count === 5 || count === 6) return 'expert';
  return 'max';
}

export function sessionBandLabel(band: SessionLoadBand): string {
  switch (band) {
    case 'low':
      return 'Lent';
    case 'beginner':
      return 'Début';
    case 'confirmed':
      return 'Confirmé';
    case 'expert':
      return 'Expert';
    case 'max':
      return 'Max';
  }
}

export function coachPanelForSessionCount(
  count: number,
  sport: ProgramSportCategory | null | undefined,
): CoachPanel {
  const guide = sessionGuideForSport(sport);
  const rec = guide.recommended;

  if (count <= 1) {
    return {
      tone: 'warn',
      title: 'Lent',
      body: 'Peu de volume.',
    };
  }
  if (count === 2) {
    return {
      tone: count < guide.sweetMin ? 'info' : 'ok',
      title: 'Début',
      body: `OK · idéal ${rec}×.`,
    };
  }
  if (count === 3 || count === 4) {
    const onSweet = count >= guide.sweetMin && count <= guide.sweetMax;
    const isRec = count === rec;
    return {
      tone: onSweet ? 'ok' : 'info',
      title: isRec ? 'Idéal' : onSweet ? 'Bon' : 'Moyen',
      body: isRec ? guide.blurb : onSweet ? 'Bon rythme.' : `Préfère ${rec}×.`,
    };
  }
  if (count === 5 || count === 6) {
    const onSweet = count >= guide.sweetMin && count <= guide.sweetMax;
    const isRec = count === rec;
    return {
      tone: count > guide.sweetMax ? 'warn' : 'ok',
      title: isRec ? 'Idéal' : count > guide.sweetMax ? 'Chargé' : 'Expert',
      body: isRec
        ? guide.blurb
        : count > guide.sweetMax
          ? 'Charge haute.'
          : onSweet
            ? 'Bon rythme.'
            : `Idéal ${rec}×.`,
    };
  }
  return {
    tone: 'danger',
    title: 'Trop',
    body: 'Pas de repos.',
  };
}

/**
 * Jours sélectionnés trop collés → conseil d’espacement (texte ultra court).
 */
export function coachPanelForDaySpacing(days: number[]): CoachPanel | null {
  if (days.length < 2) return null;
  const sorted = [...days].sort((a, b) => a - b);

  const gaps: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]!;
    const b = sorted[(i + 1) % sorted.length]!;
    const gap = i === sorted.length - 1 ? (b + 7 - a) % 7 : b - a;
    gaps.push(gap);
  }

  const consecutivePairs = gaps.filter((g) => g === 1).length;
  const maxCluster = longestConsecutiveCluster(sorted);

  if (days.length >= 3 && maxCluster >= 3) {
    return {
      tone: 'warn',
      title: 'Trop collé',
      body: 'Espace tes jours.',
    };
  }
  if (days.length >= 2 && consecutivePairs >= Math.max(1, days.length - 1)) {
    return {
      tone: 'warn',
      title: 'Collé',
      body: 'Un jour d’écart.',
    };
  }
  if (consecutivePairs >= 2 && days.length >= 3) {
    return {
      tone: 'info',
      title: 'Serré',
      body: 'Surveille la récup.',
    };
  }
  return null;
}

function longestConsecutiveCluster(sortedAsc: number[]): number {
  if (sortedAsc.length === 0) return 0;
  const extended = [...sortedAsc];
  let best = 1;
  let cur = 1;
  for (let i = 1; i < extended.length; i++) {
    if (extended[i]! === extended[i - 1]! + 1) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 1;
    }
  }
  if (sortedAsc.includes(0) && sortedAsc.includes(6)) {
    let left = 0;
    for (let d = 6; d >= 0 && sortedAsc.includes(d); d--) left += 1;
    let right = 0;
    for (let d = 0; d <= 6 && sortedAsc.includes(d); d++) right += 1;
    best = Math.max(best, left + right - 1);
  }
  return best;
}

/** Propose des jours espacés pour N séances (Lun→Dim préféré). */
export function suggestSpacedTrainingDays(count: number): number[] {
  const n = Math.max(1, Math.min(7, Math.round(count)));
  const patterns: Record<number, number[]> = {
    1: [3],
    2: [2, 5],
    3: [1, 3, 5],
    4: [1, 3, 5, 6],
    5: [1, 2, 4, 5, 6],
    6: [1, 2, 3, 4, 5, 6],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return patterns[n] ?? patterns[3]!;
}

export function wizardHintTone(
  tone: CoachPanelTone,
): 'neutral' | 'warn' | 'ok' {
  if (tone === 'ok') return 'ok';
  if (tone === 'warn' || tone === 'danger') return 'warn';
  return 'neutral';
}

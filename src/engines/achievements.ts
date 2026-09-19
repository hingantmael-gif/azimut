import type {
  Achievement,
  LifetimeStats,
  RankedProgress,
  RpeFeedback,
} from '../types/domain';

export type BadgeDifficulty = 'easy' | 'medium' | 'hard' | 'legendary';

export type BadgeDef = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  difficulty: BadgeDifficulty;
  /** XP de base à l’obtention (avant bonus Premium) */
  xpReward: number;
  progress: (ctx: BadgeContext) => number;
  unlocked: (ctx: BadgeContext) => boolean;
};

export type BadgeContext = {
  lifetime: LifetimeStats;
  feedbacks: RpeFeedback[];
  sessionHour?: number;
  streakWeeks: number;
  level: number;
  xp: number;
  likedPrograms: number;
  /** Likes séances + programmes (total envoyés) */
  likesGiven: number;
  following: number;
  followers: number;
  hasActiveProgram: boolean;
  programHistoryCount: number;
  /** Nombre de programmes lancés (compteur monotone) */
  programsLaunched: number;
  /** Nuits sommeil saisies / importées */
  sleepNights: number;
  /** Série de nuits consécutives */
  sleepStreak: number;
};

export const BADGE_DIFFICULTY_LABEL: Record<BadgeDifficulty, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
  legendary: 'Légendaire',
};

export const BADGE_XP_BY_DIFFICULTY: Record<BadgeDifficulty, number> = {
  easy: 25,
  medium: 75,
  hard: 150,
  legendary: 300,
};

function pct(n: number, target: number): number {
  if (target <= 0) return 1;
  return Math.min(1, Math.max(0, n / target));
}

function badge(
  partial: Omit<BadgeDef, 'xpReward'> & { xpReward?: number },
): BadgeDef {
  return {
    ...partial,
    xpReward: partial.xpReward ?? BADGE_XP_BY_DIFFICULTY[partial.difficulty],
  };
}

/**
 * Seuil cumulé pour le niveau L (1-based).
 * Deltas entre niveaux : 1, 1, 2, 3, 4, 5… → totaux 1, 2, 4, 7, 11…
 */
export function progressiveThreshold(level: number): number {
  if (level < 1) return 0;
  return 1 + (level * (level - 1)) / 2;
}

/** Plus haut niveau atteint pour un compteur donné. */
export function progressiveLevelFromCount(count: number): number {
  const n = Math.max(0, Math.floor(count));
  let level = 0;
  while (progressiveThreshold(level + 1) <= n) level += 1;
  return level;
}

/** Combien d’actions supplémentaires pour passer du niveau L-1 au niveau L. */
export function progressiveDeltaForLevel(level: number): number {
  if (level <= 1) return 1;
  if (level === 2) return 1;
  return level - 1;
}

function progressiveDifficulty(level: number): BadgeDifficulty {
  if (level <= 3) return 'easy';
  if (level <= 8) return 'medium';
  if (level <= 15) return 'hard';
  return 'legendary';
}

function progressiveXp(level: number): number {
  const d = progressiveDifficulty(level);
  const base = BADGE_XP_BY_DIFFICULTY[d];
  return Math.min(300, base + Math.max(0, level - 1) * 5);
}

type InfiniteLadderKind = 'programs' | 'likes';

const LADDER_META: Record<
  InfiniteLadderKind,
  { idPrefix: string; emoji: string; noun: string; verb: string; unit: string }
> = {
  programs: {
    idPrefix: 'prog-launch-lv',
    emoji: '📋',
    noun: 'Programmes',
    verb: 'Lance',
    unit: 'programme',
  },
  likes: {
    idPrefix: 'likes-lv',
    emoji: '♡',
    noun: 'Likes',
    verb: 'Envoie',
    unit: 'like',
  },
};

function ladderCount(ctx: BadgeContext, kind: InfiniteLadderKind): number {
  return kind === 'programs' ? ctx.programsLaunched : ctx.likesGiven;
}

function infiniteLadderBadge(kind: InfiniteLadderKind, level: number): BadgeDef {
  const meta = LADDER_META[kind];
  const need = progressiveThreshold(level);
  const delta = progressiveDeltaForLevel(level);
  const difficulty = progressiveDifficulty(level);
  const unit =
    delta > 1 ? `${meta.unit}s` : meta.unit;
  return badge({
    id: `${meta.idPrefix}-${level}`,
    title: `${meta.noun} · Niv. ${level}`,
    description:
      level === 1
        ? `${meta.verb} ton 1ᵉʳ ${meta.unit}.`
        : `${meta.verb} ${delta} ${unit} de plus (total ${need.toLocaleString('fr-FR')}).`,
    emoji: meta.emoji,
    difficulty,
    xpReward: progressiveXp(level),
    progress: (c) => pct(ladderCount(c, kind), need),
    unlocked: (c) => ladderCount(c, kind) >= need,
  });
}

/**
 * Niveaux à afficher : derniers niveaux débloqués + les 2 suivants
 * (échelle infinie sans saturer la grille).
 */
export function infiniteLadderLevels(
  count: number,
  extraAhead = 2,
  maxUnlockedShown = 8,
): number[] {
  const current = progressiveLevelFromCount(count);
  const maxLevel = Math.max(current + extraAhead, extraAhead);
  const minShown =
    current > maxUnlockedShown ? current - maxUnlockedShown + 1 : 1;
  return Array.from({ length: maxLevel - minShown + 1 }, (_, i) => minShown + i);
}

function infiniteLadderBadgesForContext(ctx: BadgeContext): BadgeDef[] {
  const programLevels = infiniteLadderLevels(ctx.programsLaunched);
  const likeLevels = infiniteLadderLevels(ctx.likesGiven);
  return [
    ...programLevels.map((lv) => infiniteLadderBadge('programs', lv)),
    ...likeLevels.map((lv) => infiniteLadderBadge('likes', lv)),
  ];
}

/** Tous les niveaux déjà gagnés (pour déblocage XP), même au-delà de l’affichage. */
function infiniteLadderUnlockDefs(ctx: BadgeContext): BadgeDef[] {
  const progLv = progressiveLevelFromCount(ctx.programsLaunched);
  const likeLv = progressiveLevelFromCount(ctx.likesGiven);
  const out: BadgeDef[] = [];
  for (let lv = 1; lv <= progLv; lv++) out.push(infiniteLadderBadge('programs', lv));
  for (let lv = 1; lv <= likeLv; lv++) out.push(infiniteLadderBadge('likes', lv));
  return out;
}

/** Paliers d’import / saisie manuelle du sommeil */
const SLEEP_NIGHT_MILESTONES: {
  n: number;
  title: string;
  emoji: string;
  difficulty: BadgeDifficulty;
}[] = [
  { n: 1, title: 'Première nuit', emoji: '😴', difficulty: 'easy' },
  { n: 5, title: '5 nuits notées', emoji: '🌙', difficulty: 'easy' },
  { n: 10, title: '10 nuits notées', emoji: '🛏️', difficulty: 'easy' },
  { n: 15, title: '15 nuits notées', emoji: '💤', difficulty: 'medium' },
  { n: 30, title: '30 nuits notées', emoji: '🦉', difficulty: 'medium' },
  { n: 45, title: '45 nuits notées', emoji: '🌌', difficulty: 'medium' },
  { n: 60, title: '60 nuits notées', emoji: '⭐', difficulty: 'hard' },
  { n: 90, title: '90 nuits notées', emoji: '🏅', difficulty: 'hard' },
  { n: 120, title: '120 nuits notées', emoji: '👑', difficulty: 'legendary' },
  { n: 180, title: '180 nuits notées', emoji: '💎', difficulty: 'legendary' },
];

/** Régularité — revenir chaque jour pour compléter */
const SLEEP_STREAK_MILESTONES: {
  n: number;
  title: string;
  emoji: string;
  difficulty: BadgeDifficulty;
}[] = [
  { n: 3, title: '3 nuits d’affilée', emoji: '🔗', difficulty: 'easy' },
  { n: 7, title: 'Semaine sommeil', emoji: '📅', difficulty: 'medium' },
  { n: 14, title: '2 semaines sommeil', emoji: '🔥', difficulty: 'medium' },
  { n: 21, title: '3 semaines sommeil', emoji: '⚡', difficulty: 'hard' },
  { n: 30, title: 'Mois sommeil', emoji: '🏆', difficulty: 'hard' },
  { n: 60, title: '2 mois sommeil', emoji: '💠', difficulty: 'legendary' },
];

function sleepImportBadges(): BadgeDef[] {
  return SLEEP_NIGHT_MILESTONES.map(({ n, title, emoji, difficulty }) =>
    badge({
      id: n === 1 ? 'sleep-first' : `sleep-nights-${n}`,
      title,
      description:
        n === 1
          ? 'Importe ou saisis manuellement ta première nuit de sommeil.'
          : `Complète ${n} nuits de sommeil (import ou saisie manuelle).`,
      emoji,
      difficulty,
      progress: (c) => pct(c.sleepNights, n),
      unlocked: (c) => c.sleepNights >= n,
    }),
  );
}

function sleepStreakBadges(): BadgeDef[] {
  return SLEEP_STREAK_MILESTONES.map(({ n, title, emoji, difficulty }) =>
    badge({
      id: `sleep-streak-${n}`,
      title,
      description: `Enregistre ton sommeil ${n} jours d’affilée.`,
      emoji,
      difficulty,
      progress: (c) => pct(c.sleepStreak, n),
      unlocked: (c) => c.sleepStreak >= n,
    }),
  );
}

/** Catalogue large — facile → légendaire */
export const BADGE_CATALOG: BadgeDef[] = [
  // ——— Faciles ———
  badge({
    id: 'first-steps',
    title: 'Premiers pas',
    description: 'Importe ta première séance.',
    emoji: '👣',
    difficulty: 'easy',
    progress: (c) => pct(c.lifetime.totalSessions, 1),
    unlocked: (c) => c.lifetime.totalSessions >= 1,
  }),
  badge({
    id: 'first-5k',
    title: '5 km',
    description: 'Cumule 5 km d’activités.',
    emoji: '🟢',
    difficulty: 'easy',
    progress: (c) => pct(c.lifetime.totalKm, 5),
    unlocked: (c) => c.lifetime.totalKm >= 5,
  }),
  badge({
    id: 'first-10k',
    title: 'Premier 10 km',
    description: 'Cumule 10 km d’activités importées.',
    emoji: '🏃',
    difficulty: 'easy',
    progress: (c) => pct(c.lifetime.totalKm, 10),
    unlocked: (c) => c.lifetime.totalKm >= 10,
  }),
  badge({
    id: 'first-hour',
    title: 'Une heure',
    description: 'Cumule 1 h d’entraînement.',
    emoji: '⏱️',
    difficulty: 'easy',
    progress: (c) => pct(c.lifetime.totalHours, 1),
    unlocked: (c) => c.lifetime.totalHours >= 1,
  }),
  badge({
    id: 'rpe-first',
    title: 'Premier feedback',
    description: 'Valide ton premier RPE.',
    emoji: '☝️',
    difficulty: 'easy',
    progress: (c) => pct(c.feedbacks.length, 1),
    unlocked: (c) => c.feedbacks.length >= 1,
  }),
  badge({
    id: 'social-hello',
    title: 'Salut voisin',
    description: 'Abonne-toi à 1 athlète.',
    emoji: '👋',
    difficulty: 'easy',
    progress: (c) => pct(c.following, 1),
    unlocked: (c) => c.following >= 1,
  }),
  badge({
    id: 'sessions-3',
    title: 'Trio',
    description: 'Enregistre 3 séances.',
    emoji: '3️⃣',
    difficulty: 'easy',
    progress: (c) => pct(c.lifetime.totalSessions, 3),
    unlocked: (c) => c.lifetime.totalSessions >= 3,
  }),
  badge({
    id: 'xp-500',
    title: 'Démarrage XP',
    description: 'Atteins 500 XP.',
    emoji: '✨',
    difficulty: 'easy',
    progress: (c) => pct(c.xp, 500),
    unlocked: (c) => c.xp >= 500,
  }),
  badge({
    id: 'level-2',
    title: 'Niveau 2',
    description: 'Passe au niveau 2.',
    emoji: '⬆️',
    difficulty: 'easy',
    progress: (c) => pct(c.level, 2),
    unlocked: (c) => c.level >= 2,
  }),
  badge({
    id: 'elevation-50',
    title: 'Première bosse',
    description: 'Cumule 50 m de D+.',
    emoji: '⛰️',
    difficulty: 'easy',
    progress: (c) => pct(c.lifetime.totalElevationM, 50),
    unlocked: (c) => c.lifetime.totalElevationM >= 50,
  }),

  // ——— Moyens ———
  badge({
    id: 'half-century',
    title: '50 km club',
    description: 'Atteins 50 km cumulés.',
    emoji: '🛣️',
    difficulty: 'medium',
    progress: (c) => pct(c.lifetime.totalKm, 50),
    unlocked: (c) => c.lifetime.totalKm >= 50,
  }),
  badge({
    id: 'sessions-12',
    title: 'Régularité de fer',
    description: 'Enchaîne 12 séances enregistrées.',
    emoji: '🔥',
    difficulty: 'medium',
    progress: (c) => pct(c.lifetime.totalSessions, 12),
    unlocked: (c) => c.lifetime.totalSessions >= 12,
  }),
  badge({
    id: 'rpe-master',
    title: 'Feedback complet',
    description: 'Valide 3 retours RPE.',
    emoji: '💬',
    difficulty: 'medium',
    progress: (c) => pct(c.feedbacks.length, 3),
    unlocked: (c) => c.feedbacks.length >= 3,
  }),
  badge({
    id: 'rpe-10',
    title: 'Journalier',
    description: 'Valide 10 feedbacks RPE.',
    emoji: '📓',
    difficulty: 'medium',
    progress: (c) => pct(c.feedbacks.length, 10),
    unlocked: (c) => c.feedbacks.length >= 10,
  }),
  badge({
    id: 'hours-10',
    title: '10 heures chrono',
    description: 'Cumule 10 h d’entraînement.',
    emoji: '⌛',
    difficulty: 'medium',
    progress: (c) => pct(c.lifetime.totalHours, 10),
    unlocked: (c) => c.lifetime.totalHours >= 10,
  }),
  badge({
    id: 'streak-2',
    title: 'Série ×2',
    description: 'Maintiens 2 semaines de série.',
    emoji: '🔗',
    difficulty: 'medium',
    progress: (c) => pct(c.streakWeeks, 2),
    unlocked: (c) => c.streakWeeks >= 2,
  }),
  badge({
    id: 'streak-4',
    title: 'Mois de feu',
    description: '4 semaines de série d’affilée.',
    emoji: '📅',
    difficulty: 'medium',
    progress: (c) => pct(c.streakWeeks, 4),
    unlocked: (c) => c.streakWeeks >= 4,
  }),
  badge({
    id: 'follow-5',
    title: 'Réseau',
    description: 'Suis 5 athlètes.',
    emoji: '🫂',
    difficulty: 'medium',
    progress: (c) => pct(c.following, 5),
    unlocked: (c) => c.following >= 5,
  }),
  badge({
    id: 'followers-3',
    title: 'Petite audience',
    description: 'Obtiens 3 abonnés.',
    emoji: '📣',
    difficulty: 'medium',
    progress: (c) => pct(c.followers, 3),
    unlocked: (c) => c.followers >= 3,
  }),
  badge({
    id: 'program-finisher',
    title: 'Programme terminé',
    description: 'Termine au moins 1 programme.',
    emoji: '🏁',
    difficulty: 'medium',
    progress: (c) => pct(c.programHistoryCount, 1),
    unlocked: (c) => c.programHistoryCount >= 1,
  }),
  badge({
    id: 'level-5',
    title: 'Niveau 5',
    description: 'Atteins le niveau 5.',
    emoji: '🎖️',
    difficulty: 'medium',
    progress: (c) => pct(c.level, 5),
    unlocked: (c) => c.level >= 5,
  }),
  badge({
    id: 'xp-2500',
    title: '2 500 XP',
    description: 'Cumule 2 500 XP.',
    emoji: '💫',
    difficulty: 'medium',
    progress: (c) => pct(c.xp, 2500),
    unlocked: (c) => c.xp >= 2500,
  }),
  badge({
    id: 'elevation-500',
    title: 'Grimpeur',
    description: 'Cumule 500 m de D+.',
    emoji: '🏔️',
    difficulty: 'medium',
    progress: (c) => pct(c.lifetime.totalElevationM, 500),
    unlocked: (c) => c.lifetime.totalElevationM >= 500,
  }),
  badge({
    id: 'early-bird',
    title: 'Lève-tôt',
    description: 'Termine une séance avant 7 h.',
    emoji: '🌅',
    difficulty: 'medium',
    progress: (c) => ((c.sessionHour ?? 12) < 7 ? 1 : 0),
    unlocked: (c) => (c.sessionHour ?? 12) < 7,
  }),
  badge({
    id: 'night-owl',
    title: 'Oiseau de nuit',
    description: 'Séance terminée après 21 h.',
    emoji: '🌙',
    difficulty: 'medium',
    progress: (c) => ((c.sessionHour ?? 12) >= 21 ? 1 : 0),
    unlocked: (c) => (c.sessionHour ?? 12) >= 21,
  }),
  badge({
    id: 'sessions-25',
    title: 'Quart de cent',
    description: 'Enregistre 25 séances.',
    emoji: '2️⃣5️⃣',
    difficulty: 'medium',
    progress: (c) => pct(c.lifetime.totalSessions, 25),
    unlocked: (c) => c.lifetime.totalSessions >= 25,
  }),

  // ——— Difficiles ———
  badge({
    id: 'century',
    title: 'Centurion',
    description: 'Franchis les 100 km.',
    emoji: '💯',
    difficulty: 'hard',
    progress: (c) => pct(c.lifetime.totalKm, 100),
    unlocked: (c) => c.lifetime.totalKm >= 100,
  }),
  badge({
    id: 'km-250',
    title: '250 km',
    description: 'Cumule 250 km.',
    emoji: '🛤️',
    difficulty: 'hard',
    progress: (c) => pct(c.lifetime.totalKm, 250),
    unlocked: (c) => c.lifetime.totalKm >= 250,
  }),
  badge({
    id: 'hours-40',
    title: '40 heures',
    description: 'Cumule 40 h d’entraînement.',
    emoji: '🕰️',
    difficulty: 'hard',
    progress: (c) => pct(c.lifetime.totalHours, 40),
    unlocked: (c) => c.lifetime.totalHours >= 40,
  }),
  badge({
    id: 'sessions-50',
    title: 'Cinquante',
    description: 'Enregistre 50 séances.',
    emoji: '5️⃣0️⃣',
    difficulty: 'hard',
    progress: (c) => pct(c.lifetime.totalSessions, 50),
    unlocked: (c) => c.lifetime.totalSessions >= 50,
  }),
  badge({
    id: 'streak-8',
    title: 'Inarrêtable',
    description: '8 semaines de série.',
    emoji: '⚡',
    difficulty: 'hard',
    progress: (c) => pct(c.streakWeeks, 8),
    unlocked: (c) => c.streakWeeks >= 8,
  }),
  badge({
    id: 'rpe-25',
    title: 'Introspection',
    description: '25 feedbacks RPE validés.',
    emoji: '🧠',
    difficulty: 'hard',
    progress: (c) => pct(c.feedbacks.length, 25),
    unlocked: (c) => c.feedbacks.length >= 25,
  }),
  badge({
    id: 'follow-15',
    title: 'Communauté',
    description: 'Suis 15 athlètes.',
    emoji: '🌐',
    difficulty: 'hard',
    progress: (c) => pct(c.following, 15),
    unlocked: (c) => c.following >= 15,
  }),
  badge({
    id: 'programs-3',
    title: 'Triathlète de plans',
    description: 'Termine 3 programmes.',
    emoji: '📚',
    difficulty: 'hard',
    progress: (c) => pct(c.programHistoryCount, 3),
    unlocked: (c) => c.programHistoryCount >= 3,
  }),
  badge({
    id: 'level-15',
    title: 'Niveau 15',
    description: 'Atteins le niveau 15 (Argent).',
    emoji: '🥈',
    difficulty: 'hard',
    progress: (c) => pct(c.level, 15),
    unlocked: (c) => c.level >= 15,
  }),
  badge({
    id: 'xp-10000',
    title: '10 000 XP',
    description: 'Cumule 10 000 XP.',
    emoji: '💎',
    difficulty: 'hard',
    progress: (c) => pct(c.xp, 10_000),
    unlocked: (c) => c.xp >= 10_000,
  }),
  badge({
    id: 'elevation-2000',
    title: 'Alpiniste',
    description: 'Cumule 2 000 m de D+.',
    emoji: '🧗',
    difficulty: 'hard',
    progress: (c) => pct(c.lifetime.totalElevationM, 2000),
    unlocked: (c) => c.lifetime.totalElevationM >= 2000,
  }),

  // ——— Légendaires ———
  badge({
    id: 'km-1000',
    title: 'Millénaire',
    description: 'Cumule 1 000 km.',
    emoji: '👑',
    difficulty: 'legendary',
    progress: (c) => pct(c.lifetime.totalKm, 1000),
    unlocked: (c) => c.lifetime.totalKm >= 1000,
  }),
  badge({
    id: 'sessions-100',
    title: 'Cent séances',
    description: 'Enregistre 100 séances.',
    emoji: '🏆',
    difficulty: 'legendary',
    progress: (c) => pct(c.lifetime.totalSessions, 100),
    unlocked: (c) => c.lifetime.totalSessions >= 100,
  }),
  badge({
    id: 'streak-16',
    title: 'Machine',
    description: '16 semaines de série.',
    emoji: '🤖',
    difficulty: 'legendary',
    progress: (c) => pct(c.streakWeeks, 16),
    unlocked: (c) => c.streakWeeks >= 16,
  }),
  badge({
    id: 'hours-100',
    title: 'Centurion du temps',
    description: 'Cumule 100 h d’entraînement.',
    emoji: '♾️',
    difficulty: 'legendary',
    progress: (c) => pct(c.lifetime.totalHours, 100),
    unlocked: (c) => c.lifetime.totalHours >= 100,
  }),
  badge({
    id: 'level-40',
    title: 'Élite',
    description: 'Atteins le niveau 40 (vers Platine / Élite).',
    emoji: '💠',
    difficulty: 'legendary',
    progress: (c) => pct(c.level, 40),
    unlocked: (c) => c.level >= 40,
  }),
  badge({
    id: 'xp-50000',
    title: 'Légende XP',
    description: 'Cumule 50 000 XP.',
    emoji: '🌌',
    difficulty: 'legendary',
    progress: (c) => pct(c.xp, 50_000),
    unlocked: (c) => c.xp >= 50_000,
  }),
  badge({
    id: 'elevation-10000',
    title: 'Everest local',
    description: 'Cumule 10 000 m de D+.',
    emoji: '🗻',
    difficulty: 'legendary',
    progress: (c) => pct(c.lifetime.totalElevationM, 10_000),
    unlocked: (c) => c.lifetime.totalElevationM >= 10_000,
  }),
  badge({
    id: 'social-king',
    title: 'Roi social',
    description: '20 abonnements et 1 000 likes envoyés.',
    emoji: '🦁',
    difficulty: 'legendary',
    progress: (c) => Math.min(pct(c.following, 20), pct(c.likesGiven, 1000)),
    unlocked: (c) => c.following >= 20 && c.likesGiven >= 1000,
  }),
  badge({
    id: 'programs-10',
    title: 'Architecte',
    description: 'Termine 10 programmes.',
    emoji: '🏛️',
    difficulty: 'legendary',
    progress: (c) => pct(c.programHistoryCount, 10),
    unlocked: (c) => c.programHistoryCount >= 10,
  }),

  // Échelles infinies programmes lancés + likes (générées dynamiquement)
  // Sommeil : nuits importées + régularité
  ...sleepImportBadges(),
  ...sleepStreakBadges(),
];

export type NewlyUnlockedBadge = {
  id: string;
  title: string;
  difficulty: BadgeDifficulty;
  xpReward: number;
};

export type UnlockAchievementsResult = {
  achievements: Achievement[];
  newlyUnlocked: NewlyUnlockedBadge[];
};

function buildContext(input: {
  lifetime: LifetimeStats;
  feedbacks: RpeFeedback[];
  sessionHour?: number;
  ranked?: RankedProgress;
  likedPrograms?: number;
  likedSessions?: number;
  likesGiven?: number;
  following?: number;
  followers?: number;
  hasActiveProgram?: boolean;
  programHistoryCount?: number;
  programsLaunched?: number;
  sleepNights?: number;
  sleepStreak?: number;
}): BadgeContext {
  const likedPrograms = input.likedPrograms ?? 0;
  const likedSessions = input.likedSessions ?? 0;
  const likesGiven =
    input.likesGiven ?? likedPrograms + likedSessions;
  return {
    lifetime: input.lifetime,
    feedbacks: input.feedbacks,
    sessionHour: input.sessionHour,
    streakWeeks: input.ranked?.streakWeeks ?? 0,
    level: input.ranked?.level ?? 1,
    xp: input.ranked?.xp ?? 0,
    likedPrograms,
    likesGiven,
    following: input.following ?? 0,
    followers: input.followers ?? 0,
    hasActiveProgram: input.hasActiveProgram ?? false,
    programHistoryCount: input.programHistoryCount ?? 0,
    programsLaunched: input.programsLaunched ?? 0,
    sleepNights: input.sleepNights ?? 0,
    sleepStreak: input.sleepStreak ?? 0,
  };
}

/** Déblocage badges + XP selon difficulté */
export function unlockAchievements(input: {
  achievements: Achievement[];
  lifetime: LifetimeStats;
  feedbacks: RpeFeedback[];
  sessionHour?: number;
  ranked?: RankedProgress;
  likedPrograms?: number;
  likedSessions?: number;
  likesGiven?: number;
  following?: number;
  followers?: number;
  hasActiveProgram?: boolean;
  programHistoryCount?: number;
  programsLaunched?: number;
  sleepNights?: number;
  sleepStreak?: number;
}): UnlockAchievementsResult {
  const now = new Date().toISOString();
  const ctx = buildContext(input);
  const newlyUnlocked: NewlyUnlockedBadge[] = [];

  const byId = new Map(input.achievements.map((a) => [a.id, { ...a }]));
  const catalog = [...BADGE_CATALOG, ...infiniteLadderUnlockDefs(ctx)];
  for (const badgeDef of catalog) {
    const existing = byId.get(badgeDef.id) ?? {
      id: badgeDef.id,
      title: badgeDef.title,
      description: badgeDef.description,
    };
    const next = {
      ...existing,
      title: badgeDef.title,
      description: badgeDef.description,
    };
    if (badgeDef.unlocked(ctx) && !next.unlockedAt) {
      next.unlockedAt = now;
      newlyUnlocked.push({
        id: badgeDef.id,
        title: badgeDef.title,
        difficulty: badgeDef.difficulty,
        xpReward: badgeDef.xpReward,
      });
    }
    byId.set(badgeDef.id, next);
  }
  return {
    achievements: Array.from(byId.values()),
    newlyUnlocked,
  };
}

/** Seed / sync : catalogue fixe (les échelles infinies s’ajoutent à l’usage) */
export function defaultAchievementsFromCatalog(): Achievement[] {
  return BADGE_CATALOG.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description,
  }));
}

export type BadgeViewModel = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  difficulty: BadgeDifficulty;
  difficultyLabel: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  progressLabel: string;
};

/** Terminés en tête, puis proches du déblocage. */
export function sortBadgesByProgress(badges: BadgeViewModel[]): BadgeViewModel[] {
  return [...badges].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    if (a.unlocked && b.unlocked) {
      const aAt = a.unlockedAt ? Date.parse(a.unlockedAt) : 0;
      const bAt = b.unlockedAt ? Date.parse(b.unlockedAt) : 0;
      if (aAt !== bAt) return bAt - aAt;
      return a.title.localeCompare(b.title, 'fr');
    }
    if (b.progress !== a.progress) return b.progress - a.progress;
    return a.title.localeCompare(b.title, 'fr');
  });
}

export function badgeViewModels(input: {
  achievements: Achievement[];
  lifetime: LifetimeStats;
  feedbacks: RpeFeedback[];
  ranked?: RankedProgress;
  likedPrograms?: number;
  likedSessions?: number;
  likesGiven?: number;
  following?: number;
  followers?: number;
  hasActiveProgram?: boolean;
  programHistoryCount?: number;
  programsLaunched?: number;
  sleepNights?: number;
  sleepStreak?: number;
}): BadgeViewModel[] {
  const ctx = buildContext(input);
  const unlockedMap = new Map(input.achievements.map((a) => [a.id, a]));
  const defs = [...BADGE_CATALOG, ...infiniteLadderBadgesForContext(ctx)];

  return defs.map((b) => {
    const a = unlockedMap.get(b.id);
    const unlocked = Boolean(a?.unlockedAt) || b.unlocked(ctx);
    const progress = b.progress(ctx);
    return {
      id: b.id,
      title: b.title,
      description: b.description,
      emoji: b.emoji,
      difficulty: b.difficulty,
      difficultyLabel: BADGE_DIFFICULTY_LABEL[b.difficulty],
      xpReward: b.xpReward,
      unlocked,
      unlockedAt: a?.unlockedAt,
      progress,
      progressLabel: unlocked
        ? 'Débloqué'
        : `${Math.round(progress * 100)} % · +${b.xpReward} XP`,
    };
  });
}

export function addShoeKm<T extends { id: string; km: number }>(
  shoes: T[],
  shoeId: string,
  km: number,
): T[] {
  return shoes.map((s) => (s.id === shoeId ? { ...s, km: s.km + km } : s));
}

import {
  PROGRAM_CATALOG,
  POPULAR_SPORT_CATEGORIES,
  findProgramById,
  type ProgramSportCategory,
  type TrainingProgramTemplate,
} from '../constants/programs';

export type ProgramUsageRow = {
  templateId: string;
  title: string;
  subtitle: string;
  count: number;
  rank: number;
  sportCategory: ProgramSportCategory;
  sportLabel: string;
  /** Discipline principale (affichage couleur) */
  primaryDiscipline: TrainingProgramTemplate['disciplines'][number];
};

/** Overrides communauté (simulée) — complété auto pour tout le catalogue */
const BASELINE_OVERRIDES: Record<string, number> = {
  'prog-5k': 4820,
  'prog-10k': 4210,
  'prog-semi': 3560,
  'prog-marathon': 2680,
  'prog-vma': 1620,
  'prog-trail-50': 980,
  'prog-bike-40': 980,
  'prog-bike-80': 1120,
  'prog-bike-120': 890,
  'prog-bike-fondo': 1240,
  'prog-bike-200': 540,
  'prog-bike-crit': 710,
  'prog-tri-sprint': 980,
  'prog-tri-olympique': 620,
  'prog-tri-super-sprint': 540,
  'prog-swim-50': 720,
  'prog-swim-100': 1180,
  'prog-swim-200': 940,
  'prog-swim-400': 810,
  'prog-swim-800': 640,
  'prog-swim-1500': 890,
  'prog-swim-eau-libre-1k': 480,
  'prog-swim-eau-libre': 520,
  'prog-swim-eau-libre-5k': 310,
  'prog-strength-base': 760,
  'prog-strength-tri': 480,
  'prog-ironman-70-3': 410,
  'prog-ironman-5150': 380,
  'prog-ironman': 290,
  'prog-ironman-70-3-debut': 340,
  'prog-ironman-140-6-debut': 260,
  'prog-ironman-bridge': 220,
  'prog-ironman-performance': 200,
  'prog-biathlon': 310,
  'prog-duathlon-sprint': 280,
};

/** Poids relatif par famille sport (Runna / NRC : course majoritaire, mais tri/nage visibles) */
const SPORT_WEIGHT: Record<ProgramSportCategory, number> = {
  run: 1,
  bike: 0.48,
  swim: 0.4,
  triathlon: 0.44,
  strength: 0.36,
  ironman: 0.32,
  other: 0.28,
};

const SPORT_LABEL: Record<ProgramSportCategory, string> = {
  run: 'Course',
  bike: 'Vélo',
  swim: 'Natation',
  triathlon: 'Triathlon',
  strength: 'Musculation',
  ironman: 'Ironman',
  other: 'Duathlon',
};

export function sportLabelForCategory(cat: ProgramSportCategory): string {
  return (
    POPULAR_SPORT_CATEGORIES.find((c) => c.id === cat)?.label ??
    SPORT_LABEL[cat] ??
    cat
  );
}

function defaultBaselineForTemplate(t: TrainingProgramTemplate): number {
  const weight = SPORT_WEIGHT[t.sportCategory] ?? 0.25;
  const dist = t.distanceKm ?? 10;
  const distFactor = clamp(0.75 + Math.log10(Math.max(dist, 1) + 1) * 0.35, 0.7, 1.35);
  const levelFactor =
    t.level === 'debutant' ? 1.12 : t.level === 'intermediaire' ? 1 : 0.88;
  const weekFactor = clamp(t.weeks / 10, 0.65, 1.25);
  return Math.round(520 * weight * distFactor * levelFactor * weekFactor);
}

function baselineForTemplate(t: TrainingProgramTemplate): number {
  return BASELINE_OVERRIDES[t.id] ?? defaultBaselineForTemplate(t);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function calendarDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isRankableProgramId(id: string | undefined | null): id is string {
  if (!id || id === 'custom' || id.startsWith('custom-')) return false;
  return Boolean(findProgramById(id));
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Compteur communauté cumulé depuis le lancement (simulation stable).
 * +1 local si l'utilisateur a ce programme lancé (non supprimé).
 */
export function usageCountForTemplate(
  templateId: string,
  countedTemplateId?: string | null,
): number {
  const template = findProgramById(templateId);
  const base = template ? baselineForTemplate(template) : 180;
  const h = hashStr(`alltime|${templateId}`);
  const drift = (h % 241) - 120;
  const community = Math.max(48, base + Math.round((base * drift) / 1800) + (h % 53));
  const local = countedTemplateId === templateId ? 1 : 0;
  return community + local;
}

function rowFromTemplate(
  t: TrainingProgramTemplate,
  counted: string | null,
): Omit<ProgramUsageRow, 'rank'> {
  return {
    templateId: t.id,
    title: t.title,
    subtitle: t.subtitle,
    count: usageCountForTemplate(t.id, counted),
    sportCategory: t.sportCategory,
    sportLabel: sportLabelForCategory(t.sportCategory),
    primaryDiscipline: t.disciplines[0] ?? 'run',
  };
}

function allUsageRows(
  counted: string | null,
  sportFilter?: ProgramSportCategory | 'all',
): Omit<ProgramUsageRow, 'rank'>[] {
  let pool = PROGRAM_CATALOG;
  if (sportFilter && sportFilter !== 'all') {
    pool = pool.filter((t) => t.sportCategory === sportFilter);
  }
  return pool.map((t) => rowFromTemplate(t, counted));
}

function rankRows(rows: Omit<ProgramUsageRow, 'rank'>[]): ProgramUsageRow[] {
  const sorted = [...rows].sort(
    (a, b) => b.count - a.count || a.title.localeCompare(b.title, 'fr'),
  );
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Classement global ou filtré par sport (totaux depuis le lancement) */
export function buildProgramUsageRanking(
  countedTemplateId?: string | null,
  _now: Date = new Date(),
  limit = 5,
  sportFilter: ProgramSportCategory | 'all' = 'all',
): ProgramUsageRow[] {
  const counted = isRankableProgramId(countedTemplateId) ? countedTemplateId : null;
  return rankRows(allUsageRows(counted, sportFilter)).slice(0, limit);
}

/**
 * Top mixte multi-disciplines : les plus populaires + au moins 1 programme par sport.
 * Évite un top 5 100 % course à pied.
 */
export function buildMixedProgramUsageRanking(
  countedTemplateId?: string | null,
  _now: Date = new Date(),
  limit = 8,
): ProgramUsageRow[] {
  const counted = isRankableProgramId(countedTemplateId) ? countedTemplateId : null;
  const all = rankRows(allUsageRows(counted, 'all'));

  const picked = new Set<string>();
  const result: ProgramUsageRow[] = [];

  for (const row of all.slice(0, 2)) {
    if (picked.has(row.templateId)) continue;
    picked.add(row.templateId);
    result.push(row);
  }

  const categories: ProgramSportCategory[] = [
    'run',
    'bike',
    'swim',
    'triathlon',
    'strength',
    'ironman',
    'other',
  ];

  for (const cat of categories) {
    const best = all.find((r) => r.sportCategory === cat && !picked.has(r.templateId));
    if (best) {
      picked.add(best.templateId);
      result.push(best);
    }
  }

  for (const row of all) {
    if (result.length >= limit) break;
    if (picked.has(row.templateId)) continue;
    picked.add(row.templateId);
    result.push(row);
  }

  return result.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Top N par sport (pour l'écran wizard) */
export function topProgramsForSport(
  sport: ProgramSportCategory,
  countedTemplateId?: string | null,
  limit = 5,
  now: Date = new Date(),
): ProgramUsageRow[] {
  return buildProgramUsageRanking(countedTemplateId, now, limit, sport);
}

export function usageCountLabel(n: number): string {
  return n.toLocaleString('fr-FR');
}

/** Libellé sous le compteur (cumul depuis le lancement) */
export function usageCountCaption(): string {
  return 'lancés au total';
}

/** Vérifie que chaque programme catalogue a un baseline (sync auto) */
export function assertCatalogBaselinesSynced(): string[] {
  return PROGRAM_CATALOG.filter((t) => baselineForTemplate(t) < 20).map((t) => t.id);
}

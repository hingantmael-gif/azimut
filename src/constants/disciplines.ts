import type { SportDiscipline } from '../types/domain';
import { colors } from '../theme/tokens';

export const DISCIPLINE_META: Record<
  SportDiscipline,
  { label: string; color: string; short: string }
> = {
  run: { label: 'Course', color: colors.accent, short: 'Course' },
  bike: { label: 'Cyclisme', color: '#3B82F6', short: 'Cycl.' },
  swim: { label: 'Natation', color: '#06B6D4', short: 'Nage' },
  brick: { label: 'Enchaînement', color: '#8B5CF6', short: 'Brick' },
  strength: { label: 'Musculation', color: '#EF4444', short: 'Mus.' },
  ppg: { label: 'PPG', color: '#F59E0B', short: 'PPG' },
  mobility: { label: 'Mobilité', color: '#10B981', short: 'Mob.' },
  rest: { label: 'Repos', color: colors.textMuted, short: 'Repos' },
};

export const EDITABLE_DISCIPLINES: SportDiscipline[] = [
  'run',
  'bike',
  'swim',
  'brick',
  'strength',
  'ppg',
  'mobility',
  'rest',
];

export const DISCIPLINE_DEFAULT_TITLE: Record<SportDiscipline, string> = {
  run: 'Course',
  bike: 'Cyclisme',
  swim: 'Natation',
  brick: 'Enchaînement vélo → course',
  strength: 'Musculation',
  ppg: 'PPG',
  mobility: 'Mobilité / étirements',
  rest: 'Repos actif',
};

export function disciplineColor(d: SportDiscipline): string {
  return DISCIPLINE_META[d]?.color ?? colors.textMuted;
}

/** Import GPX/Strava — course, vélo, natation uniquement (pas muscu / PPG). */
export function supportsActivityImport(d: SportDiscipline): boolean {
  return d !== 'strength' && d !== 'ppg' && d !== 'rest' && d !== 'mobility';
}

export function formatMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

export function toIsoDate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();
  const cells: Array<{ day: number | null; date: string | null }> = [];

  for (let i = 0; i < startPad; i++) cells.push({ day: null, date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: toIsoDate(year, month, d) });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, date: null });

  return cells;
}

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

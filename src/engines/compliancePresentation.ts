import type { ComplianceBreakdown } from '../types/domain';

/** Libellés grand public — évite le jargon « conformité » */
export const PLAN_MATCH_SHORT_LABEL = 'vs plan';
export const PLAN_MATCH_TITLE = 'Fidélité au plan';

/** Phrase courte selon le score (ex. carte activité) */
export function planMatchHeadline(totalPct: number): string {
  if (totalPct >= 90) return 'Très proche du plan';
  if (totalPct >= 75) return 'Bien suivi';
  if (totalPct >= 50) return 'Partiellement suivi';
  if (totalPct >= 25) return 'Assez éloigné du plan';
  return 'Loin du plan prévu';
}

/** Explication en français simple */
export function planMatchExplanation(c: ComplianceBreakdown): string {
  return (
    `${c.total}% = à quel point ta séance collait au plan du coach. ` +
    `Distance & durée ${c.volumeScore}% · effort (allure/FC) ${c.intensityScore}% · ` +
    `régularité de l’effort ${c.regularityScore}%.`
  );
}

export function planMatchDetailLines(c: ComplianceBreakdown): {
  label: string;
  hint: string;
  pct: number;
}[] {
  return [
    {
      label: 'Distance & durée',
      hint: 'As-tu fait à peu près la longueur / le temps prévu ?',
      pct: c.volumeScore,
    },
    {
      label: 'Effort (allure / FC)',
      hint: 'Étais-tu dans la zone d’intensité demandée ?',
      pct: c.intensityScore,
    },
    {
      label: 'Régularité',
      hint: 'L’effort est-il resté stable, sans gros à-coups ?',
      pct: c.regularityScore,
    },
  ];
}

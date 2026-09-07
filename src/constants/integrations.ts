/** Libellés français — statut « Connecté » / « Non connecté » */
export const INTEGRATION_LABELS: Record<string, string> = {
  garmin: 'Garmin Connect',
  apple_health: 'Apple Santé',
  health_connect: 'Health Connect',
};

export function integrationStatus(connected: boolean): string {
  return connected ? 'Connecté' : 'Non connecté';
}

export function formatSyncDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

import type { AppState } from '../data/seed';
import type { StravaActivity } from '../types/domain';

/**
 * Synchronisation entre appareils : quels champs partent sur le serveur, et comment on fusionne
 * l'instantané distant avec l'état local. Logique pure (testée) — le réseau est dans services/cloudSync.
 */

export type SyncFields = Pick<
  AppState,
  'profile' | 'health' | 'plan' | 'activities' | 'analyses' | 'feedbacks' | 'banister' | 'lifetime' | 'progress'
> & { coachAdaptations?: string[] };

export type SyncSnapshot = { savedAt: string; deviceId: string; state: SyncFields };

const MAX_ACTIVITIES = 400;
const MAX_TRACK_POINTS = 600;

/** Réduit un tracé GPS à ~600 points (le serveur n'a pas besoin du détail seconde par seconde). */
export function downsampleTrack<T>(points: T[] | undefined, max = MAX_TRACK_POINTS): T[] | undefined {
  if (!points || points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]!);
  return out;
}

/** Version compacte d'une activité pour le cloud : on garde le tracé (sous-échantillonné), pas les flux détaillés. */
export function compactActivity(a: StravaActivity): StravaActivity {
  if (!a.streams) return a;
  const latlng = downsampleTrack(a.streams.latlng);
  return {
    ...a,
    streams: latlng ? { time: (downsampleTrack(a.streams.time) ?? []) as number[], latlng } : undefined,
  };
}

export function extractSyncFields(state: AppState): SyncFields {
  return {
    profile: state.profile,
    health: state.health,
    plan: state.plan,
    activities: state.activities.slice(0, MAX_ACTIVITIES).map(compactActivity),
    analyses: state.analyses,
    feedbacks: state.feedbacks,
    banister: state.banister,
    lifetime: state.lifetime,
    progress: state.progress,
    coachAdaptations: state.coachAdaptations,
  };
}

/** Empreinte stable et bon marché d'un instantané (pour ne pas renvoyer deux fois la même chose). */
/** JSON à clés triées : deux appareils qui ont le même contenu obtiennent la même empreinte. */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map((x) => stableStringify(x)).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(',')}}`;
}

export function fingerprint(fields: SyncFields): string {
  const s = stableStringify(fields);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `${s.length}:${h}`;
}

/** Compte neuf : rien à protéger, on peut adopter les données distantes sans risque. */
export function isFreshLocal(state: Pick<AppState, 'activities' | 'plan' | 'profile'>): boolean {
  return (
    state.activities.length === 0 &&
    state.plan.length === 0 &&
    !state.profile.activeProgram &&
    !(state.profile.activePrograms?.length)
  );
}

function unionBy<T>(local: T[], remote: T[], key: (x: T) => string, order?: (a: T, b: T) => number): T[] {
  const map = new Map<string, T>();
  for (const r of remote) map.set(key(r), r);
  for (const l of local) map.set(key(l), l); // le local gagne à identifiant égal (il peut porter le tracé complet)
  const all = [...map.values()];
  return order ? all.sort(order) : all;
}

/**
 * Fusionne l'état distant dans l'état local.
 * - Activités : UNION (jamais de perte d'une sortie enregistrée sur l'un ou l'autre appareil).
 * - Autres données : celle qui a été modifiée en dernier gagne (`remoteIsNewer`), ou le distant si le local est neuf.
 * - Identité du compte (id, e-mail, identifiant, prénom, nom) : toujours celle de l'appareil.
 */
export function mergeRemote(local: AppState, remote: SyncFields, remoteIsNewer: boolean): Partial<AppState> {
  const takeRemote = remoteIsNewer || isFreshLocal(local);
  const activities = unionBy(
    local.activities,
    remote.activities ?? [],
    (a) => a.id,
    (a, b) => b.startDate.localeCompare(a.startDate),
  ).slice(0, MAX_ACTIVITIES);
  const analyses = unionBy(local.analyses, remote.analyses ?? [], (a) => `${a.activityId}:${a.plannedWorkoutId}`);
  const feedbacks = unionBy(local.feedbacks, remote.feedbacks ?? [], (f) => `${f.sessionId}:${f.submittedAt}`);

  const identity = {
    id: local.profile.id,
    email: local.profile.email,
    username: local.profile.username,
    firstName: local.profile.firstName,
    lastName: local.profile.lastName,
    emailVerified: local.profile.emailVerified,
  };
  const profile = takeRemote
    ? {
        ...local.profile,
        ...remote.profile,
        ...identity,
        // Les jetons d'intégrations restent propres à l'appareil.
        integrations: local.profile.integrations,
      }
    : local.profile;

  return {
    activities,
    analyses,
    feedbacks,
    profile,
    ...(takeRemote
      ? {
          plan: remote.plan ?? local.plan,
          health: remote.health ?? local.health,
          banister: remote.banister ?? local.banister,
          lifetime: remote.lifetime ?? local.lifetime,
          progress: remote.progress ?? local.progress,
          coachAdaptations: remote.coachAdaptations ?? local.coachAdaptations,
        }
      : {}),
  };
}

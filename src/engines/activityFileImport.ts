import type { ActivityStream, StravaActivity } from '../types/domain';
import { formatDuration, formatPace } from './core';

export type ImportedActivityMetrics = StravaActivity & {
  avgPaceSecPerKm?: number;
  avgHr?: number;
  maxHr?: number;
  sourceFormat: 'gpx' | 'tcx';
  pointCount: number;
};

/** ~1 km/h : en dessous = arrêt / pause ravitaillement */
const MOVING_SPEED_MPS = 0.28;
/** Gap max encore « suivi » à vitesse nulle (bruit GPS) — au-delà = pause */
const MAX_IDLE_GAP_SEC = 12;

function textContent(tag: string, xml: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function allMatches(re: RegExp, xml: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  while ((m = r.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function avg(nums: number[]): number | undefined {
  if (!nums.length) return undefined;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function parseIsoDurationToSec(iso: string): number | null {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/i);
  if (!m) return null;
  return (
    (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + Math.round(Number(m[3]) || 0)
  );
}

/**
 * Temps d'horloge (1er → dernier point) vs temps en mouvement
 * (somme des intervalles où la vitesse ≥ seuil — hors pauses / attentes).
 */
export function computeMovingAndElapsed(
  times: number[],
  distances: number[],
): { elapsedSec: number; movingSec: number } {
  if (times.length === 0) return { elapsedSec: 0, movingSec: 0 };
  if (times.length === 1) return { elapsedSec: Math.max(0, times[0]), movingSec: 0 };

  const elapsedSec = Math.max(0, times[times.length - 1] - times[0]);
  let movingSec = 0;

  for (let i = 1; i < times.length; i++) {
    const dt = times[i] - times[i - 1];
    if (dt <= 0) continue;
    const dd = Math.max(0, (distances[i] ?? 0) - (distances[i - 1] ?? 0));
    const speed = dd / dt;
    if (speed >= MOVING_SPEED_MPS) {
      movingSec += dt;
    } else if (dt <= MAX_IDLE_GAP_SEC && dd >= 0.5) {
      // Micro-déplacements GPS encore considérés en mouvement lent
      movingSec += dt;
    }
    // sinon : pause (ravito, attente…) — non comptée
  }

  return { elapsedSec, movingSec: Math.round(movingSec) };
}

/**
 * Temps d'activité (moving) — hors pauses / attentes.
 * Priorité : laps TCX si plus courts que le temps d'horloge, sinon GPS, sinon elapsed.
 */
function resolveActivityTime(opts: {
  distanceM: number;
  elapsedSec: number;
  movingFromGps: number;
  movingFromLaps?: number;
}): { elapsedSec: number; movingSec: number } {
  const elapsed = Math.max(0, Math.round(opts.elapsedSec));
  const fromGps = Math.max(0, Math.round(opts.movingFromGps));
  const fromLaps =
    opts.movingFromLaps != null && opts.movingFromLaps > 0
      ? Math.round(opts.movingFromLaps)
      : 0;

  // Laps Strava / montre utiles seulement s'ils sont clairement < temps global
  const lapsUsable =
    fromLaps > 0 && (elapsed === 0 || fromLaps < elapsed * 0.98) ? fromLaps : 0;
  const gpsUsable =
    fromGps > 0 && (elapsed === 0 || fromGps <= elapsed * 1.02) ? fromGps : 0;

  let moving = 0;
  if (lapsUsable > 0 && gpsUsable > 0) {
    const ratio = Math.min(lapsUsable, gpsUsable) / Math.max(lapsUsable, gpsUsable);
    moving = ratio < 0.85 ? lapsUsable : Math.min(lapsUsable, gpsUsable);
  } else if (lapsUsable > 0) {
    moving = lapsUsable;
  } else if (gpsUsable > 0) {
    moving = gpsUsable;
  } else if (elapsed > 0) {
    moving = elapsed;
  }

  // Garde-fou : allure < 2'30"/km sur > 3 km → trop rapide, reprendre elapsed
  if (opts.distanceM > 3000 && moving > 0) {
    const pace = moving / (opts.distanceM / 1000);
    if (pace < 150 && elapsed > moving) moving = elapsed;
  }

  if (moving <= 0 && opts.distanceM > 0) {
    moving = Math.round((opts.distanceM / 1000) * 360);
  }

  moving = Math.max(60, moving);
  return { elapsedSec: Math.max(moving, elapsed || moving), movingSec: moving };
}

function paceFrom(distanceM: number, movingSec: number): number | undefined {
  if (distanceM <= 0 || movingSec <= 0) return undefined;
  return movingSec / (distanceM / 1000);
}

/** Réduit le tracé pour stockage / carte (qualité visuelle type Strava). */
export function downsampleLatLng(
  points: [number, number][],
  maxPoints = 2500,
): [number, number][] {
  if (points.length <= maxPoints) return points;
  const out: [number, number][] = [];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(points.length - 1, Math.round(i * step));
    out.push(points[idx]);
  }
  return out;
}

/** Parse TCX (meilleur : FC, distance, durée) */
export function parseTcx(xml: string): ImportedActivityMetrics {
  const name =
    textContent('Name', xml) ||
    textContent('Notes', xml) ||
    'Activité Strava (TCX)';

  // TotalTimeSeconds des Lap (souvent = temps d'activité Strava, hors pauses longues)
  const lapTimes = allMatches(/<TotalTimeSeconds>([^<]+)<\/TotalTimeSeconds>/gi, xml)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
  const movingFromLaps = lapTimes.length ? lapTimes.reduce((a, b) => a + b, 0) : 0;

  const totalTimeFallback =
    Number(textContent('TotalTimeSeconds', xml)) ||
    parseIsoDurationToSec(textContent('Duration', xml) ?? '') ||
    0;

  let distanceM = 0;
  const lapDists = allMatches(
    /<Lap[\s\S]*?<DistanceMeters>([^<]+)<\/DistanceMeters>/gi,
    xml,
  ).map(Number);
  if (lapDists.length) {
    distanceM = lapDists.filter((n) => Number.isFinite(n)).reduce((a, b) => a + b, 0);
  }
  if (!distanceM) {
    // Premier DistanceMeters de Lap souvent ; éviter les trackpoints
    const lapBlock = xml.match(/<Lap\b[\s\S]*?<DistanceMeters>([^<]+)<\/DistanceMeters>/i);
    distanceM = lapBlock ? Number(lapBlock[1]) : 0;
  }

  const hrValues = allMatches(
    /<(?:HeartRateBpm[^>]*>\s*<Value>|ns3:hr>|gpxtpx:hr>)(\d+)/gi,
    xml,
  ).map(Number);

  const tpBlocks = xml.match(/<Trackpoint>[\s\S]*?<\/Trackpoint>/gi) ?? [];
  const times: number[] = [];
  const distances: number[] = [];
  const hrs: number[] = [];
  const velocities: number[] = [];
  const latlng: [number, number][] = [];
  let startIso: string | null = null;
  let prevLat: number | null = null;
  let prevLon: number | null = null;
  let cumDist = 0;
  let prevT: number | null = null;

  for (const block of tpBlocks) {
    const tStr = textContent('Time', block);
    if (tStr && !startIso) startIso = tStr;
    const tMs = tStr ? Date.parse(tStr) : NaN;
    const tSec =
      Number.isFinite(tMs) && startIso
        ? Math.max(0, Math.round((tMs - Date.parse(startIso)) / 1000))
        : times.length;

    const lat = Number(textContent('LatitudeDegrees', block));
    const lon = Number(textContent('LongitudeDegrees', block));
    const distTag = Number(textContent('DistanceMeters', block));
    const hrBlock = block.match(/<HeartRateBpm[\s\S]*?<\/HeartRateBpm>/i)?.[0];
    const hrRaw = hrBlock ? Number(textContent('Value', hrBlock)) : NaN;
    const hr = Number.isFinite(hrRaw) && hrRaw > 0 ? hrRaw : undefined;

    if (Number.isFinite(distTag) && distTag >= 0) {
      cumDist = distTag;
    } else if (
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      prevLat != null &&
      prevLon != null
    ) {
      cumDist += haversineM(prevLat, prevLon, lat, lon);
    }
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      prevLat = lat;
      prevLon = lon;
      latlng.push([lat, lon]);
    }

    times.push(tSec);
    distances.push(cumDist);
    if (hr && hr > 0) hrs.push(hr);

    if (prevT != null && tSec > prevT) {
      const dd = distances[distances.length - 1] - (distances[distances.length - 2] ?? 0);
      const dt = tSec - prevT;
      velocities.push(dt > 0 ? dd / dt : 0);
    } else {
      velocities.push(0);
    }
    prevT = tSec;
  }

  if (!distanceM && cumDist > 0) distanceM = cumDist;

  const { elapsedSec: wallElapsed, movingSec: movingFromGps } = computeMovingAndElapsed(
    times,
    distances,
  );
  const elapsedFromFile =
    wallElapsed > 0 ? wallElapsed : totalTimeFallback > 0 ? totalTimeFallback : 0;

  const { elapsedSec, movingSec } = resolveActivityTime({
    distanceM,
    elapsedSec: elapsedFromFile,
    movingFromGps,
    movingFromLaps,
  });

  const allHr = [...hrValues, ...hrs].filter((h) => h > 30 && h < 230);
  const avgHr = avg(allHr);
  const maxHr = allHr.length ? Math.max(...allHr) : undefined;
  const avgPaceSecPerKm = paceFrom(distanceM, movingSec);
  const route = downsampleLatLng(latlng);

  const streams: ActivityStream | undefined =
    times.length > 2 || route.length > 2
      ? {
          time: times,
          latlng: route.length > 1 ? route : undefined,
          heartrate: allHr.length ? times.map((_, i) => hrs[i] ?? allHr[0]) : undefined,
          velocitySmooth: velocities,
        }
      : undefined;

  return {
    id: `tcx-${Date.now()}`,
    name: name.slice(0, 80),
    distanceM: Math.round(distanceM),
    elapsedSec,
    movingSec,
    startDate: startIso ?? new Date().toISOString(),
    streams,
    avgPaceSecPerKm,
    avgHr: avgHr ? Math.round(avgHr) : undefined,
    maxHr,
    sourceFormat: 'tcx',
    pointCount: tpBlocks.length,
  };
}

/** Parse GPX (GPS + extensions FC éventuelles) */
export function parseGpx(xml: string): ImportedActivityMetrics {
  const name = textContent('name', xml) || 'Activité Strava (GPX)';
  const trkpts = xml.match(/<trkpt\b[^>]*>[\s\S]*?<\/trkpt>/gi) ?? [];

  const times: number[] = [];
  const distances: number[] = [];
  const velocities: number[] = [];
  const hrs: number[] = [];
  const latlng: [number, number][] = [];
  let startIso: string | null = null;
  let prevLat: number | null = null;
  let prevLon: number | null = null;
  let cumDist = 0;
  let prevT: number | null = null;

  for (const pt of trkpts) {
    const latM = pt.match(/lat="([^"]+)"/i);
    const lonM = pt.match(/lon="([^"]+)"/i);
    const lat = latM ? Number(latM[1]) : NaN;
    const lon = lonM ? Number(lonM[1]) : NaN;
    const tStr = textContent('time', pt);
    if (tStr && !startIso) startIso = tStr;
    const tMs = tStr ? Date.parse(tStr) : NaN;
    const tSec =
      Number.isFinite(tMs) && startIso
        ? Math.max(0, Math.round((tMs - Date.parse(startIso)) / 1000))
        : times.length;

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      prevLat != null &&
      prevLon != null
    ) {
      cumDist += haversineM(prevLat, prevLon, lat, lon);
    }
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      prevLat = lat;
      prevLon = lon;
      latlng.push([lat, lon]);
    }

    const hrMatch =
      pt.match(/<(?:gpxtpx:hr|hr|ns3:hr)[^>]*>(\d+)/i) ||
      pt.match(/<HeartRateBpm>[\s\S]*?<Value>(\d+)/i);
    if (hrMatch) hrs.push(Number(hrMatch[1]));

    times.push(tSec);
    distances.push(cumDist);
    if (prevT != null && tSec > prevT) {
      const dd = cumDist - (distances[distances.length - 2] ?? 0);
      velocities.push(tSec - prevT > 0 ? dd / (tSec - prevT) : 0);
    } else velocities.push(0);
    prevT = tSec;
  }

  const { elapsedSec: wallElapsed, movingSec: movingFromGps } = computeMovingAndElapsed(
    times,
    distances,
  );
  const distanceM = Math.round(cumDist);
  const { elapsedSec, movingSec } = resolveActivityTime({
    distanceM,
    elapsedSec: wallElapsed,
    movingFromGps,
  });

  const avgHr = avg(hrs.filter((h) => h > 30 && h < 230));
  const maxHr = hrs.length ? Math.max(...hrs) : undefined;
  const avgPaceSecPerKm = paceFrom(distanceM, movingSec);
  const route = downsampleLatLng(latlng);

  return {
    id: `gpx-${Date.now()}`,
    name: name.slice(0, 80),
    distanceM,
    elapsedSec,
    movingSec,
    startDate: startIso ?? new Date().toISOString(),
    streams:
      times.length > 2 || route.length > 2
        ? {
            time: times,
            latlng: route.length > 1 ? route : undefined,
            velocitySmooth: velocities,
            heartrate: hrs.length ? times.map((_, i) => hrs[i] ?? hrs[0]) : undefined,
          }
        : undefined,
    avgPaceSecPerKm,
    avgHr: avgHr ? Math.round(avgHr) : undefined,
    maxHr,
    sourceFormat: 'gpx',
    pointCount: trkpts.length,
  };
}

export function parseActivityFile(filename: string, content: string): ImportedActivityMetrics {
  const lower = filename.toLowerCase();
  const trimmed = content.trim();
  if (lower.endsWith('.tcx') || trimmed.includes('<TrainingCenterDatabase')) {
    return parseTcx(content);
  }
  if (lower.endsWith('.gpx') || trimmed.includes('<gpx')) {
    return parseGpx(content);
  }
  throw new Error('Format non reconnu. Utilisez un fichier .gpx ou .tcx exporté depuis Strava.');
}

export function formatImportedSummary(a: ImportedActivityMetrics): string {
  const km = (a.distanceM / 1000).toFixed(2).replace('.', ',');
  const pace = a.avgPaceSecPerKm != null ? formatPace(a.avgPaceSecPerKm) : null;
  const parts = [
    `${km} km`,
    formatDuration(a.movingSec),
    pace,
    a.avgHr ? `FC moy. ${a.avgHr} bpm` : null,
    a.maxHr ? `FC max ${a.maxHr}` : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

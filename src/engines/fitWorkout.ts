import type { PlannedWorkout, WorkoutStep } from '../types/domain';

/**
 * Encodeur de séance au format FIT (« Workout ») — le format que les montres Garmin comprennent nativement.
 * Un fichier .fit copié dans GARMIN/NewFiles de la montre (USB) apparaît dans Entraînement → Séances.
 *
 * Structure : en-tête 14 octets · messages (définition + données) · CRC 16 bits.
 * Messages : file_id (0) · workout (26) · workout_step (27).
 */

// Types de base FIT
const ENUM = 0x00;
const UINT8 = 0x02;
const UINT16 = 0x84;
const UINT32 = 0x86;
const STRING = 0x07;
const UINT32Z = 0x8c;

const MESG_FILE_ID = 0;
const MESG_WORKOUT = 26;
const MESG_WORKOUT_STEP = 27;

// Valeurs de l'énumération FIT
const FILE_TYPE_WORKOUT = 5;
const SPORT: Record<string, number> = { run: 1, bike: 2, swim: 5, strength: 10 };
const DURATION_TIME = 0;
const DURATION_DISTANCE = 1;
const DURATION_OPEN = 5;
const DURATION_REPEAT_UNTIL_STEPS_CMPLT = 6;
const TARGET_SPEED = 0;
const TARGET_HEART_RATE = 1;
const TARGET_OPEN = 2;
const TARGET_POWER = 4;
const INTENSITY: Record<WorkoutStep['type'], number> = { active: 0, rest: 1, warmup: 2, cooldown: 3 };

/** 31/12/1989 00:00 UTC : origine des horodatages FIT. */
const FIT_EPOCH_OFFSET_S = 631065600;

const NAME_LEN = 32; // « wkt_name » : 32 octets (terminé par 0)
const STEP_NAME_LEN = 16;

const CRC_TABLE = [0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400];

export function fitCrc(bytes: ArrayLike<number>, start = 0, end = bytes.length, seed = 0): number {
  let crc = seed;
  for (let i = start; i < end; i++) {
    const b = bytes[i]!;
    let tmp = CRC_TABLE[crc & 0xf]!;
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[b & 0xf]!;
    tmp = CRC_TABLE[crc & 0xf]!;
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[(b >> 4) & 0xf]!;
  }
  return crc & 0xffff;
}

class Writer {
  private buf: number[] = [];
  get bytes(): number[] {
    return this.buf;
  }
  u8(v: number) {
    this.buf.push(v & 0xff);
  }
  u16(v: number) {
    this.buf.push(v & 0xff, (v >> 8) & 0xff);
  }
  u32(v: number) {
    const n = v >>> 0;
    this.buf.push(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff);
  }
  str(s: string, len: number) {
    // ASCII sans accents (les montres n'affichent pas tous les caractères) + terminaison 0
    const clean = s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\x20-\x7e]/g, ' ')
      .slice(0, len - 1);
    for (let i = 0; i < len; i++) this.buf.push(i < clean.length ? clean.charCodeAt(i) : 0);
  }
}

type FieldDef = [num: number, size: number, base: number];

function definition(w: Writer, local: number, global: number, fields: FieldDef[]) {
  w.u8(0x40 | local); // en-tête : définition
  w.u8(0); // réservé
  w.u8(0); // architecture : petit-boutiste
  w.u16(global);
  w.u8(fields.length);
  for (const [num, size, base] of fields) {
    w.u8(num);
    w.u8(size);
    w.u8(base);
  }
}

type EncodedStep = {
  name: string;
  durationType: number;
  durationValue: number;
  targetType: number;
  targetValue: number;
  low: number;
  high: number;
  intensity: number;
};

function encodeStep(step: WorkoutStep): EncodedStep {
  let durationType = DURATION_OPEN;
  let durationValue = 0;
  if (step.endCondition === 'distance' && step.distanceMeters) {
    durationType = DURATION_DISTANCE;
    durationValue = Math.round(step.distanceMeters * 100); // centimètres
  } else if (step.durationSec) {
    durationType = DURATION_TIME;
    durationValue = Math.round(step.durationSec * 1000); // millisecondes
  }

  let targetType = TARGET_OPEN;
  let low = 0;
  let high = 0;
  const t = step.target;
  if (t?.type === 'pace' && t.minSecPerKm > 0 && t.maxSecPerKm > 0) {
    // Allure → vitesse (m/s × 1000) ; l'allure la plus rapide donne la vitesse haute.
    targetType = TARGET_SPEED;
    low = Math.round((1000 / t.maxSecPerKm) * 1000);
    high = Math.round((1000 / t.minSecPerKm) * 1000);
  } else if (t?.type === 'hr') {
    targetType = TARGET_HEART_RATE;
    low = Math.round(t.minBpm) + 100; // FIT : 100 + bpm pour une valeur personnalisée
    high = Math.round(t.maxBpm) + 100;
  } else if (t?.type === 'power') {
    targetType = TARGET_POWER;
    low = Math.round(t.minWatts) + 1000; // FIT : 1000 + watts
    high = Math.round(t.maxWatts) + 1000;
  }

  // Nom court lisible sur la montre : la partie avant « · » de l'intitulé, sans balise technique.
  const raw = (step.label ?? '').replace(/^\[calis:[^\]]*\]\s*/i, '');
  const name = raw.split('·')[0]!.trim();
  return { name, durationType, durationValue, targetType, targetValue: 0, low, high, intensity: INTENSITY[step.type] ?? 0 };
}

const isPair = (a: WorkoutStep, b: WorkoutStep) =>
  Boolean(a.repeat && a.repeat > 1 && b.repeat === a.repeat && new Set([a.type, b.type]).size === 2 && [a.type, b.type].includes('active') && [a.type, b.type].includes('rest'));

/** Étapes FIT dans l'ordre, avec les « répéter N fois » (durée = étape de départ, cible = nombre de tours). */
export function buildFitSteps(steps: WorkoutStep[]): EncodedStep[] {
  const out: EncodedStep[] = [];
  const repeatStep = (fromIndex: number, times: number): EncodedStep => ({
    name: '',
    durationType: DURATION_REPEAT_UNTIL_STEPS_CMPLT,
    durationValue: fromIndex,
    targetType: TARGET_OPEN,
    targetValue: times,
    low: 0,
    high: 0,
    intensity: INTENSITY.active,
  });
  let i = 0;
  while (i < steps.length) {
    const step = steps[i]!;
    const next = steps[i + 1];
    if (next && isPair(step, next)) {
      const start = out.length;
      out.push(encodeStep({ ...step, repeat: undefined }), encodeStep({ ...next, repeat: undefined }));
      out.push(repeatStep(start, step.repeat!));
      i += 2;
    } else if (step.repeat && step.repeat > 1) {
      const start = out.length;
      out.push(encodeStep({ ...step, repeat: undefined }));
      out.push(repeatStep(start, step.repeat));
      i += 1;
    } else {
      out.push(encodeStep(step));
      i += 1;
    }
  }
  return out;
}

export function canEncodeFit(workout: PlannedWorkout): boolean {
  return workout.discipline in SPORT && workout.steps.length > 0;
}

/** Séance → fichier .fit (octets). */
export function encodeFitWorkout(workout: PlannedWorkout, now = new Date()): Uint8Array {
  const sport = SPORT[workout.discipline];
  if (sport == null) throw new Error(`Format FIT non pris en charge pour « ${workout.discipline} ».`);
  const steps = buildFitSteps(workout.steps);

  const data = new Writer();

  // file_id
  definition(data, 0, MESG_FILE_ID, [
    [0, 1, ENUM], // type
    [1, 2, UINT16], // manufacturer
    [2, 2, UINT16], // product
    [3, 4, UINT32Z], // serial_number
    [4, 4, UINT32], // time_created
  ]);
  data.u8(0);
  data.u8(FILE_TYPE_WORKOUT);
  data.u16(255); // fabricant « développement » : accepté par les appareils
  data.u16(0);
  data.u32(1);
  data.u32(Math.max(0, Math.floor(now.getTime() / 1000) - FIT_EPOCH_OFFSET_S));

  // workout
  definition(data, 1, MESG_WORKOUT, [
    [8, NAME_LEN, STRING], // wkt_name
    [4, 1, ENUM], // sport
    [6, 2, UINT16], // num_valid_steps
  ]);
  data.u8(1);
  data.str(workout.title, NAME_LEN);
  data.u8(sport);
  data.u16(steps.length);

  // workout_step
  definition(data, 2, MESG_WORKOUT_STEP, [
    [254, 2, UINT16], // message_index
    [0, STEP_NAME_LEN, STRING], // wkt_step_name
    [1, 1, ENUM], // duration_type
    [2, 4, UINT32], // duration_value
    [3, 1, ENUM], // target_type
    [4, 4, UINT32], // target_value (tours pour un « répéter »)
    [5, 4, UINT32], // custom_target_value_low
    [6, 4, UINT32], // custom_target_value_high
    [7, 1, ENUM], // intensity
  ]);
  steps.forEach((s, index) => {
    data.u8(2);
    data.u16(index);
    data.str(s.name, STEP_NAME_LEN);
    data.u8(s.durationType);
    data.u32(s.durationValue);
    data.u8(s.targetType);
    data.u32(s.targetValue);
    data.u32(s.low);
    data.u32(s.high);
    data.u8(s.intensity);
  });

  const body = data.bytes;
  const header = new Writer();
  header.u8(14); // taille de l'en-tête
  header.u8(0x20); // protocole 2.0
  header.u16(2140); // version du profil
  header.u32(body.length);
  header.u8(0x2e); // « . »
  header.u8(0x46); // « F »
  header.u8(0x49); // « I »
  header.u8(0x54); // « T »
  header.u16(fitCrc(header.bytes, 0, 12));

  const all = [...header.bytes, ...body];
  const crc = fitCrc(all, 0, all.length);
  all.push(crc & 0xff, (crc >> 8) & 0xff);
  return Uint8Array.from(all);
}

// Non utilisés directement mais gardés pour la lisibilité du format.
export const FIT_BASE_TYPES = { UINT8 };

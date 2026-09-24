import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { PlannedWorkout } from '../types/domain';
import { buildAppleWorkoutKitJson } from '../engines/watchFileFormats';

/** Module natif iOS (modules/mova-workoutkit) — absent sur le web, Android et les builds sans lui. */
type MovaWorkoutKitNative = {
  isSupported(): boolean;
  schedule(planJson: string): Promise<string>;
};

function nativeModule(): MovaWorkoutKitNative | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return requireOptionalNativeModule<MovaWorkoutKitNative>('MovaWorkoutKit');
  } catch {
    return null;
  }
}

/** Vrai seulement dans l'app iPhone Mova (iOS 17+) : le web / PWA ne peut pas parler à l'Apple Watch. */
export function isAppleWatchSchedulingAvailable(): boolean {
  const mod = nativeModule();
  if (!mod) return false;
  try {
    return mod.isSupported();
  } catch {
    return false;
  }
}

export type AppleScheduleResult = { ok: true } | { ok: false; reason: 'unsupported' | 'error'; error?: string };

/** Ajoute la séance à l'app Exercice de l'Apple Watch (WorkoutKit), à la date prévue. */
export async function scheduleOnAppleWatch(workout: PlannedWorkout): Promise<AppleScheduleResult> {
  const mod = nativeModule();
  if (!mod || !isAppleWatchSchedulingAvailable()) return { ok: false, reason: 'unsupported' };
  try {
    await mod.schedule(buildAppleWorkoutKitJson(workout));
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'error', error: e instanceof Error ? e.message : 'Ajout impossible.' };
  }
}

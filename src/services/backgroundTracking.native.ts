import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

/**
 * Suivi GPS en arrière-plan (écran verrouillé, téléphone en poche).
 *
 * Principe : quand une sortie est enregistrée, on démarre une mise à jour de position « de fond » avec un
 * service de premier plan (Android : notification permanente) / mode arrière-plan (iOS). Cela empêche le
 * système de suspendre l'app ; le suivi habituel (`watchPositionAsync`) continue alors de livrer les points.
 * La tâche elle-même n'a rien à faire des points : elle existe pour garder l'app vivante.
 *
 * ⚠️ Non testé sur téléphone réel dans ce dépôt — à valider sur un build de développement (EAS) avant publication.
 */
const TASK = 'mova-background-location';

if (!TaskManager.isTaskDefined(TASK)) {
  TaskManager.defineTask(TASK, async () => undefined);
}

export async function startBackgroundTracking(): Promise<boolean> {
  try {
    const perm = await Location.requestBackgroundPermissionsAsync();
    if (perm.status !== 'granted') return false;
    if (await Location.hasStartedLocationUpdatesAsync(TASK)) return true;
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 2000,
      distanceInterval: 5,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      activityType: Location.ActivityType.Fitness,
      foregroundService: {
        notificationTitle: 'Mova enregistre ta sortie',
        notificationBody: 'Le suivi GPS continue écran verrouillé.',
        notificationColor: '#0E8F6F',
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function stopBackgroundTracking(): Promise<void> {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TASK)) {
      await Location.stopLocationUpdatesAsync(TASK);
    }
  } catch {
    /* rien à arrêter */
  }
}

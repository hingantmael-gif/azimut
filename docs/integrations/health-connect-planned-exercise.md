# Health Connect — séances planifiées (Android)

## Faisabilité

**Oui.** Google Health Connect expose le type **`PlannedExerciseSessionRecord`** pour qu’une app de coaching publie un plan d’entraînement qu’une autre app (montre, tracker) peut lire et exécuter.

Disponible avec Health Connect récent (API 35+ / documentation 2024–2025).

---

## Modèle de données

```
PlannedExerciseSessionRecord
├── title, notes
├── exerciseType (RUNNING, CYCLING, SWIMMING_POOL, STRENGTH_TRAINING, …)
├── startTime / endTime  OU  startDate + duration
├── hasExplicitTime (bool)
└── blocks[] : PlannedExerciseBlock
    ├── repetitions (int)
    └── steps[] : PlannedExerciseStep
        ├── exerciseType (optionnel par step)
        ├── description
        ├── completionTarget (TIME, DISTANCE, …)
        └── performanceTarget (PACE, HEART_RATE, POWER, …)
```

Après réalisation, l’`ExerciseSessionRecord` peut référencer le plan via `plannedExerciseSessionId`.

---

## Permissions

| Rôle app | Permission |
|----------|------------|
| **Planificateur** (Azimut) | `WRITE_PLANNED_EXERCISE` |
| **Exécuteur** (app montre) | `READ_PLANNED_EXERCISE` |
| Analyse post-séance | `READ_EXERCISE`, `WRITE_EXERCISE` |
| FC pendant séance | `READ_HEART_RATE`, `WRITE_HEART_RATE` |

Déclaration dans le manifest Android + écran consentement Health Connect.

---

## Écriture (Kotlin — référence Google)

```kotlin
val plannedSession = PlannedExerciseSessionRecord(
    metadata = Metadata.manualEntry(),
    exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_RUNNING,
    startDate = LocalDate.of(2026, 8, 29),
    duration = Duration.ofMinutes(55),
    title = "Fractionné VMA",
    notes = "Généré par Azimut",
    blocks = listOf(
        PlannedExerciseBlock(
            repetitions = 1,
            steps = listOf(
                PlannedExerciseStep(
                    exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_RUNNING,
                    description = "Échauffement 10 min",
                    completionTarget = ExerciseCompletionTarget(
                        type = ExerciseCompletionTarget.EXERCISE_COMPLETION_TARGET_TYPE_TIME,
                        value = Duration.ofMinutes(10),
                    ),
                ),
            ),
        ),
        PlannedExerciseBlock(
            repetitions = 6,
            steps = listOf(
                PlannedExerciseStep(/* interval 60s, pace target */),
                PlannedExerciseStep(/* recovery 90s */),
            ),
        ),
    ),
)

healthConnectClient.insertRecords(listOf(plannedSession))
```

Voir [`examples/health-connect-planned-session.example.json`](./examples/health-connect-planned-session.example.json) pour une représentation JSON lisible (équivalent conceptuel).

---

## Types d’exercice (extrait)

| Azimut | Health Connect |
|--------|----------------|
| `run` | `EXERCISE_TYPE_RUNNING` |
| `bike` | `EXERCISE_TYPE_BIKING` |
| `swim` | `EXERCISE_TYPE_SWIMMING_POOL` ou `SWIMMING_OPEN_WATER` |
| `strength` | `EXERCISE_TYPE_STRENGTH_TRAINING` |
| `ppg` / `mobility` | `EXERCISE_TYPE_STRETCHING` / `YOGA` |

Liste complète : [Health Connect data types](https://developer.android.com/health-and-fitness/health-connect/data-types)

---

## Cibles de performance (PlannedExerciseStep)

| Azimut `PerformanceTarget` | Health Connect |
|----------------------------|----------------|
| `pace` (sec/km) | `EXERCISE_SEGMENT_TYPE_PACE` ou speed range |
| `hr` (bpm) | Heart rate range / zone |
| `power` (watts) | Power range |

---

## Intégration React Native / Expo

Nécessite :
- Module natif Android (`androidx.health.connect:connect-client`)
- Ou librairie communautaire type `react-native-health-connect`

**État Azimut :** le bouton « Health Connect » ouvre l’app système ; aucune écriture de séance.

---

## Lecture santé (fallback CDC)

Comme Apple Santé, Health Connect permet aussi de **lire** :

| Métrique | Record Health Connect |
|----------|----------------------|
| Sommeil | `SleepSessionRecord` |
| HRV | `HeartRateVariabilityRmssdRecord` |
| FC repos | `RestingHeartRateRecord` |
| Séances passées | `ExerciseSessionRecord` |

---

## Comparaison des trois plateformes

| Critère | Garmin | Apple Watch | Health Connect |
|---------|--------|-------------|----------------|
| Envoi plan structuré | ✅ Training API | ✅ WorkoutKit | ✅ PlannedExerciseSession |
| Cloud / backend | ✅ | ❌ (local iOS) | ❌ (local Android) |
| Expo sans natif | ✅ (via backend) | ❌ | ❌ |
| Guidage montre natif | ✅ | ✅ | ✅ (si app exécuteur) |

---

## Prochaines étapes Azimut

1. Ajouter `react-native-health-connect` (Android)
2. Créer `buildHealthConnectPlannedSession(PlannedWorkout)` miroir de `buildGarminWorkoutExport`
3. Demander `WRITE_PLANNED_EXERCISE` au premier export
4. Lire sommeil/HRV pour l’onglet Corps (remplacer simulation)

## Sources

- Training plans : https://developer.android.com/health-and-fitness/health-connect/features/training-plans
- PlannedExerciseSessionRecord : https://developer.android.com/reference/android/health/connect/datatypes/PlannedExerciseSessionRecord
- Exemple Google : https://github.com/android/health-samples

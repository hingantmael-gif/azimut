# Intégrations — séances programmées & santé

> Synthèse pour Azimut (training-mobile-app) — formats officiels, faisabilité, état du code.
> Dernière mise à jour : août 2026.

## Réponse rapide : peut-on envoyer des séances programmées ?

| Plateforme | Envoi séance structurée | Statut Azimut | Format |
|------------|-------------------------|---------------|--------|
| **Garmin Connect** | **Oui** (API officielle) | Implémenté (OAuth + Training API) | JSON Training API |
| **Apple Watch** (app Entraînement) | **Oui** (WorkoutKit, iOS 17+) | Non implémenté | `.workout` binaire ou WorkoutKit natif |
| **Apple Santé** (HealthKit) | **Lecture** sommeil/HRV ; **pas** de plan d’entraînement | Non implémenté | `HKWorkout`, `HKCategoryTypeIdentifierSleepAnalysis` |
| **Health Connect** (Android) | **Oui** (`PlannedExerciseSessionRecord`) | Non implémenté | Records Health Connect API |

---

## Architecture Azimut

```
PlannedWorkout (domain.ts)
       │
       ├─► buildGarminWorkoutExport() ──► POST /integrations/garmin/workout
       │                                      └─► Garmin Training API (workout + schedule)
       │
       ├─► [à faire] exportAppleWorkoutKit()
       │
       └─► [à faire] exportHealthConnectPlannedSession()
```

Source interne : `PlannedWorkout` + `WorkoutStep` dans `src/types/domain.ts`.

Exemple source : [`examples/azimut-planned-workout.source.json`](./examples/azimut-planned-workout.source.json)

---

## Garmin Connect — détail

**Oui, c’est le cas d’usage principal et officiel.**

- Programme développeur : [Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program/)
- API : **Training API** — publie workouts + calendrier ; sync montre via Garmin Connect
- Endpoints utilisés par notre backend :
  - `POST https://apis.garmin.com/training-api/workout`
  - `POST https://apis.garmin.com/training-api/schedule` `{ workoutId, date: "YYYY-MM-DD" }`
- OAuth 2.0 PKCE : `https://connect.garmin.com/oauth2Confirm`

**Flux utilisateur :**
1. L’athlète lie son compte Garmin (OAuth)
2. Azimut envoie la séance JSON + date calendrier
3. L’athlète ouvre Garmin Connect → sync Bluetooth → la séance apparaît sur la montre avec guidage natif (bips, zones, étapes)

**Code Azimut :**
- Builder : `src/engines/garminWorkout.ts`
- Export : `src/utils/garminExport.ts`
- Backend : `backend/src/index.js` → `/integrations/garmin/workout`

**Documentation complète :** [`garmin-training-api.md`](./garmin-training-api.md)

**Exemples JSON :**
- [`examples/garmin-interval-run.azimut-export.json`](./examples/garmin-interval-run.azimut-export.json) — format généré par l’app
- [`examples/garmin-interval-run.training-api.json`](./examples/garmin-interval-run.training-api.json) — payload envoyé à l’API
- [`examples/garmin-interval-run.connect-web-dto.json`](./examples/garmin-interval-run.connect-web-dto.json) — format alternatif Connect Web (ExecutableStepDTO)

---

## Apple Watch / Apple Santé — détail

### Apple Watch (séances guidées)

Apple ne propose **pas** d’API REST cross-platform. Il faut :

1. **WorkoutKit** (iOS 17+, watchOS 10+) — framework natif Swift
2. Autorisation utilisateur via `WorkoutPlan.requestAuthorization()`
3. Création d’un `CustomWorkout` avec blocs (warmup, interval, recovery, cooldown)
4. Sync vers la montre : `WorkoutScheduler.shared.schedule(_:at:)` ou UI « Ajouter à la montre »

**Formats :**
- Fichier `.workout` (binaire propriétaire Apple) — partage AirDrop / import manuel
- Pas de spec JSON publique officielle ; bibliothèques tierces (`@bibixx/workoutkit`) reverse-engineer le binaire

**Limitation Expo/React Native :** nécessite un module natif iOS (ex. `react-native-workouts`) — **non présent** dans le projet.

**Documentation :** [`apple-workoutkit-healthkit.md`](./apple-workoutkit-healthkit.md)

**Exemple :** [`examples/apple-workoutkit-interval.example.json`](./examples/apple-workoutkit-interval.example.json)

### Apple Santé (HealthKit) — lecture santé

HealthKit sert surtout à **lire** (pas à pousser un plan structuré vers la montre) :

| Donnée | Type HealthKit | Permission |
|--------|----------------|------------|
| Sommeil | `HKCategoryTypeIdentifierSleepAnalysis` | read |
| HRV | `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` | read |
| FC repos | `HKQuantityTypeIdentifierRestingHeartRate` | read |
| Séance terminée | `HKWorkout` | write (après coup) |

Un plan d’entraînement futur passe par **WorkoutKit**, pas par HealthKit.

---

## Health Connect (Android) — détail

**Oui — type `PlannedExerciseSessionRecord`** (API 35+ / Health Connect récent).

Structure :
- `PlannedExerciseSessionRecord` : titre, type d’exercice, date/durée, blocs
- `PlannedExerciseBlock` : répétitions + liste de `PlannedExerciseStep`
- Cibles : allure, FC, puissance, cadence, RPE, etc.

Permissions :
- `android.permission.health.WRITE_PLANNED_EXERCISE` (app planificateur)
- `android.permission.health.READ_PLANNED_EXERCISE` (app séance / montre)

**Limitation Expo/React Native :** SDK Android natif requis — **non présent** dans le projet.

**Documentation :** [`health-connect-planned-exercise.md`](./health-connect-planned-exercise.md)

**Exemple :** [`examples/health-connect-planned-session.example.json`](./examples/health-connect-planned-session.example.json)

---

## Écarts connus (code actuel vs spec)

### Garmin

| Écart | Impact | Action |
|-------|--------|--------|
| Double imbrication payload client | ~~`workoutName requis`~~ | Corrigé backend (déballage `envelope.workout`) |
| Répétitions interval+recovery | Blocs mal groupés | Grouper work+rest dans `WorkoutRepeatStep` |
| Cible `power` (vélo) | Non mappée | Ajouter `targetType: POWER` |
| Allure sec/km vs m/s | Zones incorrectes | Vérifier spec Training API |
| `ppg`, `mobility`, `rest` | Sport par défaut RUNNING | Mapper sports dédiés |
| OAuth non configuré | Ouvre l’app Garmin (pas OAuth) | Normal en dev sans clés |

### Apple / Health Connect

| Écart | Impact |
|-------|--------|
| Aucun SDK | Bouton « connecter » = toggle local + deep link |
| Pas de lecture sommeil réelle | Simulation locale dans Corps |
| Webhook Garmin health | Reçu mais non traité |

---

## Fichiers de référence dans ce dossier

| Fichier | Description |
|---------|-------------|
| `garmin-training-api.md` | Spec Garmin, mapping Azimut → API |
| `apple-workoutkit-healthkit.md` | WorkoutKit + HealthKit |
| `health-connect-planned-exercise.md` | PlannedExerciseSessionRecord |
| `examples/` | JSON prêts à l’emploi / comparaison formats |

## Sources officielles

- Garmin Training API : https://developer.garmin.com/gc-developer-program/training-api/
- Apple WorkoutKit : https://developer.apple.com/documentation/workoutkit
- Health Connect training plans : https://developer.android.com/health-and-fitness/health-connect/features/training-plans
- Health Connect data types : https://developer.android.com/health-and-fitness/health-connect/data-types

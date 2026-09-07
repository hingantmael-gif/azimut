# Garmin Connect — Training API & formats de séance

## Faisabilité

**Oui.** Garmin expose une API officielle pour publier des séances structurées sur le calendrier Garmin Connect. Après sync Bluetooth/Wi‑Fi, la montre affiche le guidage natif (étapes, zones, alertes).

Prérequis :
- Adhésion au [Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program/)
- Scope OAuth utilisateur (consentement)
- `GARMIN_CLIENT_ID` / `GARMIN_CLIENT_SECRET` (backend)
- `EXPO_PUBLIC_GARMIN_CLIENT_ID` (app mobile)

---

## Flux technique Azimut

```
1. Mobile : connectGarminAccount() → OAuth PKCE
2. Mobile : buildGarminWorkoutExport(PlannedWorkout)
3. Mobile : POST /integrations/garmin/workout
4. Backend : POST https://apis.garmin.com/training-api/workout
5. Backend : POST https://apis.garmin.com/training-api/schedule
6. Utilisateur : sync Garmin Connect → montre
```

---

## Deux familles de JSON Garmin

Garmin utilise **deux schémas** selon l’endpoint :

### A. Training API (officiel partenaire) — **utilisé par Azimut**

Endpoint : `POST https://apis.garmin.com/training-api/workout`

```json
{
  "workoutName": "Fractionné VMA",
  "description": "Azimut · 2026-08-29",
  "sport": "RUNNING",
  "steps": [
    {
      "type": "WorkoutStep",
      "stepOrder": 1,
      "stepType": "WARMUP",
      "intensity": "WARMUP",
      "durationType": "TIME",
      "durationValue": 600,
      "description": "Footing léger"
    },
    {
      "type": "WorkoutRepeatStep",
      "stepOrder": 2,
      "repeatType": "REPEAT_UNTIL_STEPS_CMPLT",
      "repeatValue": 6,
      "steps": [
        {
          "type": "WorkoutStep",
          "stepType": "ACTIVE",
          "durationType": "TIME",
          "durationValue": 60,
          "targetType": "PACE",
          "targetValueLow": 220,
          "targetValueHigh": 240
        },
        {
          "type": "WorkoutStep",
          "stepType": "REST",
          "durationType": "TIME",
          "durationValue": 90
        }
      ]
    }
  ]
}
```

**Champs clés (Training API) :**

| Champ step | Valeurs |
|------------|---------|
| `stepType` | `WARMUP`, `ACTIVE`, `REST`, `COOLDOWN` |
| `durationType` | `TIME` (sec), `DISTANCE` (m), `OPEN` (lap manuel) |
| `targetType` | `PACE`, `HEART_RATE`, `POWER`, `CADENCE`, `OPEN` |
| `targetValueLow/High` | Plage numérique (allure : sec/km ou m/s selon doc partenaire) |
| Répétitions | `WorkoutRepeatStep` avec `steps[]` contenant work + rest |

**Sports (`sport`) :**

| Azimut | Garmin |
|--------|--------|
| `run` | `RUNNING` |
| `bike` | `CYCLING` |
| `swim` | `SWIMMING` |
| `brick` | `MULTI_SPORT` |
| `strength` | `FITNESS_EQUIPMENT` |

**Planification calendrier :**

```json
POST /training-api/schedule
{ "workoutId": 123456789, "date": "2026-08-29" }
```

Réponse typique : `{ "workoutScheduleId": ..., "calendarDate": "2026-08-29" }`

### B. Connect Web API (DTO interne) — référence communautaire

Endpoint non documenté publiquement : `/gc-api/workout-service/workout`

Utilise `ExecutableStepDTO` et `RepeatGroupDTO` :

```json
{
  "workoutName": "Interval Run",
  "sportType": { "sportTypeId": 1, "sportTypeKey": "running" },
  "workoutSegments": [{
    "segmentOrder": 1,
    "sportType": { "sportTypeId": 1, "sportTypeKey": "running" },
    "workoutSteps": [
      {
        "type": "ExecutableStepDTO",
        "stepOrder": 1,
        "stepType": { "stepTypeId": 1, "stepTypeKey": "warmup" },
        "endCondition": { "conditionTypeId": 2, "conditionTypeKey": "time" },
        "endConditionValue": 600.0,
        "targetType": { "workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target" }
      },
      {
        "type": "RepeatGroupDTO",
        "stepOrder": 2,
        "numberOfIterations": 6,
        "workoutSteps": [
          {
            "type": "ExecutableStepDTO",
            "stepOrder": 1,
            "stepType": { "stepTypeId": 3, "stepTypeKey": "interval" },
            "endCondition": { "conditionTypeId": 2, "conditionTypeKey": "time" },
            "endConditionValue": 60.0,
            "targetType": { "workoutTargetTypeId": 4, "workoutTargetTypeKey": "heart.rate.zone" },
            "zoneNumber": 5
          },
          {
            "type": "ExecutableStepDTO",
            "stepOrder": 2,
            "stepType": { "stepTypeId": 4, "stepTypeKey": "recovery" },
            "endCondition": { "conditionTypeId": 2, "conditionTypeKey": "time" },
            "endConditionValue": 90.0,
            "targetType": { "workoutTargetTypeId": 4, "workoutTargetTypeKey": "heart.rate.zone" },
            "zoneNumber": 2
          }
        ]
      }
    ]
  }]
}
```

> **Note :** pour les zones FC/puissance, le format DTO utilise `zoneNumber` (1–5), pas des plages absolues. Les plages absolues (`targetValueOne/Two`) servent à l’allure (m/s) ou la cadence.

---

## Mapping Azimut → Garmin

Source : `src/engines/garminWorkout.ts`

| `WorkoutStep` Azimut | Garmin Training API |
|----------------------|---------------------|
| `type: warmup` | `stepType: WARMUP` |
| `type: active` | `stepType: ACTIVE` |
| `type: rest` | `stepType: REST` |
| `type: cooldown` | `stepType: COOLDOWN` |
| `endCondition: duration` + `durationSec` | `durationType: TIME`, `durationValue` |
| `endCondition: distance` + `distanceMeters` | `durationType: DISTANCE`, `durationValue` |
| `endCondition: lap_button` | `durationType: OPEN` |
| `target.type: pace` | `targetType: PACE`, low/high sec/km |
| `target.type: hr` | `targetType: HEART_RATE`, low/high bpm |
| `target.type: power` | **non mappé** → à ajouter (`POWER`) |
| `repeat: N` | `WorkoutRepeatStep` (actuellement : 1 seul step répété) |

---

## Formats fichiers alternatifs (non utilisés par Training API)

| Format | Usage | Azimut |
|--------|-------|--------|
| **FIT** | Fichier binaire activité/workout | Non |
| **TCX** | XML Training Center Database | Strava export seulement (`stravaExport.ts`) |
| **GPX** | Trace GPS | Import partagé Android |

Garmin Connect accepte parfois l’import FIT/TCX via l’app, mais **pas** via Training API partenaire.

---

## Santé Garmin (sommeil, HRV) — distinct des séances

| API | Rôle |
|-----|------|
| Health API / Wellness API | Push webhook sommeil, HRV, Body Battery |
| Webhook Azimut | `POST /webhooks/garmin/health` (reçu, non traité) |

Fallback CDC : HealthKit (iOS) / Health Connect (Android) si pas de compte Garmin lié.

---

## Exemples dans `examples/`

- `azimut-planned-workout.source.json` — séance interne Azimut
- `garmin-interval-run.azimut-export.json` — sortie `buildGarminWorkoutExport()`
- `garmin-interval-run.training-api.json` — inner workout pour POST API
- `garmin-interval-run.connect-web-dto.json` — format DTO alternatif

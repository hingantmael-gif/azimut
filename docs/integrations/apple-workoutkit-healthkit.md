# Apple Watch (WorkoutKit) & Apple Santé (HealthKit)

## Faisabilité — séances programmées sur Apple Watch

**Oui, mais uniquement en natif iOS** (pas depuis Expo web, pas depuis Android).

Apple fournit **WorkoutKit** (iOS 17+, watchOS 10+) pour créer des séances personnalisées affichées dans l’app **Entraînement** de la montre.

### Workflow officiel

```
1. Demander autorisation : WorkoutPlan.requestAuthorization()
2. Construire CustomWorkout (warmup, blocs, cooldown, alertes)
3. Prévisualiser : plan.preview() → UI système « Ajouter à la montre »
4. Planifier : WorkoutScheduler.schedule(plan, at: date)
5. Sync automatique vers Apple Watch
```

Référence WWDC23 : [Build custom workouts with WorkoutKit](https://developer.apple.com/videos/play/wwdc2023/10016/)

### Types de séances WorkoutKit

| Type | Description |
|------|-------------|
| `CustomWorkout` | Intervalles structurés (work/recovery, cibles allure/FC) |
| `SingleGoalWorkout` | Objectif unique (distance, temps, calories) |
| `PacerWorkout` | Allure cible continue |
| `SwimBikeRunWorkout` | Enchaînement triathlon |

### Structure conceptuelle (CustomWorkout)

Voir [`examples/apple-workoutkit-interval.example.json`](./examples/apple-workoutkit-interval.example.json).

Éléments :
- **warmup** : durée ou distance + alerte optionnelle
- **blocks[]** : répétitions × (work + recovery)
- **cooldown**
- **goal** par step : `pace`, `heartRate`, `power`, `cadence`, `open`
- **alert** : sortie de zone (son, vibration)

### Format fichier `.workout`

- Binaire propriétaire Apple (partage AirDrop, import manuel)
- Pas de spec JSON publique officielle
- Bibliothèque tierce `@bibixx/workoutkit` (Node) : encode/decode binaire
- **Non utilisable directement** dans React Native sans module natif

### Intégration React Native / Expo

Options :
1. **Module natif Swift** exposant WorkoutKit (recommandé Apple)
2. **`react-native-workouts`** (Expo module) — hooks `useCustomWorkout`, `plan.scheduleAndSync(date)`
3. Générer `.workout` côté serveur (Node + `@bibixx/workoutkit`) → partage fichier (UX manuelle)

**État Azimut :** aucune de ces options n’est implémentée. Le bouton « Apple Santé » ouvre les réglages iOS.

---

## Apple Santé (HealthKit) — lecture & écriture

HealthKit **ne remplace pas** WorkoutKit pour les plans futurs. Il sert surtout à :

### Lecture (CDC §1.A — récupération, adaptatif)

| Métrique Azimut | Type HealthKit | Unité |
|-----------------|----------------|-------|
| Sommeil total / phases | `HKCategoryTypeIdentifierSleepAnalysis` | catégories inBed/asleep/awake |
| HRV nocturne | `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` | ms |
| FC repos | `HKQuantityTypeIdentifierRestingHeartRate` | bpm |
| Énergie / charge | Pas d’équivalent direct Body Battery | — |

Permissions : `requestAuthorization(toShare: [], read: [...])`

Package RN typique : `react-native-health` (iOS uniquement)

### Écriture (séance terminée)

Après une séance réalisée, une app peut écrire :

```swift
HKWorkout(
  activityType: .running,
  start: startDate,
  end: endDate,
  workoutEvents: [...],  // laps optionnels
  totalEnergyBurned: ...,
  totalDistance: ...
)
```

**Ce n’est pas** un envoi de séance **planifiée** — c’est un enregistrement **passé**.

---

## Comparaison Garmin vs Apple

| | Garmin Connect | Apple Watch |
|--|----------------|-------------|
| API cloud | Training API (REST) | Aucune REST publique |
| Auth | OAuth 2.0 PKCE | Autorisation WorkoutKit locale |
| Format | JSON | WorkoutKit objects / `.workout` binaire |
| Sync montre | Via Garmin Connect app | Via WorkoutScheduler / iCloud |
| Expo compatible | Oui (OAuth + backend) | Non sans module natif iOS |

---

## Prochaines étapes recommandées (Azimut)

1. Évaluer `react-native-workouts` ou module Swift custom
2. Mapper `PlannedWorkout` → config WorkoutKit (voir exemple JSON)
3. HealthKit en parallèle pour **lecture** sommeil/HRV (fallback sans Garmin)
4. Entitlements Xcode : HealthKit + Background Modes si besoin

## Sources

- WorkoutKit : https://developer.apple.com/documentation/workoutkit
- HealthKit : https://developer.apple.com/documentation/healthkit
- react-native-workouts : https://github.com/Janjiran/react-native-workouts

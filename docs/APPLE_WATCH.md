# Envoyer les séances sur une Apple Watch

## Ce qui est possible, et où

| Où | Ce qui marche |
|---|---|
| **App Mova pour iPhone** (iOS 17+, montre watchOS 10+) | « Ajouter à l'Apple Watch » : la séance arrive dans l'app **Exercice** de la montre, à la date prévue, avec les répétitions découpées (WorkoutKit d'Apple). Un seul geste. |
| **Version web / PWA, Android, ordinateur** | Impossible : Apple réserve l'accès à l'Apple Watch aux vraies apps iPhone. L'app propose « Copier la séance » + le mode d'emploi pour la recréer à la main dans Exercice › + › Personnalisé. |

Rien à lier ni à connecter côté utilisateur (pas de compte, pas de câble) : seulement accepter une autorisation la première fois.

## Ce qui est déjà dans le code

- `src/engines/watchFileFormats.ts` → `buildAppleWorkoutPlan()` : convertit la séance Mova en plan WorkoutKit (échauffement fusionné, blocs « N × », retour au calme). **Testé** (`appleWorkoutPlan.test.ts`).
- `modules/mova-workoutkit/` : module Expo iOS (Swift) qui lit ce plan et le planifie avec `WorkoutScheduler`.
  **⚠ Écrit sans Mac ni Xcode : jamais compilé ni exécuté.** Prévois un premier build pour corriger d'éventuelles erreurs de signature d'API.
- `src/services/appleWatch.ts` : passerelle JS (`isAppleWatchSchedulingAvailable`, `scheduleOnAppleWatch`) ; renvoie « indisponible » partout sauf dans l'app iPhone avec le module.
- Écran d'envoi : bouton « Ajouter à l'Apple Watch » (si disponible) sinon « Copier la séance ».
- Mode d'emploi dans l'app : Réglages › Montre › Mode d'emploi Apple Watch.
- `app.json` : `expo-build-properties` avec `ios.deploymentTarget = 17.0` (WorkoutKit l'exige).

## Étapes pour toi

1. **Compte Apple Developer** (payant, annuel) : nécessaire pour installer sur un iPhone et publier sur l'App Store.
2. **Premier build de test** (sur un vrai iPhone + Apple Watch) :
   ```bash
   npx expo prebuild --platform ios
   eas build --profile development --platform ios
   ```
   (`eas.json` a déjà le profil `development`.) Sans Mac, EAS compile dans le cloud.
3. **Corriger le Swift si le build échoue** : `modules/mova-workoutkit/ios/MovaWorkoutKitModule.swift`. Points les plus susceptibles de changer : initialiseurs `WorkoutStep` / `IntervalStep` / `CustomWorkout`, et `WorkoutScheduler.schedule`.
4. **À vérifier au premier essai** : l'autorisation demandée par `WorkoutScheduler.requestAuthorization()` peut exiger des textes `NSHealth…UsageDescription` dans `app.json` › `ios.infoPlist` (non ajoutés : je n'ai pas pu confirmer qu'ils étaient nécessaires).
5. **Pas encore fait** : alertes d'allure et de fréquence cardiaque sur la montre (les cibles sont déjà dans le plan JSON ; à ajouter dans le Swift une fois le premier build validé). Pour l'instant la montre reçoit durées, distances, répétitions et noms d'étapes.
6. Publier : `eas build --profile production --platform ios` puis `eas submit`.

## Ce que voit l'utilisateur de la version web
« Envoyer à Apple Watch » › « Copier la séance » › Exercice › + › Personnalisé › ajouter les étapes du résumé.

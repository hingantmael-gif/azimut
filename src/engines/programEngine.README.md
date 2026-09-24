# Program engine — hiérarchie en 4 couches

Mova sépare la construction et l’adaptation des programmes en **quatre couches**.
Chaque couche a une responsabilité claire ; les couches du dessus ne recalculent
pas ce que celles du dessous ont déjà décidé.

```
┌─────────────────────────────────────────┐
│  4. Suivi (runtime)                     │  dailyOrchestrator, dailyAdjustment,
│     readiness, sommeil, RPE, Banister   │  sleep*, sentinel, weekReview…
├─────────────────────────────────────────┤
│  3. Génération                          │  programBuilder, planGenerator,
│     séances concrètes + steps           │  coachingEngine
├─────────────────────────────────────────┤
│  2. Progression                         │  periodization / ramp / progressiveLearning
│     charge semaine → semaine            │  scaleLongRuns, phaseLoad
├─────────────────────────────────────────┤
│  1. Policy (garde-fous)                 │  sessionVolumePolicy
│     plafonds volume / longue / easy     │  maxWeeklyKm, peakLong, sanitize
└─────────────────────────────────────────┘
```

## 1. Policy — `sessionVolumePolicy.ts`

**Rôle :** contraintes « coach » indépendantes de la génération.

- Fourchettes de volume hebdo par objectif / distance cible
- Pic de sortie longue réaliste (jamais un marathon « longue » sur un plan 5 km)
- Part max de la longue dans le volume (~25–30 %)
- `sanitizePlanDistances` : dernier filet de sécurité après génération

Les déclarations athlète (ex. « 100 km/sem ») **ne forcent pas** le plan hors fourchette.

## 2. Progression

**Rôle :** comment la charge évolue dans le temps.

- Phases de périodisation (développement → spécifique → affûtage)
- Ramp des sorties longues vers le pic
- Semaines de décharge / facteurs `phaseLoad`
- `progressiveLearning` : biais personnels (RPE, compliance) qui influencent la suite

La progression consomme la policy ; elle ne redéfinit pas les plafonds.

## 3. Génération — `programBuilder` / `planGenerator` / `coachingEngine`

**Rôle :** produire le plan (séances, steps, allures, distances).

- Choix du template + jours dispo + longue
- Remplissage des types de séance (EF, qualité, longue…)
- Allures via VMA / zones athlète
- Application des distances issues de la policy + progression

Entrée typique : `buildProgramPlan(...)` après onboarding.

## 4. Suivi (runtime)

**Rôle :** ajuster **après** génération, au fil des jours.

- `dailyOrchestrator` / `dailyAdjustment` : décision du jour
- Sommeil (`sleepEngine` / adaptation / ramp startup)
- Readiness, muscle recovery, Banister (fitness / fatigue / TSB)
- RPE & prédiction de séance → feedback boucle fermée

Le suivi ne régénère pas tout le programme à chaque tick : il **adapte** la séance du jour (réduction, repos, maintien).

## Règles de dépendance

1. **Policy → Progression → Génération → Suivi** (jamais l’inverse pour les plafonds).
2. Un bug de distance « absurde » se corrige d’abord en **policy**, pas en patch UI.
3. Les écrans (home, calendrier, live) consomment le **suivi** ; l’onboarding / builder consomment **policy + génération**.

## Fichiers clés

| Couche        | Modules principaux                                      |
|---------------|---------------------------------------------------------|
| Policy        | `sessionVolumePolicy.ts`                                |
| Progression   | `programBuilder` (ramp), `progressiveLearning`, phases  |
| Génération    | `programBuilder.ts`, `planGenerator.ts`, `coachingEngine.ts` |
| Suivi         | `dailyOrchestrator.ts`, `dailyAdjustment.ts`, `sleepEngine.ts`, `readinessScore.ts`, `banisterPlus.ts` |

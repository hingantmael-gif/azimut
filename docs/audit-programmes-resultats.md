# Audit programmes — résultats (août 2026)

> Généré par `npx tsx scripts/audit-all-programs.ts`  
> **176 scénarios** : 25 templates × 6 profils athlètes + 24 distances sur mesure + 2 muscu infinie + tests zones.

## Profils simulés (VMA / chrono)

| Profil | Chrono | Volume/sem | Jours |
|--------|--------|------------|-------|
| 5 km · 30 min | 5 km en 30:00 | 12 km | mar, jeu, sam |
| 10 km · 45 min | 10 km en 45:00 | 32 km | lun–mar–jeu–sam |
| Semi · 1h45 | 21,1 km en 1:45 | 55 km | 5 j/sem |
| Marathon · 3h30 | 42,2 km en 3:30 | 72 km | 6 j/sem |
| Sans chrono · 40 km/sem | — | 40 km | 4 j/sem |
| Sans chrono · 15 km/sem | — | 15 km | 3 j/sem |

Les allures sont dérivées via `resolvePaceZones` (chrono → VMA → zones Daniels E/M/T/I).

---

## Résultat global

| Métrique | Valeur |
|----------|--------|
| Scénarios testés | **176** |
| Erreurs bloquantes | **0** |
| Échauffements trop rapides | **0** (après correctif `warmupBandForMain`) |

---

## Programmes testés (25 templates)

### Course à pied (7)
- `prog-5k`, `prog-10k`, `prog-semi`, `prog-marathon`, `prog-trail-50`, `prog-vma`, `prog-forme`

### Cyclisme (2)
- `prog-bike-fondo`, `prog-bike-crit`

### Natation (2)
- `prog-swim-1500`, `prog-swim-eau-libre`

### Triathlon (3)
- `prog-tri-super-sprint`, `prog-tri-sprint`, `prog-tri-olympique`

### Ironman (7)
- `prog-ironman-5150`, `prog-ironman-70-3`, `prog-ironman-70-3-debut`, `prog-ironman`, `prog-ironman-140-6-debut`, `prog-ironman-bridge`, `prog-ironman-performance`

### Autre (2)
- `prog-biathlon`, `prog-duathlon-sprint`

### Musculation (2)
- `prog-strength-base`, `prog-strength-tri`

### Sur mesure
- Distances : 3, 5, 8, 12, 21, 42, 63, 100 km

---

## Échauffement & allures (course)

### Règle appliquée
`warmupBandForMain(zones, mainKind)` : l’allure médiane de l’échauffement est **≥ allure médiane du corps de séance + 10 sec/km** (donc moins intense).

### Exemple semi (chrono 1h45) — sortie longue progressive
| Étape | Allure médiane |
|-------|----------------|
| Échauffement | ~6:42/km |
| Endurance facile (65 %) | ~6:32/km |
| Progression (35 %) | ~5:55/km |
| Retour au calme | ~6:37/km |

L’échauffement reste **plus lent** que chaque bloc de travail.

### Séances qualité (VMA, seuil, tempo)
Échauffement ~6:11–7:03/km vs fractionné ~4:01/km ou seuil ~4:04/km : **cohérent**.

### Affichage
Les allures sont affichées **lent → rapide** (ex. `6:50 – 6:30/km`) pour une lecture plus naturelle.

---

## Disciplines non-course

| Discipline | Échauffement | Cible intensité | Remarque |
|------------|--------------|-----------------|----------|
| **Vélo** | 10–15 min, sans allure | Puissance % FTP | OK structure |
| **Natation** | 200–400 m | CSS / aérobie | OK structure |
| **Brick** | — | Vélo Z2 + course facile | Pas d’échauffement dédié |
| **Muscu / PPG** | 6 min articulaire | RPE / séries | Pas d’allure |
| **Mobilité** | — | — | Non généré dans les plans |
| **Repos** | — | — | Jour sans séance |

---

## Planning & contraintes

### Vérifications OK
- Chaque séance tombe sur un **jour d’entraînement choisi**
- Pas de discipline interdite (ex. brick dans un plan 5 km pur)
- Triathlon : natation + vélo/brick présents
- Musculation : pas de séances run/bike/swim parasites
- Volumes course plafonnés selon objectif (`sanitizePlanDistances`)

### Contraintes Runna / Daniels respectées
- Pas 2 séances **dures** consécutives (VMA, seuil, brick) quand ≥ 4 j/sem
- PPG espacé des qualités (≥ 48 h)
- Sortie longue espacée des qualités
- Décharge tous les 4ᵉ semaines ; affûtage en fin de plan

### Avertissements possibles (non bloquants)
- **Plans 3 j/sem** : parfois 1 seul jour entre deux séances intenses (relaxation volontaire du moteur)
- **Multi-programmes** : deux séances le même jour si deux programmes actifs (fusion calendrier) — comportement voulu

---

## Libellés séances

Chaque étape course inclut :
- **Type** : Échauffement / Corps de séance / Récupération / Retour au calme
- **Durée ou distance** en min/km (jamais secondes brutes)
- **Allure, FC ou puissance** quand applicable

Exemples valides :
- `Échauffement · footing très facile · 10 min · Allure 6:48 – 6:28/km`
- `6 × 400 m @ VMA · Allure 4:06 – 3:56/km`
- `Endurance Z2 · 45 min · 180–210 W`

---

## Correctifs appliqués pendant l’audit

1. **`warmupBandForMain`** — échauffement relatif au bloc principal (fix sorties longues)
2. **Sortie longue progressive** — référence `mainKind: 'easy'` (bloc le plus vif en fin de séance)
3. **Affichage allures** — ordre lent → rapide
4. **Script `audit-all-programs.ts`** — audit reproductible 176 scénarios

---

## Relancer l’audit

```bash
npx tsx scripts/audit-all-programs.ts
```

Code de sortie `0` = aucune erreur bloquante.

---

## Pistes d’amélioration (non bloquantes)

1. **Brick / vélo / natation** : ajouter une cible d’intensité légère sur l’échauffement (Z1 ou allure très facile)
2. **Strides** : séparer les 20 min de footing (corps) vs échauffement court + gammes
3. **Brick** : ajouter 5–10 min échauffement vélo explicite avant le bloc principal

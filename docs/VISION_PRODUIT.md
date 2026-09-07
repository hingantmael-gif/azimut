# Vision produit — en mots simples

> Ce document décrit ce que vous construisez, tel que vous l’avez voulu mais n’avez pas toujours su formuler.

---

## En une phrase

**Un coach personnel d’endurance dans votre poche** — pas un réseau social sportif. L’app vous dit quoi faire aujourd’hui, envoie la séance sur votre montre Garmin, récupère ce que vous avez vraiment fait via Strava, et **adapte demain** selon votre sommeil, votre fatigue et votre ressenti.

---

## Le problème que vous résolvez

Aujourd’hui, un coureur ou triathlète doit jongler entre :

- une montre (Garmin) pour les données physiologiques et les séances structurées ;
- Strava pour l’historique et le suivi des sorties ;
- des plans PDF ou des coachs humains pour savoir *quoi* faire ;
- sa propre intuition pour savoir *quand* ralentir ou sauter une séance.

Personne ne relie automatiquement **le plan → la montre → la réalité → le lendemain**.

Votre application est ce **fil conducteur intelligent**.

---

## Ce que l’utilisateur vit au quotidien (§11 — zéro friction)

1. **Le matin** — Ouvre l’app : sommeil, HRV, forme du jour. Une carte claire : *« Aujourd’hui : 6 × 1000 m »*.
2. **Un tap** — « Envoyer à Garmin ». La séance structurée est sur la montre.
3. **Il court** — Comme d’habitude, avec sa montre. Pas besoin de tenir le téléphone.
4. **Strava synchronise** — L’activité revient dans l’app. Prévu vs réalisé est calculé.
5. **3 clics RPE** — « Comment c’était ? » Effort, courbatures, moral.
6. **Demain est déjà ajusté** — Trop dur ? Volume réduit. Douleur ? Repos ou mobilité. Tout va bien ? Légère progression.

Pas de fil d’actualité. Pas de kudos. Pas de comparaison sociale obligatoire. **Juste du coaching.**

---

## Les piliers fonctionnels (cahier des charges)

| Pilier | Rôle |
|--------|------|
| **Plan intelligent** | Plans 5K → marathon / triathlon, périodisation, déplacement de séances |
| **Garmin** | Export séances structurées, import sommeil / HRV / FC repos |
| **Strava** | Import activités, comparaison prévu / réalisé |
| **Moteur adaptatif** | 4 cas : progression, fatigue, douleur, charge hebdo |
| **RPE & récupération** | Feedback rapide, mobilité, PPG |
| **Progression gamifiée** | XP, niveaux, badges, saisons — motivation sans réseau social |
| **Premium** | Plan long terme, analytics avancés, coach vocal |
| **Confidentialité** | Profil privé, zones masquées, données sous contrôle |

---

## Ce que ce n’est PAS

- ❌ Une copie de Strava (pas de feed, clubs, kudos)
- ❌ Une app BTP / construction (projet séparé dans ce dépôt, gitignored)
- ❌ Un enregistreur GPS remplaçant la montre (le téléphone coordonne, la montre mesure)

---

## Pour qui

- Coureurs débutants à confirmés visant 5K, 10K, semi, marathon, trail
- Triathlètes (sprint → Ironman)
- Personnes qui veulent **progresser sans se blesser** et **sans y penser toute la journée**

---

## Ton & design

- Navigation **simple et familière** (5 onglets, hub paramètres) — lisible, blanc, listes claires
- Couleur d’accent **coaching** (teal) — distincte des apps sociales orange
- Complexité **masquée** : Banister, conformité, périodisation → écran Progrès, pas l’accueil

---

## Démo locale

- Accueil → « Simuler retour Strava » pour tester le cycle complet
- Onglet **+** pour raccourcis (Garmin, RPE, récupération)

---

*Document interne — `training-mobile-app/` (non publié sur GitHub)*

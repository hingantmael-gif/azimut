# Azimut — Description complète de l'application

**Document produit technique** · Français · Septembre 2026  
**Produit** : Azimut (Expo / React Native → PWA web)  
**Déploiement live** : https://hingantmael-gif.github.io/  
**API** : https://azimut-auth-api.onrender.com  
**Brand** : jade `#0E8F6F` · mint `#3DFF9A` · ink `#07111F` · signal lime `#D4FF3F`  
**Cadre web desktop** : `PhoneShell` — viewport > 520 px → téléphone 390 × ~844, `borderRadius` 28  

Fichier source : `docs/azimut-description-complete.md`  
Code : `app/` · `src/` · `backend/` · PWA `public/sw.js` (cache `azimut-static-v67`)

---

## 1. Page de titre + métadonnées + comment lire le doc

### 1.1 Identité

| Champ | Valeur |
|-------|--------|
| Nom | Azimut |
| Tagline | « Ta trajectoire d'entraînement » / « Choisis ton cap. Enchaîne. Progresse. » (`src/constants/brand.ts`) |
| Plateforme documentée | PWA web (GitHub Pages) ; même codebase Expo pour natif |
| Date de référence | Septembre 2026 |
| Langue UI | Français |
| Statut social | **Communauté (bêta)** — utilisable, labellisée bêta, pas de casque chantier |
| Statut callisthénie / itinéraire live | **WIP** — visible + casque, non cliquable |

### 1.2 Objectif

Décrire **l'app telle qu'elle est**, écran par écran, bouton par bouton : placements, dimensions, couleurs, empty states, fausses features / seed, stockage AsyncStorage, sync API, notifications in-app, ranked, tracker GPS (brouillon progressif vs sauvegarde complète). Référence autonome pour un·e développeur·se ou une autre IA — pas un pitch marketing.

### 1.3 Comment lire

1. **§2** — sommaire.
2. **§4** — carte routes (« où cliquer »).
3. **§5–6** — navigation + design system.
4. **§8–19** — parcours (auth → cockpit → live → social → settings).
5. **§20–25** — persistance, engines, PWA, démo, WIP.
6. **§26–27** — matrice CTA + guide autre IA.

Chemins en backticks · couleurs en hex · dimensions en px quand le code les fixe.

### 1.4 Sources de vérité

| Domaine | Fichiers |
|---------|----------|
| Routes | `app/**/*.tsx` |
| État | `src/store/AppContext.tsx` |
| Types | `src/types/domain.ts` |
| Design | `src/theme/palettes.ts`, `tokens.ts`, `src/constants/brand.ts` |
| Engines | `src/engines/*.ts` |
| Community API | `src/api/community.ts` |
| Stockage | `src/storage/*.ts` |
| Features | `src/constants/appFeatures.ts` |
| WIP casque | `src/ui/ComingSoon.tsx`, `.cursor/rules/wip-coming-soon.mdc` |
| Auth gate | `src/navigation/authRoute.ts`, `app/_layout.tsx` |

---

## 2. Sommaire

1. Page de titre + métadonnées + comment lire le doc
2. Sommaire
3. Résumé produit
4. Carte « où trouver quoi » (table routes)
5. Architecture navigation
6. Design system
7. Disciplines & sports
8. Auth + onboarding bouton par bouton
9. Accueil cockpit
10. Plan / calendrier + LoadHeatmap
11. Enregistrer (pré-start)
12. Session live tracker complet
13. Progrès (body)
14. Vous / profil + hub Communauté bêta
15. Communauté bêta entière
16. Wizard programme + WeekSilhouette + cutoff 18h
17. Activité détail + import/export Strava
18. Ranked / XP / badges / level-up / covers
19. Paramètres (tous les écrans)
20. Notifications
21. Stockage & sync
22. Catalogue engines
23. PWA / SW v67 / install
24. Données démo / seed / fake
25. États vides & WIP
26. Matrice CTA critiques
27. Guide pour une autre IA / développeur

---

## 3. Résumé produit (mission, différenciateur, label bêta)

### 3.1 Mission

Azimut est une app d'**entraînement multi-sport** (course, vélo, nage, triathlon / Ironman, musculation) qui combine :

1. **Coach adaptatif** — plan, séance du jour, ajustements (sommeil, RPE, stress, Sentinelle, readiness), programmes générés.
2. **Tracker GPS live** — enregistrement type montre, brouillon AsyncStorage, finalisation vers historique.
3. **Progression ranked** — XP, paliers Bronze → Champion, soft ladder hebdo, badges, covers.
4. **Communauté (bêta)** — fil, likes, réactions, clubs, cartes, recherche, blocs, notifs sociales.

### 3.2 Différenciateur coach × social

Le social renvoie des **insights coaching** sur les posts. Likes programmes / séances → XP (`PROGRAM_LIKE_XP = 20`, `SESSION_LIKE_XP = 12`). Hub profil agrège `hub-summary` (posts, clubs, unread).

### 3.3 Labels

- **Communauté** : UI « Communauté (bêta) » / « Bêta › » — **utilisable**, pas de casque. Données seed/locales si pas de token `az_*` ou API down.
- **Callisthénie** et **itinéraire live** : WIP casque, non cliquable.

### 3.4 Stack

Expo Router · React Native Web · Context `AppContext` · AsyncStorage `@training/*` / `@azimut/*` · API Render token `az_*` · PWA `manifest` + SW `azimut-static-v67` · PC web forcé dans `PhoneShell`.

---

## 4. Carte « où trouver quoi » (table routes)

| Intention | Route | Entrée UI |
|-----------|-------|-----------|
| Welcome | `/(auth)/welcome` | AuthGate sans token |
| Connexion | `/(auth)/login` | Welcome → Se connecter |
| Inscription | `/(auth)/register` | Welcome → Inscription |
| 2FA e-mail | `/(auth)/verify-2fa` | E-mail non vérifié |
| Onboarding | `/(auth)/onboarding` | Post-vérif, intake incomplet |
| Accueil | `/(tabs)` / `index` | Tab Accueil |
| Plan | `/(tabs)/calendar` | Tab Plan |
| Pré-start GPS | `/(tabs)/record` | Tab Enregistrer |
| Live | `/session/live` | Go / Démarrer |
| RPE | `/session/rpe` | CTA Accueil |
| Séance plan | `/session/[id]` | Détails |
| Progrès | `/(tabs)/body` | Tab Progrès (`?tab=`) |
| Profil | `/(tabs)/profile` | Tab Vous |
| Fil | `/(tabs)/social` | Hub Communauté |
| Groupes | `/(tabs)/groups` | Hub Communauté |
| Cartes | `/(tabs)/maps` | Hub Communauté |
| Search | `/search` | Loupe header |
| Notifications | `/notifications` | Cloche |
| Connections | `/connections` | Stats abonnés |
| Profil public | `/user/[username]` | Search / fil |
| Nouveau programme | `/program/new` | FAB `+` |
| Programmes | `/programs` | Navigation |
| Activité | `/activity/[id]` | Fin live / historique |
| Import | `/import-activity` | Accueil / features |
| Ranked | `/ranked` | XP / Progrès |
| Badges | `/badges` | Profil |
| Week review | `/week-review` | Accueil |
| Settings | `/settings/*` | Rouage Vous |
| Install PWA | `/install` | Public |
| Coach vocal | `/coach-vokal` | Catalogue |
| Sleep / nutrition / recovery / safety | `/sleep`, `/nutrition`, `/recovery`, `/safety` | Liens |

Tabs **masqués** (`href: null`) : `create`, `analyse`, `maps`, `groups`, `social`, `training`.

---

## 5. Architecture navigation

### 5.1 Tabs (`app/(tabs)/_layout.tsx`)

**Visibles** : Accueil · Plan · **Enregistrer** (rond 40×40, r20) · Progrès · Vous.  
Tab bar h **58**, actif `colors.accent`, inactif `tabInactive`, labels ~10 px.

**Masqués** : `create`, `analyse`, `maps`, `groups`, `social`, `training`. Sur maps/groups/social : `AlwaysBackButton` fallback `/(tabs)/profile`.

Accueil : `headerLeft` = `HeaderBrand`. Vous : `headerRight` = `TabHeaderActions showSettings`.

### 5.2 Header (`src/ui/TabHeaderActions.tsx`)

1. Loupe 24 → `/search` (hit 36×36, `PressableScale` `pop`)
2. Cloche 23 → `/notifications` — badge `danger` si unread (`9+`)
3. Rouage (Vous seulement) → `/settings`

Unread = notifs non lues + follow_request `pending`.

### 5.3 FAB

`FloatingActionButton` : `+` **56×56**, `#0E8F6F`, bas-droite (bottom ≈ safeArea+62, right 18) → `/program/new`. Accueil + Plan. Remplace l'ancien tab Nouveau.

### 5.4 AuthGate (`authRoute.ts`)

| État | Redirect |
|------|----------|
| Pas de token | `/(auth)/welcome` |
| Token, e-mail non vérifié | `/(auth)/verify-2fa` |
| Vérifié, onboarding incomplet | `/(auth)/onboarding` |
| Complet dans auth/install | `/(tabs)` |
| OAuth return (code URL) | null |

Public : `/install`, `settings/terms`, `settings/privacy-policy`, `apropos`.

### 5.5 PhoneShell

`src/ui/PhoneShell.tsx` : web ≤520 plein écran ; web >**520** → cadre fond `#02060D`, phone **390** × `min(844, max(640, h-48))`, **radius 28**, border `rgba(255,255,255,0.12)`, ombre `0 24px 80px`.

---

## 6. Design system

### 6.1 Brand (`brand.ts`)

| Token | Hex | Usage |
|-------|-----|-------|
| accent | `#0E8F6F` | Primaires light, FAB |
| accentDark | `#0A6B54` | Variante |
| signal | `#D4FF3F` | Highlights / XP dark |
| signalMint | `#3DFF9A` | Accent dark, GPS OK |
| ink | `#07111F` | Hero auth |
| inkSoft | `#0F1C2E` | Surfaces |

### 6.2 Palettes (`palettes.ts`)

**Light** : bg `#F3F8F6`, card `#FAFDFB`, text `#0B1A16`, accent `#0B7A5E`, border `#C9DDD5`, warn `#D97706`, danger `#DC2626`, sleep `#2563EB`, xp `#0E8F6F`.

**Dark** : bg `#081421`, elevated `#122033`, text `#F4F7FA`, accent `#3DFF9A`, black `#07111F`, xp `#D4FF3F`.

### 6.3 Tokens (`tokens.ts`)

Spacing : 4 / 8 / 16 / 24 / 32 / 48.  
Radii : 6 / 8 / 12 / 24 / pill 999.  
Typo : hero 28/800 · title 22/700 · body 15 · button 16/700 · caption 12.

### 6.4 Motion & atmosphère

`ScreenAtmosphere`, `SportAtmosphereBanner`.  
`softMotion` : `FadeInUp`, `StaggerIn`, `RevealPanel`, `SoftPulse`, `BreathingDot`, `PressableScale` (`subtle`|`pop`|`nav`), `ScreenEnter`/`RouteEnter`, fill bars.

### 6.5 ComingSoon casque

`ComingSoonOverlay` / `ComingSoonLock` (`ComingSoon.tsx`) : casque font 56 (compact 40), caption uppercase, calque `rgba(15,23,42,0.32)`, contenu dimmed 0.88, `footer` optionnel (waitlist).  
`SportComingSoonCard` pour callisthénie.  
Règle : visible + non cliquable + casque — jamais cacher ni flux cassé (`.cursor/rules/wip-coming-soon.mdc`).

Usages : callisthénie (onboarding + wizard) ; `LiveRouteSlot` « Bientôt ».

---

## 7. Disciplines & sports

**Cliquables** : Course (`#0E8F6F`), Cyclisme (`#3B82F6`), Natation (`#06B6D4`), Triathlon, Musculation, Ironman.

**Callisthénie WIP** : assets `assets/sports/sport-calisthenics.png`, `prog-calisthenics-*`, `calis-*` ; engines `calisthenicsProgramming.ts`, `calisthenicsSkillTree.ts` ; UI `SportComingSoonCard` + waitlist `@azimut/waitlist_calisthenics` ; `selectSport` calis = no-op.

Visuels : `sportVisuals.ts`, `SportCover`.


## 8. Auth + onboarding bouton par bouton

### 8.1 Welcome (`app/(auth)/welcome.tsx`)

Fond ink, wash jade `rgba(14,143,111,0.12)`, orbites mint/lime (~320/220/140). Eyebrow `MULTI-SPORT` (`signalMint`, 11 px, letterSpacing 2.2). `BrandMark` + tagline `#F4F7FA` ~24. Zone basse `#F3F7F5` :

1. **Inscription** (primaire) → `/(auth)/register`
2. **Se connecter** (outline) → `/(auth)/login`
3. Lien **Conditions d'utilisation** → `/settings/terms`

Si déjà auth + e-mail OK → redirect onboarding ou tabs.

### 8.2 Login (`app/(auth)/login.tsx`)

Ordre d'auth :

1. **Essai silencieux** : email/username **`1`** + password **`1`** (`src/utils/demoAuth.ts`) → `1@demo.local`, `clearSession`, mark onboarding completed, `LOGIN`. **Jamais affiché dans l'UI.**
2. API remote.
3. Credentials locales `@azimut/local-credentials-v1`.

Boutons : **Continuer avec Google** (`SocialAuthButtons`, fond blanc, loading « Connexion Google… ») · champs e-mail/mdp · **Se connecter** · lien Inscription. Redirect : onboarding si incomplet sinon tabs.

### 8.3 Register (`app/(auth)/register.tsx`)

Steps : `options` → `email` → `password` → `profile`.

| Step | Actions |
|------|---------|
| options | Checkbox CGU obligatoire ; Google ; **S'inscrire avec l'e-mail** ; lien login |
| email | Continuer / Retour |
| password | Règles ✓/○ box `accentLight` ; confirmation ; Continuer / Retour |
| profile | Prénom, Nom, Identifiant ; **Créer mon compte** ; fallback local si API down |

Refuse le compte essai `1` / `1@demo.local`.

### 8.4 2FA (`app/(auth)/verify-2fa.tsx`)

Titre « Vérification 2FA » · timer **600 s** · code démo si `pending2faCode` (couleur `colors.xp`, letterSpacing 8) · input 6 chiffres · **Valider mon e-mail** · **Renvoyer le code** (`RESEND_2FA`).

### 8.5 Onboarding (`app/(auth)/onboarding.tsx`)

Wizard Campus (`buildFullOnboardingSteps` / configs onboarding) : identity, sport, goals, terrain, experience, injury, volume, rhythm, program_pick/weeks, level, days, devices, plan_preview…  
Étape sport : cartes populaires + **`SportComingSoonCard` Callisthénie** (casque + waitlist).  
Navigation Continuer / Retour / chips `IntakeUI` (`src/ui/onboarding/`).

---

## 9. Accueil cockpit

**Fichier** : `app/(tabs)/index.tsx`

### 9.1 Structure verticale (haut → bas)

1. `ScreenAtmosphere` (~0.85)
2. Salutation « Bonjour / Bon après-midi / Bonsoir, {prénom} » — si firstName `'1'` → « athlète »
3. **`DayStatusBanner`** — `statusLine` ; fond warn si `watchOut` ; tap → Progrès
4. **`WhyCoachExpand`** — toggle « Pourquoi ? » / « Masquer » + `RevealPanel`
5. Chips : **`CalibrationChip`** « Calibration coach N% » → body `?tab=performance` ; chip **Stress** (toggle `lifeStress01≈0.65`, non persisté long terme)
6. **Sentinel** si `level !== 'ok'` — `SoftPulse`, fond ambre, titres « Sentinelle · allège / adapte / à surveiller » → performance
7. **`LiveDraftBanner`** si brouillon GPS → reprendre live
8. Bannière **Ajustement coach** / **Apprentissage**
9. Carte **séance du jour / prochaine / empty** (borderLeft couleur discipline)
10. Métriques : Sommeil (bleu `#2563EB`) → `/sleep` · XP → classement · Forme (ambre) → performance
11. **Bilan de la semaine** → `/week-review`
12. **Activités récentes** (+ empty)
13. FAB `+`

### 9.2 DailyAdjustment — CTA primaire

Moteurs : `dailyAdjustment.ts` + `dailyOrchestrator.ts`.

| Situation | CTA |
|-----------|-----|
| `rpe_pending` | « Donner mon ressenti (30 sec) » → `/session/rpe` |
| Pas de séance / focus | « Créer mon programme » → wizard |
| Repos hors aujourd'hui + focus | « Voir le plan » |
| `rest` | « Ajuster ma séance » (couleur `#D97706`) |
| `adapt` | « Voir l'ajustement » + secondaire « Démarrer quand même » |
| Live possible | « Démarrer ma séance » → live |
| Callisthénie plan | « Marquer comme faite » (`COMPLETE_SESSION_DONE`) |
| Import-only | Ressenti ou démarrer |
| Sinon | « Sortie libre » → record |

### 9.3 Chips séance + empty

Importer · Détails · **Pas le temps** (70 % / 50 % / Reporter demain) · `···` (Voir le plan / Sortie libre).  
Empty activités : bannière import GPX (si pas strength-only) · « Aucune activité récente ».

Autres engines Accueil : `sentinel`, `readinessScore`, `preSessionReminder`, `sessionPrediction`, `progressiveLearning`, `athleteDigitalTwin`.

---

## 10. Plan / calendrier + LoadHeatmap

**Fichiers** : `app/(tabs)/calendar.tsx`, `src/ui/calendar/PlanCalendar.tsx`, `LoadHeatmap.tsx`

- Titre « Mon plan » · bannière adaptations coach.
- `PlanCalendar` vue mois.
- **`LoadHeatmap`** embarqué : grille charge TRIMP, cellules h=**8**, swatches alpha accent 0.12→0.92 ; **masqué si maxLoad ≤ 0**.
- Jour sélectionné : `RevealPanel` ; empty « Planifier une séance ce jour » → `/program/new`.
- Séance ouverte : coachNote, steps ; **Démarrer** (live) · **Détails** · **Envoyer séance** (watch) · **Déplacer** (drop calendrier) · **Retirer** (`appConfirm`).
- FAB `+`.

Le Plan = vérité calendaire ; Accueil = cockpit « aujourd'hui » — même `state.plan`.

---

## 11. Enregistrer (pré-start)

**Fichier** : `app/(tabs)/record.tsx` · HUD `src/ui/live/AzimutTrackerHud.tsx`, `LiveTrackerChrome.tsx`

- Fond carte `ActivityRouteMap` (~95 % hauteur) ; empty GPS « Autorise le GPS… ».
- Top : « Azimut » blanc 28 · « Cap GPS » mint · **chip météo** Open-Meteo (`tempC°` + hint Chaleur/Froid/Orage/Neige/Pluie/Nuageux/Conditions OK) · `LiveDraftBanner`.
- Dock `LivePreStartDock` :
  - `LiveMetricsCapsule` Chrono `00:00` · Allure `—` · Distance `0,00` + GPS
  - `LiveAzimutControls` phase `ready` — **Go** → `/session/live?mode=free&sport=…&go=1`
  - Gauche : pills Course `#0E8F6F` / Vélo `#3B82F6` / Nage `#06B6D4`
  - Droite : **`LiveRouteSlot` WIP** — `ComingSoonLock` caption **« Bientôt »**, glyph itinéraire, non cliquable
  - Lien « Ouvrir le tracker sans lancer » (`go` absent)

---

## 12. Session live tracker COMPLET

**Fichiers** : `app/session/live.tsx` · `src/hooks/useLiveGpsTrack.ts` · `src/storage/liveSessionDraft.ts` · `src/engines/liveWorkout.ts`

### 12.1 Phases

`ready` | `running` | `paused` | `saving`

### 12.2 Contrôles

| Phase | Boutons |
|-------|---------|
| ready | Start ~88 px « Démarrer » / « Go » |
| running | **Pause** |
| paused | **Terminer** (anim spread) + **Reprendre** |
| Finish | `LiveConfirmSheet` « Terminer la séance ? » — Enregistrer / Continuer |

### 12.3 HUD métriques

Capsule : Chrono · Allure (mint `#3DFF9A`) · Distance · GPS dot mint / `#F87171`.  
Mode guided : cellules Temps · Distance · Moyenne ; jauge allure possible.  
GPS label `GPS ±N m` ; OK si accuracy **&lt; 80 m**.

### 12.4 Brouillon progressif vs sauvegarde complète

| Mode | Quand | Quoi |
|------|-------|------|
| **Progressif (draft)** | Toutes les **15 s** en running/paused + à la pause + « save later » | Clé `@azimut/live-session-draft-v1` : points GPS, elapsed, moving, distance, wallPausedAccum, sport… |
| **Reprise** | `resume=1` ou bannière Accueil/Record | Phase `paused` |
| **Complète (full)** | Confirm Terminer | Celebration ~700 ms → `clearLiveDraft` → ingest activité → navigate `/activity/[id]` + persistance session v3 |

Le draft est **séparé** de `saveSession` (état app global) et survit à refresh/crash.

### 12.5 Celebration / quitter / WIP

`LiveFinishCelebration` : overlay ✓ « Séance terminée ».  
Quitter : confirm « Reprendre plus tard ? » / abandon ; back hardware bloqué pendant séance.  
`LiveRouteSlot` reste WIP « Bientôt ».

---

## 13. Progrès body

**Fichier** : `app/(tabs)/body.tsx`

Segments pills : **Récupération** · **Performance** · **Classement** (`?tab=`).

**Récupération** : hero « N/M prêts » · `ReadinessRing` **92×92** stroke 8 · sommeil (score ou empty « Configurer la montre ») · liste muscles expand `MuscleRecoveryDetail` · tick ~15 s · engines `muscleRecovery`, `readinessScore`.

**Performance** : Readiness % + barres · calibration twin · sentinel · VMA glissante (`slidingVma`) · Critical Power · Banister · lien watch.

**Classement** : barre XP, tier/division · lien `/ranked` (voir §18).

---

## 14. Vous / profil + hub Communauté bêta

**Fichier** : `app/(tabs)/profile.tsx`

- `ProfileCover` press → `/settings/profile-cover` · avatar **88** + badge ✎ sheet · nom · @handle · bio.
- **Modifier le profil** · **Trouver des athlètes** → `/search`.
- Stats Abonnés/Abonnements → `/connections` · activités · programmes · `RankBadge` · Badges → `/badges`.
- Bloc **Communauté (bêta)** — sous-titre test · trois lignes **Bêta ›** avec aperçus `communityHubSummary` :
  1. Fil social (posts / unread) → `/(tabs)/social`
  2. Cartes & parcours (hint heatmap bientôt) → `/(tabs)/maps`
  3. Groupes (`clubsJoined` / locaux) → `/(tabs)/groups`
- Section Athlète → objectifs / sports-data / performance / privacy.
- Header : loupe · cloche · **rouage** → `/settings`.

Communauté labellisée bêta mais **utilisable** (pas de casque).

---

## 15. Communauté bêta ENTIÈRE

Client : `src/api/community.ts` · Backend : `backend/src/community.js`.  
Auth : Bearer **`az_*`** pour cloud ; sinon **seed** / local.

### 15.1 Endpoints

| Fonction | Path |
|----------|------|
| Feed | `GET /community/feed` |
| Like | `POST /community/posts/:id/like` |
| React | `POST .../react` `{ kind: costaud\|regulier\|bravo }` |
| Reports | `POST /community/reports` |
| Blocks | `GET/POST /community/blocks`, `DELETE .../:username` |
| Hub | `GET /community/hub-summary` |
| Search | `GET /community/users/search?q=` |
| Follow | `POST/DELETE /community/follow/:username` |
| Clubs | `GET .../discover`, `POST /community/clubs`, `POST .../:id/join` |
| Notifs | `GET /community/notifications` |

### 15.2 Fil (`app/(tabs)/social.tsx`)

Chip **Trouver des athlètes** · pull-to-refresh · empty « Personne à suivre… » + CTA search.  
Carte : `RankBadge` 36 · auteur · texte · km / insight coaching · `ReactionBar` · « Voir séances › ».  
Likes : API puis fallback `@azimut/feed-likes-v1`. Réactions locales + API. Filtre `communityBlocks` / `loadLocalBlocks`. Seed `SEED_FEED` (Léa, Noah, Anna).

### 15.3 ReactionBar (`src/ui/social/ReactionBar.tsx`)

♥ likeCount · 💪 Costaud · 🔥 Régulier · 👏 Bravo · `···`

### 15.4 ReportSheet (`src/ui/social/ReportSheet.tsx`)

Sheet bottom radius **24**, primary `BRAND.accent`, block `#BE123C`.  
Raisons : Spam / Harcèlement / Inapproprié / Autre.  
**Envoyer** · **Bloquer**. Toast insight ~3,2 s.

### 15.5 Groupes (`groups.tsx` + `group/[id].tsx`)

Créer (modal) · Mes clubs empty « Aucun club… » · Découvrir `catalogClubs.ts` + API · rejoindre · détail.

### 15.6 Cartes (`maps.tsx`)

`ExplorerRoutesMap` h=**340** · empty + **Enregistrer une séance** · liste focus / long-press activité.

### 15.7 Search (`search.tsx`)

Debounce **120 ms** · cloud puis registry/`DEMO_DIRECTORY` · `RankBadge` · max ~10.

### 15.8 Connections (`connections.tsx`)

Tabs Abonnés / Abonnements · empty + search.

### 15.9 Profil public (`user/[username].tsx`)

Follow/unfollow API · likes programmes/séances (XP) · privacy · `RankBadge` · ReportSheet + block · `/user/evolution`, `/user/programs`.

### 15.10 Privacy, inbox, RankBadge

Settings `privacy.tsx` · blocks `@azimut/community-blocks-v1` · sync API.  
Inbox `@azimut/social-inbox-v1` + `SocialInboxBootstrap`.  
`RankBadge.tsx` (gradients jade/or selon palier).

**Notifs web** : in-app Azimut uniquement — **pas** de badge OS au domaine GitHub (voir §20).


## 16. Wizard programme + WeekSilhouette + cutoff 18h

**Fichiers** : `app/program/new.tsx` · `app/program/_layout.tsx` · `src/engines/programBuilder.ts` · `src/ui/program/WeekSilhouettePreview.tsx` · `WizardPickers.tsx`

### 16.1 Steps

0. Sports = `POPULAR_SPORT_CATEGORIES` + **`SportComingSoonCard`** (calis verrouillée ; `selectSport('other')` no-op)
1. Venue nage / options sport
2. Catalogue / templates
3. Strength setup
4. Sessions / semaine
5. Jours
6. PPG / level / time / duration
7. Generate → `ProgramCreatedCelebration`

### 16.2 WeekSilhouettePreview

7 barres L→D, fill progressif selon jours choisis, `SoftPulse` + `StaggerIn` — silhouette avant génération.

### 16.3 Cutoff 18h

`PROGRAM_GEN_SAME_DAY_CUTOFF_HOUR = 18` dans `programBuilder.ts` :

- **Avant 18h** : 1ʳᵉ séance possible **aujourd'hui**
- **≥ 18h** : démarrage effectif **demain** (`effectiveProgramStartIso`)

Post-création : programmes / plan · `programPopularity` · `ProgramUsageBoard`.

---

## 17. Activité détail + import/export Strava

### 17.1 Détail — `app/activity/[id].tsx`

Métriques, `ActivityRouteMap`, partage/export, RPE si pending.

### 17.2 Import — `app/import-activity.tsx`

GPX / TCX (`activityFileImport`). Focus `?focus=pick` via `appFeatures`.

### 17.3 Export Strava — `src/engines/stravaExport.ts`

**URLs valides** :

| Constante | URL |
|-----------|-----|
| `STRAVA_WEB_HOME` | https://www.strava.com/ |
| `STRAVA_WEB_DASHBOARD` | https://www.strava.com/dashboard |
| `STRAVA_WEB_ACTIVITIES` | https://www.strava.com/athlete/activities |
| `STRAVA_WEB_UPLOAD_FILE` | https://www.strava.com/upload/select |
| `STRAVA_APP_SCHEME` | `strava://` |

Ouverture : scheme app si possible, sinon dashboard / activités (`WebBrowser` / `Linking`).

**Mort** : `/upload/manual` → **422** Strava — **ne pas utiliser**. Upload fichier via `/upload/select` OK.

OAuth : `src/services/stravaAuth.ts` (`EXPO_PUBLIC_STRAVA_CLIENT_ID`).  
Démo : `SIMULATE_STRAVA_SYNC` dans AppContext.

### 17.4 Montre

`garminWorkout`, `watchExport`, `watchFileFormats` — envoi depuis Plan.

---

## 18. Ranked / XP / badges / level-up / covers

### 18.1 Échelle (`rankedLadder.ts` + `core.ts`)

| Tier | Divisions | Couleur |
|------|-----------|---------|
| Bronze | 3 → 1 | `#B45309` |
| Argent | 3 → 1 | `#64748B` |
| Or | 3 → 1 | `#D97706` |
| Diamant | 3 → 1 | `#2563EB` |
| Platine | 3 → 1 | `#0D9488` |
| Élite | 3 → 1 | `#7C3AED` |
| Champion | unique | `#DC2626` |

9 niveaux / tier · 3 / division · Champion ≥ niveau **55** · `DIVISION_POOL_SIZE = 100`.  
Assets : `assets/ranks/badges/*.png`.

### 18.2 Courbe XP

`xpRequiredForLevel(L) = round(48 + 8L + 0.35 L² + 0.018 L³)` (min 40). Plafond ~niveau 100.

| Source | Valeur |
|--------|--------|
| Like programme | `PROGRAM_LIKE_XP = 20` |
| Like séance | `SESSION_LIKE_XP = 12` |
| RPE submit | `RPE_SUBMIT_XP = 40` |
| Présence quotidienne | `DAILY_PRESENCE_XP = 15` |
| 1ʳᵉ séance du jour | `FIRST_SESSION_OF_DAY_XP = 20` |
| Km | 5–10 XP/km selon compliance |

Bonus premium possible (`withPremiumXpBonus`). Guide : `XP_EARN_GUIDE_LINES`.

### 18.3 Soft ladder hebdo

`rankedLadder` / `rankedSeason` : classement sur `weekXp`, ajustements soft, reset hebdo `weekXp → 0`, settle peloton.

### 18.4 UI & covers

`GlobalLevelUpHost.tsx` · `/ranked` · `/badges` (`achievements.ts`).  
**RANK_COVERS** dans `profileCovers.ts` : un fond / palier-division (flames, mercury, liquid-gold…) · UI `settings/profile-cover.tsx` + `ProfileCover`.

---

## 19. Paramètres TOUS les écrans

Hub : `app/settings/index.tsx` · liste `SettingsList.tsx`.

| Écran | Fichier | Rôle |
|-------|---------|------|
| Profil | `settings/profile.tsx` | Identité, athlète, physique |
| Cover | `settings/profile-cover.tsx` | Fonds RANK_COVERS + free |
| Compte | `settings/account.tsx` | Connexion, RGPD export/delete, logout |
| E-mail | `settings/email.tsx` | Prefs activité / entraînement / marketing |
| Notifications | `settings/notifications.tsx` | Push + alertes entraînement / social |
| Confidentialité | `settings/privacy.tsx` | Visibilité, masquages, bloqués |
| Autorisations | `settings/data-permissions.tsx` | Caméra, photos, push… |
| Affichage | `settings/display.tsx` | Thème, unités, carte |
| Devices | `settings/devices.tsx` | Sync apps |
| Watch | `settings/watch.tsx` | Montre, sommeil |
| Goals | `settings/goals.tsx` | Objectifs |
| Sports data | `settings/sports-data.tsx` | VMA, FTP, chronos |
| Performance | `settings/performance.tsx` | Forme / TSB |
| Athlete profile | `settings/athlete-profile.tsx` | Profil sportif |
| Training schedule | `settings/training-schedule.tsx` | Créneaux |
| Subscription | `settings/subscription.tsx` | « Tout explorer » |
| Help | `settings/help.tsx` | Aide |
| Terms | `settings/terms.tsx` | CGU (public) |
| Privacy policy | `settings/privacy-policy.tsx` | Politique (public) |
| Integrations | `settings/integrations.tsx` | Redirect / legacy |
| Partners | `settings/partners.tsx` | Partenaires |

---

## 20. Notifications

### 20.1 Web = in-app only

`usesInAppNotificationsOnly()` (`pushNotifications.ts`) : **`Platform.OS === 'web'` → true**.

Sur PWA GitHub Pages :

- Pas de permission OS / badge navigateur au nom `hingantmael-gif.github.io`
- Alertes = **toasts / bandeaux AZIMUT in-app**
- `syncLocalReminders` = **no-op**
- `getPushPermissionStatus` → `granted` (sémantique in-app)

Natif : canal Android jade `#0E8F6F`, scheduling Expo Notifications.

### 20.2 Bootstrap & prefs

- `NotificationBootstrap` + `NotificationPermissionModal` (`@training/notif-prompt-handled-v2`)
- `SocialInboxBootstrap` — pull `/community/notifications` + merge inbox
- UI `/notifications` + badge cloche
- Prefs `settings/notifications.tsx`

Contenu : pré-séance / soir / sommeil (`notifications`, `preSessionReminder`) · sociales likes/follows (`socialNotifications`).

---

## 21. Stockage & sync

### 21.1 Clés AsyncStorage

| Clé | Module | Contenu |
|-----|--------|---------|
| `@training/session` (**v3**) | `sessionPersistence.ts` | authToken, profile, health, plan, activities, analyses, feedbacks, banister, lifetime, progress, pendingRpe, reminders, clubs |
| `@training/rsid` | `deviceSession.ts` | ID appareil — session liée device |
| `@training/user-registry` (+ seed ver) | `userRegistry.ts` | Annuaire / seed |
| `@training/onboarding-completed-v1` | `onboardingPersistence.ts` | Intake done |
| `@training/notif-prompt-handled-v2` | `notificationPrompt.ts` | Prompt notifs (+ legacy) |
| `@azimut/local-credentials-v1` | `localCredentials.ts` | Comptes locaux |
| `@azimut/live-session-draft-v1` | `liveSessionDraft.ts` | Draft GPS 15 s |
| `@azimut/feed-likes-v1` | `feedLikes.ts` | Likes fil |
| `@azimut/community-blocks-v1` | `communityBlocks.ts` | Blocks |
| `@azimut/social-inbox-v1` | `socialInbox.ts` | Inbox |
| `@azimut/waitlist_calisthenics` | `SportComingSoon.tsx` | Waitlist |

### 21.2 Hydratation AppContext

Boot : RSID → `loadSession` (version 3 + rsid match + authToken) → hydrate. Sinon seed / logged out.  
**Sauvegarde** : `useEffect` sur state → `saveSession` **immédiat** (pas de debounce dans le store). Logout → `clearSession`.  
Core state **pas** lazy-load par onglet.

### 21.3 Local vs API / progressif

| Donnée | Local | API |
|--------|-------|-----|
| Plan, activités, ranked, RPE | session v3 | auth partielle |
| Feed / likes / react | seed + likes locaux | si `az_*` |
| Clubs | `state.clubs` | create/join/discover |
| Blocks / inbox | AsyncStorage | sync si token |
| Hub / feed / clubs discover / notifs | — | **fetch à l'ouverture écran** |

Progressif = draft live 15 s. Full app = rewrite session v3 à chaque mutation. Full activité = confirm live.

### 21.4 API base

`src/services/apiBase.ts` : `EXPO_PUBLIC_API_URL` sinon host `github.io`/`onrender.com` → `https://azimut-auth-api.onrender.com`, sinon `http://localhost:8787`.

---

## 22. Catalogue engines

Tous sous `src/engines/` :

| Fichier | Rôle |
|---------|------|
| `achievements.ts` | Badges / succès |
| `activityDuplicate.ts` | Dédup activités |
| `activityFileImport.ts` | GPX/TCX |
| `athleteDigitalTwin.ts` | Jumeau / calibration |
| `athleteLoadBridge.ts` | Pont charge |
| `athleteProfile.ts` | Profil sportif |
| `banisterPlus.ts` | Fitness-fatigue étendu |
| `bikePrediction.ts` | Pred vélo |
| `calisthenicsProgramming.ts` | Prog calis (WIP UI) |
| `calisthenicsSkillTree.ts` | Skills calis |
| `coachingEngine.ts` | Cœur coach |
| `compliancePresentation.ts` | Affichage compliance |
| `concurrentSessions.ts` | Séances concurrentes |
| `core.ts` | XP, Banister base, constantes |
| `countryLock.ts` | Verrou pays |
| `criticalPower.ts` | CP |
| `dailyAdjustment.ts` | Ajustement du jour |
| `dailyOrchestrator.ts` | Orchestration quotidienne |
| `garminWorkout.ts` | Export Garmin |
| `intentStartupRamp.ts` | Ramp intent |
| `kmOdyssey.ts` | Odyssée km |
| `liveWorkout.ts` | Séance live |
| `multiProgramPlan.ts` | Multi-programmes |
| `multiSportPrediction.ts` | Pred multi |
| `muscleRecovery.ts` | Récup muscles |
| `notifications.ts` | Rappels planifiés |
| `paceCompare.ts` | Comparaison allures |
| `paceZones.ts` | Zones |
| `planAdaptation.ts` | Adaptation plan |
| `planGenerator.ts` | Génération plan |
| `planOverload.ts` | Surcharge |
| `preSessionReminder.ts` | Rappel pré-séance |
| `profileCovers.ts` | RANK_COVERS |
| `profilePrivacy.ts` | Confidentialité |
| `programBuilder.ts` | Wizard + cutoff 18h |
| `programPopularity.ts` | Popularité |
| `programProgress.ts` | Progrès programme |
| `programSessions.ts` | Séances programme |
| `programStreak.ts` | Streaks |
| `progressiveLearning.ts` | Apprentissage |
| `raceTimePrediction.ts` | Pred chronos |
| `rankedLadder.ts` | Soft ladder |
| `rankedSeason.ts` | Saison / weekXp |
| `rankingRewards.ts` | Récompenses |
| `readinessScore.ts` | Readiness |
| `runSessionLibrary.ts` | Lib séances course |
| `sentinel.ts` | Sentinelle |
| `sessionFrequencyCoach.ts` | Fréquence |
| `sessionPrediction.ts` | Pred séance |
| `sessionVolumePolicy.ts` | Volume |
| `sleepAdaptation.ts` | Sommeil adapt |
| `sleepCalendar.ts` | Cal sommeil |
| `sleepProgramRamp.ts` | Ramp sommeil |
| `slidingVma.ts` | VMA glissante |
| `socialCoachingInsight.ts` | Insights posts |
| `socialFanOut.ts` | Fan-out |
| `socialNotifications.ts` | Notifs sociales |
| `sportsScience.ts` | Science sport |
| `startupSoftening.ts` | Soft démarrage |
| `stravaExport.ts` | Export Strava |
| `strengthProgramming.ts` | Force |
| `subscription.ts` | Abonnement |
| `swimPrediction.ts` | Pred nage |
| `trainingConstraints.ts` | Contraintes |
| `trainingSchedulePolicy.ts` | Planning |
| `volumeProgression.ts` | Volume |
| `watchExport.ts` | Export montre |
| `watchFileFormats.ts` | Formats |
| `weekReview.ts` | Bilan semaine |
| `workoutPresentation.ts` | Présentation |
| `worldRankings.ts` | Classements monde |

---

## 23. PWA / SW v67 / install

- `public/sw.js` — cache **`azimut-static-v67`** ; precache manifest + icons ; `skipWaiting` / `clients.claim` ; message `AZIMUT_SW_ACTIVATED`.
- `WebPwaBootstrap.tsx` — register `/sw.js?v=48` (query bust) ; update on focus/visibility/AppState ; reload on activate ; `maybeCompleteAuthSession` Google.
- Route publique `/install`.
- Live https://hingantmael-gif.github.io/ — `npm run deploy:install-site` pour publier.

---

## 24. Données démo / seed / fake

- Essai **`1` / `1`** → `1@demo.local`, onboarding **completed**, plan vide, activities `[]`.
- `src/data/seed.ts` : bronze D3 XP0, privacy private, notifs seed, cover `free-teal`, socialNotifications (Léa/Nathan/Nina + extras).
- `DEMO_DIRECTORY` ~40+ athlètes FR pour search/profils/ladder.
- `SEED_FEED` 3 posts community.
- 2FA code affiché si `pending2faCode`.
- `SIMULATE_STRAVA_SYNC`.
- `catalogClubs.ts`.

---

## 25. États vides & WIP

| Écran | Empty |
|-------|-------|
| Accueil activités | « Aucune activité récente » + import GPX |
| Plan jour | « Planifier une séance ce jour » |
| Record GPS | « Autorise le GPS… » |
| Fil | « Personne à suivre… » + search |
| Groupes | « Aucun club… » |
| Maps | Empty + Enregistrer |
| Connections | Empty + search |
| LoadHeatmap | null si maxLoad≤0 |
| Sommeil body | « Configurer la montre » |

**WIP casque (non cliquable)** :

| Zone | Caption | Composant |
|------|---------|-----------|
| Callisthénie onboarding + wizard | En construction | `SportComingSoonCard` + waitlist |
| Itinéraire live / pré-start | Bientôt | `LiveRouteSlot` |

**Bêta utilisable (pas casque)** : Communauté entière.  
`appFeatures.ts` liste aussi nutrition, safety, race-predictor, etc. — vérifier l'écran avant de documenter comme final.

---

## 26. Matrice CTA critiques

| CTA | Où | Destination / effet |
|-----|----|---------------------|
| Inscription | Welcome | `/register` |
| Se connecter | Welcome | `/login` |
| Continuer Google | Login / Register | OAuth + API |
| Se connecter (submit) | Login | Essai 1/1 → API → local |
| Valider e-mail | 2FA | tabs ou onboarding |
| Continuer onboarding | Onboarding | next / finish |
| Démarrer ma séance | Accueil | `/session/live` |
| Créer mon programme | Accueil / empty | `/program/new` |
| Donner mon ressenti | Accueil | `/session/rpe` |
| FAB + | Accueil / Plan | `/program/new` |
| Go | Record | live `go=1` |
| Pause / Terminer / Reprendre | Live | phases + sheet |
| Enregistrer (confirm) | Live sheet | celebration → activity |
| Loupe | Header | `/search` |
| Cloche | Header | `/notifications` |
| Rouage | Vous | `/settings` |
| Fil / Cartes / Groupes | Hub profil | tabs community |
| ♥ / réactions | Fil | API + local likes |
| ··· Report | Fil / profil | ReportSheet |
| Rejoindre club | Groups | API / local |
| Importer | Accueil / import | GPX/TCX |
| Ouvrir Strava | Export | dashboard / upload/select (**pas** manual) |
| Waitlist calis | ComingSoon footer | AsyncStorage only |

---

## 27. Guide pour une autre IA / développeur

### 27.1 Avant de coder

1. Lire `.cursor/rules/wip-coming-soon.mdc` — feature incomplète = visible + casque + non cliquable.
2. Lire Expo **v57** (`AGENTS.md`).
3. Respecter PhoneShell (pas de layout desktop large).
4. Brand jade/mint/ink — pas orange Strava comme identité.

### 27.2 Où modifier quoi

| Besoin | Où |
|--------|-----|
| Nouvel écran | `app/...` + hub / features |
| État global | `AppContext` + `domain.ts` |
| Persistance | `src/storage/*` clé `@azimut/...` versionnée |
| Coach du jour | `dailyAdjustment` / `dailyOrchestrator` |
| Live GPS | `session/live` + `liveSessionDraft` |
| Social | `src/api/community.ts` + tabs masqués |
| XP / ranks | `core.ts` + `rankedLadder.ts` |
| Theme | `palettes.ts` / `tokens.ts` |
| PWA cache | incrémenter `azimut-static-vN` dans `public/sw.js` |

### 27.3 Pièges

- Token community doit commencer par **`az_`** sinon seed.
- Session v3 liée au **rsid** — autre navigateur ≠ même session.
- Strava `/upload/manual` = mort (422).
- Essai `1`/`1` saute l'onboarding — ne pas l'utiliser pour tester intake.
- Callisthénie : engines OK, UI verrouillée — retirer ComingSoon partout avant d'activer.
- Web notifs = in-app AZIMUT, **jamais** promettre le badge OS GitHub Pages.
- Traces GPS → draft 15 s, **pas** dans le blob session principal.

### 27.4 Déploiement

Après évol visuelle/fonctionnelle : `npm run deploy:install-site` vers https://hingantmael-gif.github.io/ (sauf refus explicite utilisateur).

### 27.5 Smoke test

1. Welcome → login `1`/`1` → Accueil.
2. FAB → wizard (calis casque).
3. Record → Go → Pause → Terminer → activity.
4. Refresh mid-live → draft banner.
5. Vous → Communauté bêta → fil like + report.
6. Loupe search + cloche.
7. Desktop >520 px → cadre 390.
8. Dark mode settings display.

### Annexe A — Dimensions

| Élément | Valeur |
|---------|--------|
| PhoneShell breakpoint | 520 px |
| Phone width / max height / radius | 390 / 844 / 28 |
| Tab bar / record btn / FAB | 58 / 40×40 / 56×56 |
| Header icon hit | 36×36 |
| Avatar / ReadinessRing | 88 / 92×92 stroke 8 |
| ExplorerRoutesMap / heatmap cell | h 340 / h 8 |
| Live start / ReportSheet r / helmet | ~88 / 24 / 56 (40 compact) |
| Spacing tokens | xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48 |
| Radii tokens | sm 8 · md 12 · lg 16 · xl 24 · pill 999 |
| Typo | hero 28/800 · title 22/700 · body 15 · button 16/700 · caption 12 |

### Annexe D — Fonds de profil (détail unlock)

Fichier : `src/engines/profileCovers.ts` · UI : `app/settings/profile-cover.tsx` · rendu : `ProfileCover.tsx`  
Défaut : `free-teal`.

**Gratuits / styles libre** : palette teal et variants « extrêmes » free (toujours sélectionnables).

**RANK_COVERS** — un fond par palier atteint (effet FX selon palier : flammes, mercure, or liquide, cristaux, éclairs…) :

| Unlock | Condition |
|--------|-----------|
| Bronze 3 → 1 | Rang ≥ ce palier |
| Argent 3 → 1 | idem |
| Or 3 → 1 | idem |
| Diamant 3 → 1 | idem |
| Platine 3 → 1 | idem |
| Élite 3 → 1 | idem |
| Champion | Tier champion |

**Records personnels** : PB run / bike / swim.

**Distance cumulée (exemples)** :

| Sport | Seuils km |
|-------|-----------|
| Course | 5 · 10 · 21,1 · 42,195 · 50 · 100 |
| Vélo | 40 · 100 · 160 · 200 |
| Natation | 1 · 2 · 5 · 10 |

Sur l’écran cover : grille de vignettes ; cadenas si non unlock ; tap = sélection → `UPDATE_PROFILE` `profileCoverId` → persistance session v3.

### Annexe E — Comment monter en classement (parcours utilisateur)

1. **Faire des séances** (live GPS ou import GPX) → XP distance + durée + compliance.
2. **Valider le RPE** après séance → +40 XP.
3. **Être présent** (ouverture app / présence jour) → +15 XP possible.
4. **Likers / être liké** (programmes +12/+20) — social.
5. Observer la **barre XP** sur Progrès → Classement et le toast `XpGainToast`.
6. Au **passage de niveau** : `GlobalLevelUpHost` (célébration différée).
7. Chaque **semaine ISO** : soft ladder (`weekXp`) → promo / rétro de division (Bronze 3 = plancher).
8. Débloquer **covers** et **badges** au fur et à mesure.

Le peloton affiché sur `/ranked` est **généré / seed** (DEMO_DIRECTORY) — pas un ladder serveur mondial réel à date.

---

*Fin du document — Azimut Description Complète V3 · Septembre 2026*

### Annexe B — UI critiques

`PhoneShell` · `ComingSoon` · `TabHeaderActions` · `FloatingActionButton` · `LiveDraftBanner` · `AzimutTrackerHud` · `LiveTrackerChrome` · `ReactionBar` · `ReportSheet` · `RankBadge` · `GlobalLevelUpHost` · `SportComingSoon` · `WeekSilhouettePreview` · `softMotion` · `NotificationBootstrap` · `SocialInboxBootstrap` · `WebPwaBootstrap`

### Annexe C — Glossaire

| Terme | Sens |
|-------|------|
| Soft ladder | Classement hebdo `weekXp` avec ajustements doux |
| Sentinelle | Alerte charge / récup |
| Twin / calibration | Confiance modèle athlète |
| Draft live | Brouillon GPS 15 s AsyncStorage |
| Session v3 | Snapshot app persisté device |
| Bêta communauté | Social utilisable, données parfois seed |
| Casque | WIP non cliquable |
| Cutoff 18h | 1ʳᵉ séance programme aujourd'hui vs demain |

---

*Fin du document — Azimut description complète, septembre 2026. Fichier autonome : `docs/azimut-description-complete.md`.*

# Azimut — Communauté (bêta)
## Description exhaustive des écrans, boutons, flux et design

**Document produit** · Septembre 2026  
**Périmètre** : uniquement la zone **Communauté (bêta)** — fil social, groupes / clubs, cartes & parcours, et tous les écrans satellites nécessaires (recherche, abonnements, profils publics, notifications sociales, confidentialité).  
**Hors périmètre** : coaching, programmes, tracker GPS live, ranked, nutrition, etc.

> **Statut produit** : la section est explicitement labellisée **« Bêta »** depuis l’onglet **Vous**. Les écrans sont **navigables et utilisables** (pas de casque « En construction »). En revanche, une partie des données est **démo** ou **locale au device** (pas encore un vrai réseau cloud multi-utilisateurs).

---

## 1. Vue d’ensemble

### 1.1 Qu’est-ce que la « Communauté (bêta) » ?

C’est le bloc social d’Azimut : découvrir d’autres athlètes, s’abonner, liker des programmes / séances, créer ou rejoindre des clubs, publier dans un groupe, et visualiser ses tracés GPS sur une carte.

Elle se distingue du reste de l’app par :
- un **hub d’entrée unique** dans le profil (**Vous**) ;
- des routes **hors barre d’onglets principale** (pas d’icône Fil / Groupes / Cartes dans le tab bar) ;
- un marquage UI **« Bêta › »** sur chaque entrée ;
- une identité visuelle alignée sur la charte Azimut (**jade `#0E8F6F`**, mint, ink `#07111F`, cartes `bgElevated`).

### 1.2 Carte des écrans

| Écran | Route | Entrée principale |
|-------|-------|-------------------|
| Hub Communauté | `/(tabs)/profile` (section) | Onglet **Vous** |
| Fil social | `/(tabs)/social` | Hub → **Fil social** |
| Cartes & parcours | `/(tabs)/maps` | Hub → **Cartes & parcours** |
| Groupes (liste) | `/(tabs)/groups` | Hub → **Groupes** |
| Détail groupe | `/group/[id]` | Liste / création / rejoindre |
| Recherche athlètes | `/search` | Loupe header, chips, boutons |
| Réseau (abonnés) | `/connections` | Stats profil / recherche |
| Profil public | `/user/[username]` | Fil, membres, recherche… |
| Évolution (autre) | `/user/evolution` | Profil public |
| Programmes (autre) | `/user/programs` | Profil public |
| Notifications | `/notifications` | Cloche header |
| Confidentialité | `/settings/privacy` | Réglages |
| Notifs sociales (toggle) | `/settings/notifications` | Réglages → Social |

### 1.3 Navigation globale liée

- **Barre d’onglets** : social / groups / maps existent en stack mais avec `href: null` — **invisibles** dans le tab bar. Retour stack → profil.
- **Header** (`TabHeaderActions`) :
  - **Loupe** → `/search` (« Rechercher des athlètes »)
  - **Cloche** (+ badge) → `/notifications`
- **Catalogue features** (`appFeatures`, section « Social & découverte ») : liens search, feed, groups, maps, notifications, fonds de profil.

---

## 2. Hub — section « Communauté (bêta) » (onglet Vous)

**Fichier** : `app/(tabs)/profile.tsx`

### 2.1 Emplacement dans la page

Sur le profil personnel, après les stats et les actions de profil, apparaît un **bloc dédié** :

1. **Titre** : `Communauté (bêta)`
2. **Sous-titre** : `Social, cartes et groupes — fonctionnalités en test`
3. **Trois lignes cliquables**, chacune avec un chevron / label **`Bêta ›`** :
   - **Fil social** → `/(tabs)/social`
   - **Cartes & parcours** → `/(tabs)/maps`
   - **Groupes** → `/(tabs)/groups`

### 2.2 Éléments adjacents utiles au social

Juste au-dessus / autour du hub :
- Compteurs **Abonnés** / **Abonnements** (tap → `/connections` avec onglet correspondant)
- Bouton **Modifier le profil**
- Bouton **Trouver des athlètes** → `/search`

### 2.3 Design

- Typographie profil : titre fort, muted pour le sous-titre bêta.
- Lignes de navigation : style liste / settings (ligne + trailing `Bêta ›`), pas de casque chantier.
- Couleur d’accent jade sur les éléments interactifs du profil.

### 2.4 Comportement à l’ouverture

Ouvrir **Vous** charge le profil local (`state.profile`). La section communauté est **toujours visible** (pas de feature flag qui la masque). Un tap ouvre l’écran cible avec le titre stack (**Fil social**, **Cartes**, **Groupes**) et un bouton retour vers le profil.

---

## 3. Fil social

**Fichier** : `app/(tabs)/social.tsx`  
**Titre stack** : `Fil social`

### 3.1 À l’ouverture de la page

1. Fond `Screen` avec padding haut.
2. **Titre** : `Fil social`
3. **Sous-texte** : `Touche un @pseudo pour ouvrir le profil et ses séances.`
4. **Rangée de chips** :
   - `Recherche @pseudo` — toggle : active un filtre démo sur `lea` / désactive
   - `Contacts` — navigation vers `/search`
5. **Liste verticale** de cartes de posts (FlatList).

### 3.2 Contenu des posts (données démo hardcodées)

| Auteur (handle) | Texte | Distance affichée |
|-----------------|-------|-------------------|
| Léa (`leamartin`) | `6×1000 m validés — merci pour les likes !` | 12,4 km |
| Noah (`noahpetit`) | `Sortie longue 22 km · D+ 650` | 22 km |
| Anna (`annap`) | `Brick vélo + footing transition` | 45 km |

Ville / nom d’affichage enrichis via `findDemoMember` (`src/data/demoDirectory.ts`).

### 3.3 Structure d’une carte (haut → bas)

1. **En-tête pressable** (ouvre le profil) :
   - Nom affiché (ex. Léa)
   - `@handle`
   - Chevron `›` à droite
2. **Corps** : texte du post
3. **Méta** : `X km · ville` (si ville connue)
4. **Pied** :
   - Bouton **`Like (N)`** — incrémente un compteur **local React state** (non persisté, pas de fan-out inbox)
   - Lien **`Voir séances ›`** → `/user/{username}`

### 3.4 Interactions détaillées

| Action | Résultat |
|--------|----------|
| Tap carte / en-tête | Profil public `/user/...` |
| Tap `Like (N)` | N → N+1 en mémoire ; perdu au refresh |
| Chip Recherche | Filtre la liste (ou reset) |
| Chip Contacts | Écran recherche athlètes |
| Liste vide après filtre | Aucun empty state dédié (liste simplement vide) |

### 3.5 Design

- Cartes : `backgroundColor: colors.bgElevated`, `borderRadius` tokens, bordure légère.
- Likes en bas de carte, style bouton secondaire / chip.
- Pas d’image de couverture, pas de carte de route inline, pas de commentaires.

### 3.6 Limites bêta (honnêtes)

- Feed **figé** (3 posts) — pas d’API, pas de scroll infini réel.
- Likes **éphémères**.
- Pas de création de post depuis le fil (la publication se fait dans les **groupes**).

---

## 4. Groupes & clubs

### 4.1 Liste des groupes

**Fichier** : `app/(tabs)/groups.tsx`  
**Titre** : `Groupes`

#### Ouverture

1. Titre **`Mes groupes et clubs`**
2. Intro : **`Crée un club pour partager séances, programmes et infos — ou rejoins un groupe local.`**
3. Bouton primaire **`Créer un groupe`**
4. Section **`Mes clubs`**
5. Section **`Découvrir`** (catalogue)

#### Empty state « Mes clubs »

- Titre : `Aucun club pour l’instant`
- Texte : `Crée le tien (ex. « Runners Nantes ») ou rejoins un club ci-dessous.`

#### Ligne d’un club (mes clubs)

- Avatar circulaire avec **initiale** du nom
- Nom du club
- Méta : `N membre(s) · ville · sport`
- Chevron `›`
- Tap → `/group/{id}`

#### Section Découvrir

Clubs catalogue non encore rejoints. Bouton **`Rejoindre`** par carte → action `JOIN_CATALOG_CLUB` puis ouverture du détail.

#### Catalogue seed (`src/constants/catalogClubs.ts`)

| Nom | Ville | Sport | Membres (affichés) |
|-----|-------|-------|--------------------|
| Runners Paris | Paris | Course | 1240 |
| Trail Bretagne | Bretagne | Trail | 890 |
| Triathlon Nantes | Nantes | Triathlon | 456 |

Chaque club catalogue embarque description + posts d’exemple (sorties, fractionné, programmes…).

#### Modal « Nouveau groupe »

Ouverture via **Créer un groupe** :

| Champ | Placeholder / label |
|-------|---------------------|
| Nom | `Nom du groupe` (requis) |
| Description | `Description (optionnel)` |
| Ville | `Ville (optionnel)` |
| Sport | `Sport (ex. Course, Trail…)` |

Hint : `Les membres pourront y publier séances, programmes et messages.`  
Boutons : **`Créer`** / **`Annuler`**.

**Créer** → `CREATE_CLUB` (persistance session `state.clubs`) → navigation `/group/{newId}`. L’utilisateur courant devient **Créateur**.

### 4.2 Détail d’un groupe

**Fichier** : `app/group/[id].tsx`  
**Titre stack** : `Groupe`

#### Hero (haut)

- Grande initiale / avatar
- Nom
- Méta : membres · ville · sport
- Description

#### Onglets (3)

| Onglet | Contenu |
|--------|---------|
| **Fil** | Publications + composer |
| **Membres** | Liste des membres + rôles |
| **Partager** | Partage séance/programme + quitter/supprimer |

#### Onglet Fil

1. Zone composer : champ **`Écrire au groupe…`** + bouton **`Publier`**
2. Empty : **`Pas encore de publication.`**
3. Posts :
   - Texte libre
   - Badges possibles : **`Séance partagée`**, **`Programme partagé`**
   - Lien **`Voir la séance ›`** si activité liée
4. Action `POST_CLUB_MESSAGE`

#### Onglet Membres

- Lignes membre (nom / handle) → ouverture profil
- Badges rôle : **`Créateur`**, **`Admin`**

#### Onglet Partager

1. Hint sur le partage de séances GPS / programmes
2. Bouton **`Partager une séance`** → modal de sélection parmi `state.activities`
3. Bouton **`Partager un programme`** → modal (programme actif mis en avant)
4. Empty FR si aucune séance / aucun programme
5. Bas de page :
   - Owner : **`Supprimer le groupe`** (`DELETE_CLUB`)
   - Membre : **`Quitter le groupe`** (`LEAVE_CLUB`)

#### Groupe introuvable

Message : **`Ce groupe n’est plus disponible.`** + **`Retour aux groupes`**.

### 4.3 Persistance & actions

| Action AppContext | Effet |
|-------------------|--------|
| `CREATE_CLUB` | Ajoute club + owner |
| `JOIN_CATALOG_CLUB` | Clone catalogue → clubs user |
| `LEAVE_CLUB` | Retire le membre |
| `DELETE_CLUB` | Supprime (owner) |
| `POST_CLUB_MESSAGE` | Ajoute post texte |
| `SHARE_ACTIVITY_TO_CLUB` | Post lié activité |
| `SHARE_PROGRAM_TO_CLUB` | Post lié programme |

Stockage : `state.clubs` via persistence de session locale (pas de synchro cloud inter-appareils).

### 4.4 Design groupes

- Cartes listes cohérentes avec le reste de l’app (elevated, radius `lg`).
- Hero détail plus « club » (initiale colorée).
- Onglets type segmented control.
- Modals plein écran / sheet selon primitives existantes.
- CTA primaires jade.

---

## 5. Cartes & parcours

**Fichiers** : `app/(tabs)/maps.tsx`, `src/ui/ExplorerRoutesMap.tsx`  
**Titre** : `Cartes`

### 5.1 Ouverture

1. Titre **`Cartes & parcours`**
2. Sous-texte : **`Tous tes tracés GPS sur une même carte — où tu as déjà couru, et ce qu’il reste à explorer.`**
3. **Carte multi-traces** (hauteur ~340)
4. Section compteur : **`N parcours GPS`** / **`Parcours GPS`**
5. Liste des activités GPS

### 5.2 Empty state

- Titre : **`Pas encore de tracé`**
- Texte invitant à enregistrer au GPS
- CTA **`Enregistrer une séance`** → `/(tabs)/record`

### 5.3 Liste d’un parcours

Pour chaque activité avec `streams.latlng.length >= 2` :
- Nom / titre
- Méta : date · distance · durée
- Lien **`Voir ›`** → `/activity/[id]`
- **Tap** : focus la trace sur la carte (opacité réduite sur les autres)
- **Long-press** : ouvre l’activité

### 5.4 Comportement de la carte (`ExplorerRoutesMap`)

| Plateforme | Rendu |
|------------|--------|
| Web | Leaflet + tuiles OSM |
| Native | SVG simplifié |

- Empty map label (défaut composant) : *« Tes séances GPS s’afficheront ici… »* (overridden côté écran maps).
- Palette de couleurs par trace (accent brand + oranges / bleus / roses…).
- Focus d’une trace : les autres s’atténuent.
- **Pas** de bouton couches satellite / 3D / segments Strava-like — pan & zoom seulement.
- **Pas** de parcours d’autres utilisateurs : uniquement **tes** activités locales.

### 5.5 Design

- Carte pleine largeur, coins arrondis.
- Liste sous la carte, style activité classique Azimut.
- Accent jade sur CTA empty.

### 5.6 Limite bêta

« Communauté » au sens carte = **exploration de ses propres traces**, pas encore de heatmaps sociales ou segments partagés.

---

## 6. Recherche d’athlètes & abonnements

### 6.1 Recherche — `/search`

**Titre** : `Athlètes`

| État | UI |
|------|-----|
| Champ | Placeholder `Chercher un athlète (@identifiant)` |
| Idle | `Tape le début d’un identifiant…` + `Voir mes abonnements` |
| Aucun résultat | `Aucun profil ne commence par « … ».` |
| Résultat | Carte : nom, @handle, badge `· Abonné` si déjà suivi, ville·sport, badges affinité |

**Badges affinité possibles** :
- `Même ville · même sport`
- `Proche de vous`
- `Sport en commun`

**Source** : `suggestProfiles` → registry AsyncStorage (`userRegistry`) — multi-comptes **sur le même appareil**.

### 6.2 Réseau — `/connections?tab=followers|following`

**Titre** : `Réseau`

- Onglets : **`Abonnés (N)`** / **`Abonnements (N)`**
- Empty abonnés : `Pas encore d’abonnés.`
- Empty abonnements : `Tu ne suis personne pour le moment.`
- CTA : **`Trouver des athlètes`**

Données : `profile.followerUsernames` / `followingUsernames`.

---

## 7. Profil public & s’abonner (cœur du social)

**Fichier** : `app/user/[username].tsx`  
**Titre** : `Profil`

Si l’username est **soi-même** → redirection `/(tabs)/profile`.

### 7.1 Ouverture — layout haut → bas

1. **Bannière demande d’abonnement** (si applicable) :
   - Texte type : *« X a envoyé une demande… »*
   - Boutons **`Accepter`** / **`Refuser`**
2. **Avatar** (`ProfileAvatar`)
3. **Nom** + **@handle**
4. **Bio** (`BioRichText`)
5. Badge visibilité : **`Public`** / **`Abonnés uniquement`** / **`Privé`** (`visibilityLabel`)
6. Ville · sport
7. **Bouton d’abonnement** (états ci-dessous)
8. Bloc **Volumes & activité** (stats démo si membre directory)
9. Teasers / lock si profil non accessible
10. Blocs **Évolution**, **Programmes**, **Séances** avec likes cœur

### 7.2 Machine d’états du bouton s’abonner

| État affiché | Signification | Action au tap |
|--------------|---------------|---------------|
| **S'abonner** | Pas de relation | `FOLLOW_USER` (immédiat si public, sinon demande) |
| **Demande envoyée** | En attente | `CANCEL_FOLLOW_REQUEST` |
| **Abonné** | Suit déjà | `UNFOLLOW_USER` |
| **S’abonner en retour** | L’autre te suit, pas réciproque | Follow |

Profils démo avec règles de privacy simulées (`private` / `followers_only` / `public`) dans le code.

### 7.3 Likes sur programmes & séances

- Composant `HeartLikeButton` — accessibilité **`Aimer`** / **`Déjà aimé`**
- Actions : `LIKE_PROGRAM`, `LIKE_SESSION`
- XP : `PROGRAM_LIKE_XP` / `SESSION_LIKE_XP` (+ bonus premium éventuel)
- Alert confirmation type **`Like envoyé`**
- Clés persistées : `likedProgramKeys` / `likedSessionKeys`
- Fan-out vers inbox du propriétaire via `socialFanOut`

### 7.4 Sous-écrans

- `/user/evolution` — **Évolution**
- `/user/programs` — **Programmes**  
Accès depuis teaser / lien « Voir » sur le profil public (selon droits privacy).

### 7.5 Design profil public

- Header avatar + bio riche
- Bouton follow plein largeur / primary jade
- Stats en grille compacte (`formatCompactNumber`)
- Cœurs likes discrets sur les cartes séance/programme
- Lock « Profil privé » quand l’accès est refusé

---

## 8. Notifications sociales & « s’abonner » côté réception

### 8.1 Écran Notifications — `/notifications`

**Titre** : `Notifications`  
Entrée : cloche header (badge si non lues).

#### Types de messages (libellés FR dynamiques)

Exemples générés côté moteur :
- *a aimé votre programme*
- *a aimé votre séance*
- *souhaite s’abonner*
- *s’est abonné(e)*
- *a accepté votre demande*
- etc.

#### Actions inline

| Situation | Boutons |
|-----------|---------|
| Demande d’abonnement | **Accepter** / **Refuser** |
| Quelqu’un t’a suivi | **S’abonner en retour** |
| Déjà mutuel | Texte **`Vous vous suivez mutuellement`** |

Empty : **`Aucune notification pour le moment.`**  
Pagination : **`Charger plus`**  
Pull-to-refresh : `claimSocialInboxEvents`

### 8.2 Pipeline technique (invisible mais fonctionnel)

| Module | Rôle |
|--------|------|
| `src/storage/socialInbox.ts` | AsyncStorage `@azimut/social-inbox-v1`, max ~40 events / destinataire |
| `src/engines/socialFanOut.ts` | Enqueue après follow / like / accept |
| `src/ui/notifications/SocialInboxBootstrap.tsx` | Poll adaptatif + toast in-app → `/notifications` |
| Push copy | *Nouvel abonné*, *Demande d’abonnement*, *Like sur votre programme/séance*… |

Le poll toast n’apparaît que si `profile.notifications.social` est activé.

### 8.3 Réglages notifications — Social

**Fichier** : `app/settings/notifications.tsx`

Section **Social** :
- Toggle **`Nouvel abonné & likes programmes`** (`notifications.social`)

---

## 9. Confidentialité (impact direct sur la communauté)

**Fichier** : `app/settings/privacy.tsx`  
Entrée settings : **`Qui peut voir mon profil`**

### Options de visibilité

| Option | Effet sur le social |
|--------|---------------------|
| **Public** | Follow immédiat ; stats visibles selon toggles |
| **Abonnés uniquement** | Contenu réservé aux followers acceptés |
| **Privé** | Demande d’abonnement obligatoire |

### Toggles de masquage

- Masquer programmes
- Masquer temps / progression
- Masquer stats
- Masquer FC
- Masquer poids
- (autres zones privacy)

Le moteur `profilePrivacy` (`resolveProfileAccess`, `resolveContentFlags`) décide ce que le visiteur voit sur `/user/[username]`.

---

## 10. Design system de la zone (synthèse visuelle)

| Élément | Traitement |
|---------|------------|
| Accent | Jade Azimut `#0E8F6F` / mint signal |
| Fonds | `colors.bg` / cartes `bgElevated` |
| Labels bêta | Texte `Bêta ›` sur hub (pas de casque 👷) |
| Cartes | Radius tokens (`radii.lg`), bordure légère, padding généreux |
| Chips | `Chip` primitives (fil social) |
| Boutons primary | Jade plein, labels FR courts |
| Empty states | Titre + phrase + CTA (groupes, maps, connections, notifs) |
| Carte Leaflet | Traces colorées multi-activités, focus atténue le reste |
| Typography | Titles forts, Muted pour intros, Body pour posts |

**Différence volontaire vs Strava** : pas d’orange signature, pas de « kudos » (l’app dit **Like**), clubs locaux Azimut, hub regroupé sous **Communauté (bêta)** plutôt que tabs sociales permanentes.

---

## 11. Flux utilisateur complets (scénarios)

### 11.1 Découvrir et s’abonner

1. **Vous** → **Trouver des athlètes** (ou loupe)
2. Tape un `@identifiant`
3. Ouvre une carte résultat → profil public
4. Tape **S'abonner**
5. Si public → abonné tout de suite + event inbox destinataire
6. Si privé → **Demande envoyée** ; l’autre voit Accepter/Refuser dans Notifications
7. Après acceptation → accès contenu selon privacy

### 11.2 Liker une séance / un programme

1. Depuis fil → profil → liste séances/programmes
2. Tap cœur **Aimer**
3. XP éventuel + alert
4. Fan-out → notification *a aimé votre…* chez le propriétaire

### 11.3 Créer un club et partager

1. **Vous** → **Groupes** → **Créer un groupe**
2. Remplit nom (+ optionnels) → **Créer**
3. Onglet **Partager** → choisit une séance GPS ou un programme
4. Le post apparaît dans l’onglet **Fil** avec badge
5. Membres (après rejoindre catalogue ou invite locale) voient le fil

### 11.4 Explorer ses parcours

1. **Vous** → **Cartes & parcours**
2. Voit toutes les traces GPS
3. Tap une ligne → focus carte
4. **Voir ›** → détail activité (insight coaching social éventuel sur la page activité, hors fil)

---

## 12. Matrice fonctionnel vs bêta / démo

| Zone | Utilisable ? | Persistance | Nature réelle |
|------|--------------|-------------|---------------|
| Hub Communauté (bêta) | Oui | — | Label produit |
| Fil social | Oui (UI) | Likes non ; feed fixe | **Démo** |
| Groupes liste + détail | Oui | `state.clubs` local | **Local device** |
| Cartes & parcours | Oui | `activities` GPS | **Perso**, pas social |
| Recherche / réseau | Oui | profile + registry | **Local multi-compte** |
| Profils + follow + likes | Oui | profile + likes keys | **Local + démo directory** |
| Notifications sociales | Oui | AsyncStorage inbox | **Local device** |
| Confidentialité | Oui | profile.privacy | Fonctionnel |
| ComingSoon casque | **Absent** sur cette zone | — | Marquage **Bêta** seulement |

---

## 13. Fichiers sources (référence technique)

```
app/(tabs)/profile.tsx          → Hub Communauté (bêta)
app/(tabs)/social.tsx           → Fil social
app/(tabs)/groups.tsx           → Liste groupes
app/(tabs)/maps.tsx             → Cartes & parcours
app/(tabs)/_layout.tsx          → Stack titres / href null
app/group/[id].tsx              → Détail club
app/user/[username].tsx         → Profil public + follow/likes
app/user/evolution.tsx
app/user/programs.tsx
app/search.tsx
app/connections.tsx
app/notifications.tsx
app/settings/privacy.tsx
app/settings/notifications.tsx
src/ui/ExplorerRoutesMap.tsx
src/ui/TabHeaderActions.tsx
src/ui/social/HeartLikeButton.tsx
src/ui/notifications/SocialInboxBootstrap.tsx
src/constants/catalogClubs.ts
src/constants/appFeatures.ts
src/storage/socialInbox.ts
src/storage/userRegistry.ts
src/engines/socialFanOut.ts
src/engines/profilePrivacy.ts
src/engines/socialCoachingInsight.ts   → insight sur détail activité
src/data/demoDirectory.ts
src/store/AppContext.tsx
src/types/domain.ts                 → Club, ClubPost, privacy…
```

---

## 14. Conclusion

La **Communauté (bêta)** d’Azimut est un **écosystème social complet en surface** (hub, fil, clubs, cartes, recherche, abonnements, likes, notifications, privacy) avec une UX française claire et un design jade distinctif.

En profondeur, elle fonctionne aujourd’hui comme une **bêta locale / démo enrichie** : idéale pour tester les parcours d’abonnement, de club et de carte GPS, en attendant un backend communautaire cloud. Le document ci-dessus décrit **100 %** de ce qui est présent dans le code pour cette zone — emplacements, libellés, boutons, états, limites comprises.

---

*Azimut · Document Communauté (bêta) · généré depuis le code source*

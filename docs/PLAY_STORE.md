# Mova sur Google Play — guide complet

Ce document explique, étape par étape, tout ce qu'il reste à faire pour publier Mova sur Google Play : ce qui est déjà
prêt dans le code, ce que tu dois faire dans Play Console, les coûts, et les règles strictes à respecter.

Je ne peux pas créer ton compte Google, payer les frais d'inscription, vérifier ton identité, ni lancer les commandes
`eas login` / `eas build` / `eas submit` à ta place (elles demandent tes propres identifiants Expo, Google et Apple).
Tout ce que le code peut préparer est prêt ; le reste est listé précisément ci-dessous.

---

## 0. Ce qui est déjà prêt dans le dépôt

| Élément | Où | Détail |
|---|---|---|
| Nom du paquet Android | `app.json` → `android.package` | `app.mova.coach` |
| Icône adaptative, permissions, intent filters | `app.json` → `android` | Localisation (premier plan + arrière-plan), notifications, service de premier plan, partage de fichiers GPX/TCX |
| Profils de build | `eas.json` | `development`, `preview` (APK), `production` (App Bundle `.aab`, requis par Play) |
| Paiement natif (Play Billing) | `src/services/billing.ts` | Passe par **RevenueCat** dès que l'app tourne sur Android/iOS natif (jamais Stripe sur mobile natif — obligatoire, voir §6) |
| Dépendances RevenueCat | `package.json` | `react-native-purchases`, `react-native-purchases-ui` (déjà installées) |
| Suppression de compte | `app/settings/account.tsx` + `DELETE /account` (backend) | Déjà fonctionnelle, en application **et** sur la version web (même code) → couvre l'exigence Play de suppression de compte |
| Politique de confidentialité, page statique | `public/privacy.html` (généré par `scripts/generate-privacy-html.mjs`, contenu de `src/legal/legalDocs.ts`) | Lisible sans JavaScript ni compte — c'est l'URL à donner à Play Console |
| Conditions d'utilisation | `public/terms.html` | Idem |
| Écran « Installer » avec 3 chemins | `app/install.tsx`, `public/telecharger.html` | Google Play (si `EXPO_PUBLIC_PLAY_STORE_URL` est défini, sinon « Bientôt disponible »), installation PWA sans store, guide iPhone/iPad |
| Visuels pour la fiche Play | `store-assets/android/` (généré par `node scripts/generate-play-assets.mjs`) | `icon-512.png`, `feature-graphic-1024x500.png`, 8 captures dans `screenshots/` |

Pour régénérer les visuels après un changement d'icône ou de captures :
```bash
node scripts/generate-play-assets.mjs
```

---

## 1. Prérequis légaux et fiscaux (France) — à régler AVANT d'encaisser un centime

Le fichier `src/legal/publisher.ts` déclare aujourd'hui Mova comme :

> « Personne physique, éditant le service à titre non professionnel »

avec une note explicite dans le code : **« à remplacer par nom + adresse dès qu'une activité payante démarre »**. C'est
exactement la situation où tu es maintenant, avec Stripe (web) et bientôt Play Billing (Android). Points à vérifier
avec un professionnel (comptable, avocat, ou le CFE) avant la mise en production réelle :

- **Statut légal pour encaisser de l'argent régulièrement en France** : une activité commerciale récurrente (abonnement
  payant) nécessite en général une immatriculation — le plus simple pour une personne seule est souvent le régime
  **micro-entrepreneur (auto-entreprise)**, avec un numéro SIREN/SIRET.
- **Mentions légales** : une fois immatriculé, `src/legal/publisher.ts` doit être mis à jour avec le nom, le statut réel
  et une adresse (ou le numéro SIREN, selon ce que la loi impose à ton statut) — ce fichier alimente à la fois les CGU,
  la politique de confidentialité et les mentions légales de l'app et du site.
- **TVA** : Google (comme Stripe) peut gérer la TVA pour toi selon le pays de l'acheteur — à vérifier dans Play Console
  (Paiements → Paramètres fiscaux) une fois le compte créé.
- **Déclaration de revenus** : les versements de Google Play et de Stripe sont des revenus professionnels à déclarer.

Je ne peux pas remplir ces démarches à ta place ; c'est la seule partie de ce guide qui n'est pas « juste de la
configuration technique ».

---

## 2. Créer le compte Google Play Console

1. Va sur https://play.google.com/console/signup avec un compte Google dédié (recommandé : pas ton compte personnel
   principal, pour séparer les accès).
2. Accepte le contrat de distribution pour les développeurs.
3. **Frais d'inscription** : 25 $ US, à régler une seule fois par carte bancaire (montant à reconfirmer au moment du
   paiement, Google peut l'ajuster).
4. Choisis le **type de compte** :
   - **Particulier (Personal)** : plus rapide à créer, mais soumis à l'exigence de test décrite au §3.
   - **Organisation (Organization)** : nécessite un numéro **D‑U‑N‑S** (gratuit, délai de quelques jours à quelques
     semaines chez Dun & Bradstreet) — recommandé si tu es en micro-entreprise avec un SIRET, car Play Console associe
     alors le compte développeur à ta structure officielle.
5. **Vérification d'identité** : pièce d'identité + parfois un appel vidéo. Compte à quelques jours de délai.

---

## 3. Tests obligatoires avant la mise en production (comptes créés après le 13 nov. 2023)

Règle Google, vérifiée sur leur aide en ligne au moment de la rédaction : tout **nouveau compte développeur
personnel** doit faire tourner un **test fermé** avec **au moins 12 testeurs inscrits sans interruption pendant au
moins 14 jours** avant que l'onglet « Production » ne se débloque dans Play Console.

Pratique :
1. Crée d'abord un test **interne** (facultatif mais conseillé) pour toi-même et 1-2 proches, avec un premier
   `.aab` buildé en profil `preview` ou `production` (§5).
2. Ouvre ensuite un test **fermé** (Play Console → Tester et publier → Tests → Fermé), crée une liste d'au moins 12
   adresses e-mail (amis, famille, bêta-testeurs) et partage le lien d'inscription.
3. Attends 14 jours calendaires consécutifs avec ces testeurs inscrits et actifs.
4. Play Console débloque alors le bouton « Demander l'accès à la production ».

Compte comme organisation créé après cette date : même exigence en pratique dans la plupart des cas — vérifie le
bandeau affiché dans ta Play Console à la création du compte, il indique précisément ce qui est demandé.

---

## 4. Contenu de l'application (« App content ») dans Play Console

Toutes ces déclarations sont obligatoires avant de pouvoir publier, même en test fermé pour certaines :

| Déclaration | Où trouver l'info | Réponse recommandée |
|---|---|---|
| **URL de la politique de confidentialité** | — | `https://<ton-domaine-actuel>/privacy.html` (aujourd'hui `https://hingantmael-gif.github.io/privacy.html`, à remplacer par ton domaine définitif une fois en place) |
| **Publicités** | Mova n'affiche aucune publicité | Déclarer « Non, cette appli ne contient pas de publicités » |
| **Classification du contenu (IARC)** | Questionnaire à remplir dans Play Console | Application de coaching sportif, pas de violence/contenu adulte → classification attendue proche de « Tout public » ou équivalent local. Réponds au questionnaire officiel, je ne peux pas le remplir à ta place. |
| **Audience cible et contenu** | — | Ne coche PAS les tranches d'âge « enfants » : Mova n'est pas conçue pour les moins de 13 ans (CGU : majeur, ou 16 ans avec accord parental — voir `src/legal/azimutTerms.ts` section 3). Choisis un public 16/18 ans et plus. |
| **App gouvernementale ?** | Non | — |
| **Fonctionnalités financières** | Oui — abonnement Premium | Décris : abonnement récurrent via Play Billing, prix affichés dans l'app |
| **Sécurité des données (« Data safety »)** | Voir tableau §4.1 | À remplir manuellement dans le formulaire Play Console (pas d'import automatique) |
| **Suppression du compte** | Champ « Lien vers la suppression du compte » | Renvoie vers la page de connexion de la version web de Mova (même URL que l'app) → Réglages → Compte et sécurité → Supprimer le compte, déjà fonctionnel sans rien installer |

### 4.1 Carte des données pour le formulaire « Sécurité des données »

D'après `src/legal/legalDocs.ts` (section « Les données que nous traitons ») et les permissions déclarées dans
`app.json` :

| Catégorie Play | Donnée Mova | Collectée | Partagée avec un tiers | Objet déclaré | Optionnelle |
|---|---|---|---|---|---|
| Position | Position précise (GPS) | Oui | Non | Fonctionnalité de l'app (suivi de séance) | Oui — uniquement pendant une séance lancée par l'utilisateur |
| Informations personnelles | E-mail, nom, photo | Oui | Non | Gestion du compte | Non (nécessaire à la création de compte) |
| Santé et fitness | Sommeil, fréquence cardiaque, poids, séances | Oui | Non (sauf export volontaire vers Garmin/Strava, initié par l'utilisateur) | Fonctionnalité de l'app (adaptation de l'entraînement) | Oui |
| Activité dans l'application | Séances, statistiques, progression | Oui | Non | Fonctionnalité de l'app | Non |
| Infos sur l'appareil ou autres IDs | Jeton de session, journaux techniques | Oui | Non | Sécurité, prévention de la fraude | Non |
| Informations financières | — | **Non** | — | Les paiements passent par Google Play Billing / Stripe : Mova ne voit jamais les numéros de carte | — |

Précise aussi dans le formulaire : **chiffrement en transit (HTTPS)** = oui ; **suppression de compte possible** = oui ;
possibilité de demander la suppression de données spécifiques = oui (export/suppression décrits dans la politique de
confidentialité, section « Tes droits »).

---

## 5. Construire et envoyer l'application (EAS)

Ces commandes s'exécutent depuis ta machine, connecté à **ton** compte Expo :

```bash
npx eas-cli login
# Première fois seulement : crée/lie le projet Expo (ajoute automatiquement extra.eas.projectId dans app.json)
npx eas-cli init
```

### 5.1 Build de test (APK, installation directe)
```bash
npx eas-cli build --platform android --profile preview
```
Télécharge l'`.apk` généré et installe-le sur un téléphone Android pour vérifier avant d'aller plus loin.

### 5.2 Build de production (App Bundle, format exigé par Play)
```bash
npx eas-cli build --platform android --profile production
```
Produit un fichier `.aab`. EAS gère la **signature de l'app** (Play App Signing) — laisse-le créer et conserver la clé
de chargement (upload key) automatiquement, sauf si tu as une raison précise de gérer ta propre clé.

### 5.3 Envoi vers Play Console
Deux façons :
- **Manuelle (recommandée au début)** : Play Console → Production/Tests → Créer une version → dépose le `.aab`
  téléchargé.
- **Automatique** : `npx eas-cli submit --platform android` — demande un compte de service Google Cloud avec le rôle
  approprié sur Play Console (Play Console → Utilisateurs et autorisations → Créer un compte de service) ; le fichier
  JSON de la clé se configure alors dans `eas.json` (`submit.production.android.serviceAccountKeyPath`).

### 5.4 Versions suivantes
- Incrémente `android.versionCode` dans `app.json` (ou laisse `eas.json` avec `"autoIncrement": true`, déjà activé
  pour le profil `production`).
- Garde `expo`/`react-native`/EAS à jour au fil des SDK Expo : Google impose chaque année un **niveau d'API cible
  (target API level)** minimum ; utiliser une version d'EAS Build récente suffit à rester conforme automatiquement.

---

## 6. Paiement : qui s'en occupe, et combien ça coûte

### 6.1 Sur Android natif → Google Play Billing (obligatoire)

Règle Google (vérifiée dans le Règlement sur les paiements, en vigueur) : **toute fonctionnalité payante à l'intérieur
d'une app Android — dont les abonnements — doit passer par le système de facturation de Google Play**. Rediriger vers
un autre moyen de paiement (Stripe, lien externe…) depuis l'app native est interdit et fait rejeter l'application.

C'est déjà comment le code est câblé : `src/services/billing.ts` n'utilise **jamais** Stripe sur natif — uniquement
sur le web (`Platform.OS === 'web'`). Sur Android/iOS natif, l'achat passe par **RevenueCat**, qui pilote Play
Billing. Il ne reste qu'à finir le branchement côté stores :

1. Crée un compte sur https://app.revenuecat.com (gratuit jusqu'à 2 500 $/mois de revenus suivis).
2. Ajoute une app « Google Play » dans RevenueCat, relie-la à ton compte de service Google Cloud (même genre de clé
   que pour `eas submit`).
3. Dans **Play Console → Monétiser → Produits → Abonnements**, crée deux abonnements avec leurs « plans de base » :
   un mensuel et un annuel (les prix `9,99 €` / `59,99 €` déjà affichés dans `src/premium/quotas.ts` sont une
   proposition, à ajuster librement dans Play Console).
4. Dans RevenueCat, crée les **Packages** « Monthly » / « Annual » pointant vers ces produits Play, et une
   **Offering** par défaut qui les regroupe — le code choisit déjà le bon package via son `packageType`
   (`p.packageType` contient `MONTHLY`/`ANNUAL`), aucune correspondance exacte d'identifiant n'est nécessaire.
5. Récupère la **clé API publique Android** de RevenueCat et mets-la en variable d'environnement au moment du build :
   ```bash
   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxx npx eas-cli build --platform android --profile production
   ```
   (ou configure-la comme variable d'environnement EAS persistante avec `eas env:create`, recommandé pour ne pas la
   retaper à chaque build).
6. Restaurer un achat, gérer l'abonnement (« Gérer dans Google Play ») et le webhook RevenueCat → backend
   (`REVENUECAT_WEBHOOK_SECRET`, déjà géré par `backend/src/billing.js`) sont déjà implémentés côté app.

### 6.2 Combien Google prend (vérifié le jour de la rédaction, marché EEE/UE)

Pour les **abonnements à renouvellement automatique** achetés via Google Play Billing par des utilisateurs dans
l'Espace économique européen (donc en France) :

| Tranche | Frais |
|---|---|
| Abonnements, quel que soit le chiffre d'affaires annuel | **10 % de frais de service + 5 % de frais de facturation Play**, soit environ **15 %** au total |

Ce taux d'environ 15 % s'applique **dès le premier abonné**, sans palier à atteindre (contrairement aux achats non
récurrents, qui peuvent monter à 20-25 % au-delà du premier million de dollars annuel). Le détail exact, actualisé,
est toujours visible dans Play Console → Paramètres → Frais de service, à vérifier au moment de la mise en
production car Google fait évoluer ces grilles.

**Comparaison avec Stripe (web)** : Stripe prend environ 1,5 % + 0,25 € par transaction en Europe (hors abonnements
récurrents, où les frais restent similaires), donc nettement moins que Google Play. C'est légal et courant d'avoir un
prix différent ou une offre différente entre le web et le store — beaucoup d'apps le font — tant que rien, **dans**
l'app Android, ne pousse l'utilisateur vers le paiement web (voir §6.1).

### 6.3 Sur iOS natif (si tu publies un jour sur l'App Store)

Même principe et mêmes ordres de grandeur avec Apple (In-App Purchase obligatoire, ~15-30 % selon revenus et
ancienneté de l'abonné) — RevenueCat gère aussi cette plateforme, mais ce guide se concentre sur Google Play comme
demandé.

---

## 7. Règles strictes à respecter (rejets les plus fréquents)

- **Paiement** : jamais de lien vers un paiement externe pour du contenu numérique depuis l'app Android (§6.1).
- **Permissions minimales et justifiées** : `app.json` ne déclare que ce qui sert réellement (position premier plan
  et arrière-plan pour le suivi GPS pendant une séance, notifications, service de premier plan pour continuer le
  suivi écran verrouillé, lecture/partage de fichiers GPX/TCX). Ne rajoute pas de permission « au cas où » : Play
  Console demande une justification pour chaque permission sensible.
- **Localisation en arrière-plan (`ACCESS_BACKGROUND_LOCATION`)** : c'est la permission la plus contrôlée par Google.
  Il faut :
  - un **écran de disclosure bien visible** juste avant la demande système, qui explique pourquoi (déjà présent dans
    le parcours de démarrage d'une séance — vérifie que le message reste explicite : « Mova continue de suivre ta
    séance quand l'écran est verrouillé ») ;
  - une **courte vidéo de démonstration** à joindre dans Play Console (Play Console → App content → Permissions
    sensibles) montrant le cas d'usage (suivi GPS pendant une sortie, écran verrouillé) — à préparer et téléverser
    toi-même, un enregistrement d'écran de 30 secondes suffit généralement ;
  - Google peut demander un **formulaire de justification** supplémentaire (« Utilisation de la localisation en
    arrière-plan ») — réponds en citant l'usage réel : app de fitness qui enregistre un parcours GPS.
- **Comptes de test** : prépare un compte de démonstration (e-mail + mot de passe) que tu communiques dans Play
  Console (App content → App access) pour que les revenus Google puissent se connecter et tester le parcours complet,
  y compris l'abonnement Premium.
- **Contenu santé** : Mova n'est pas un dispositif médical (déjà écrit noir sur blanc dans les CGU, section 9) — ne
  jamais formuler de promesse médicale dans la fiche Store (pas de « soigne », « diagnostique », etc.).
- **Cohérence des captures d'écran** : les visuels dans `store-assets/android/screenshots/` sont de vraies captures
  de l'app, sans montage trompeur — c'est une exigence Google (« Metadata policy »).
- **Ratio des captures** : Google demande en général des images entre 320 et 3840 px de côté ; certains téléphones
  très allongés peuvent être refusés si le ratio est extrême. Si Play Console rejette une image du dossier
  `screenshots/`, recadre légèrement le haut/bas (barre d'état) et retéléverse — vérifie le message d'erreur exact
  affiché à l'import, les règles précises évoluent.
- **Compte propriétaire (owner)** : `EXPO_PUBLIC_OWNER_EMAIL` (Premium offert au compte propriétaire) doit être
  défini dans les variables d'environnement du build EAS, sinon ce compte perd son statut Premium sur la version
  Android — pense à le passer comme pour `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (§6.1).

---

## 8. Mise en production progressive

1. **Test interne** → toi + proches, retours rapides.
2. **Test fermé** (12 testeurs / 14 jours, §3) → accès production débloqué.
3. Complète entièrement la fiche (« App content » §4, fiche Store §9) — Play Console affiche une checklist tant que
   quelque chose manque.
4. **Déploiement progressif** (« Staged rollout ») : commence à 10-20 % des nouveaux utilisateurs en production, monte
   par paliers sur quelques jours en surveillant le **rapport de pré-lancement** (tests automatiques Google : crashs,
   accessibilité, sécurité) et les premiers avis.
5. Une fois stable, passe à 100 %.

---

## 9. Fiche Google Play — textes prêts à copier-coller

**Nom de l'application** (30 caractères max) : `Mova – Coach sportif`

**Description courte** (80 caractères max) :
`Coach personnel : plan sur mesure, tracker GPS, séance adaptée à ton sommeil`

**Description complète** (4 000 caractères max, à copier tel quel ou adapter) :

```
Mova est ton coach sportif personnel. Il prépare ton programme sur plusieurs mois jusqu'à ta course, puis ajuste
chaque séance à ta vraie forme du jour : sommeil, récupération, charge d'entraînement.

COACH PERSONNEL PAR ALGORITHME
• Programme de 3 à 36 semaines selon ton objectif : 5 km, 10 km, semi-marathon, marathon, trail, triathlon, Ironman
• Mauvaise nuit ? La séance est raccourcie et l'allure ralentie automatiquement, ou remplacée par du repos
• Bien reposé ? L'intensité est relevée pour que tu progresses sans attendre
• Un « jumeau numérique » apprend ta récupération séance après séance

TOUS TES SPORTS, UNE SEULE APP
Course à pied, vélo, natation, triathlon, musculation, callisthénie — un seul calendrier, une seule charge
d'entraînement suivie.

TRACKER GPS EN TEMPS RÉEL
Une jauge d'allure en direct te montre si tu es dans la bonne zone. Chrono, distance, allure moyenne, pause
automatique, coach vocal.

SÉANCE RAPIDE
Pas le temps de suivre le plan ? Choisis le sport, le type de séance, la durée et l'intensité : ta séance est prête
en quelques secondes, calée sur tes vraies allures.

RÉCUPÉRATION ET SUIVI DE FORME
Sommeil, variabilité cardiaque, charge d'entraînement, récupération musculaire : Mova te dit quand pousser et quand
lever le pied.

COMMUNAUTÉ
Partage tes séances et tes programmes, suis d'autres athlètes, rejoins des clubs.

Gratuit pour t'entraîner. Premium (abonnement optionnel) débloque la personnalisation complète de l'application et
supprime les limites d'usage.

Mova n'est pas un dispositif médical : en cas de doute sur ta santé, consulte un professionnel.
```

**Catégorie** : Santé et remise en forme (Health & Fitness)

**Coordonnées** (obligatoires sur la fiche) : e-mail de contact accessible au public — utilise une adresse dédiée
(pas forcément celle du formulaire interne à l'app), par exemple une adresse que tu surveilles régulièrement.

**Visuels** : `store-assets/android/icon-512.png`, `store-assets/android/feature-graphic-1024x500.png`,
`store-assets/android/screenshots/*.png` (regénérés par `node scripts/generate-play-assets.mjs`).

---

## 10. Checklist finale

- [ ] Statut légal / fiscal réglé (§1) et `src/legal/publisher.ts` mis à jour avec la vraie identité
- [ ] Compte Play Console créé, 25 $ payés, identité vérifiée (§2)
- [ ] `npx eas-cli login` puis `npx eas-cli init` exécutés (ajoute `extra.eas.projectId`)
- [ ] Produits d'abonnement créés dans Play Console + reliés dans RevenueCat (§6.1)
- [ ] `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` et `EXPO_PUBLIC_OWNER_EMAIL` définis pour le build de production
- [ ] Build `.aab` de production généré et testé en interne
- [ ] Politique de confidentialité déployée et son URL collée dans Play Console
- [ ] Formulaire « Sécurité des données » rempli (§4.1)
- [ ] Classification du contenu, audience cible, déclarations publicité/finances répondues (§4)
- [ ] Fiche Store remplie avec les textes du §9 et les visuels de `store-assets/android/`
- [ ] Compte de test communiqué dans « App access »
- [ ] Test fermé lancé avec ≥ 12 testeurs pendant ≥ 14 jours (comptes personnels, §3)
- [ ] Vidéo de justification de la localisation en arrière-plan téléversée
- [ ] Une fois l'app en ligne : mets `EXPO_PUBLIC_PLAY_STORE_URL` dans `.env` avec le lien de la fiche, puis
      redéploie le site (`node scripts/deploy-install-site.mjs`) — le bouton « Obtenir sur Google Play » apparaît
      automatiquement sur `/install` et `/telecharger.html`.

# Envoyer les séances sur une montre Garmin (API officielle)

## Principe : chaque utilisateur lie SA Garmin

- **Toi (éditeur de Mova)** : tu obtiens UNE fois des clés d'application chez Garmin (Client ID + Client Secret). Elles identifient Mova, pas un utilisateur.
- **Chaque utilisateur** : il touche « Lier Garmin Connect », se connecte avec **son** compte Garmin et autorise Mova. Mova reçoit alors un jeton **à lui**, stocké sur le serveur sous son propre compte Mova (jamais partagé, jamais dans l'app).
- **Ensuite** : chaque séance de cet utilisateur part sur **son** calendrier Garmin Connect (les 7 prochains jours, automatiquement). Sa montre la récupère à la synchro Bluetooth de l'app Garmin Connect. Le Bluetooth de la montre, c'est Garmin qui s'en occupe.

Sans les clés (étape 1-3), la liaison ne peut pas fonctionner pour personne.

## Ce qui est déjà fait dans le code

| Exigence Garmin | Fait |
|---|---|
| OAuth 2.0 PKCE, échange du code côté serveur (secret jamais dans l'app) | oui |
| Jeton par utilisateur, rafraîchi 10 min avant expiration, nouveau refresh token conservé | oui |
| Vérifier que l'utilisateur a bien laissé cochée l'autorisation « Import de séances » (`WORKOUT_IMPORT`) | oui, sinon la liaison est refusée avec un message clair |
| « Se déconnecter » de Mova doit aussi supprimer l'enregistrement chez Garmin (`DELETE /user/registration`, obligatoire) | oui |
| Envoi automatique des 7 prochains jours après la liaison | oui |
| Webhooks Garmin (retrait de consentement fait depuis Garmin Connect, notification de permissions) | **non** : à brancher avec Garmin au moment de la validation |
| Adresses exactes de la Training API et format de séance | **à confirmer** dans la spec que Garmin donne après approbation (voir étape 4) |

## Étapes pour toi (une seule fois)

### 1. Demander l'accès
1. Va sur le portail développeurs Garmin (https://developerportal.garmin.com/developer-programs/connect-developer-api) et crée un compte.
2. « Request API keys » → crée une application de type **Connect Developer – Evaluation**.
3. Renseigne : les **redirect URI** (étape 2), les **informations légales** de l'entreprise, et une description de ce que Mova fait avec les données Garmin. Coche **Training API** (envoi de séances).
4. Garmin valide à la main. Tant que l'accès n'est pas accordé, l'envoi automatique est impossible. La documentation publique ne précise pas si un particulier peut candidater ni les délais : contacte connect-support@developer.garmin.com si le formulaire l'exige.
5. Une fois accepté : tu reçois le **Client ID** et le **Client Secret** (jamais dans l'app ni sur GitHub).

### 2. Adresses de retour (redirect URI) à déclarer
| Où | Adresse |
|---|---|
| Site / PWA en ligne | `https://TON-DOMAINE/oauth/garmin` |
| Test sur ton ordinateur | `http://localhost:8082/oauth/garmin` |
| App mobile native | `mova://oauth/garmin` |

Si Garmin refuse `mova://…` (schéma non-https), garde l'adresse https : la version web installée sur le téléphone marche pareil. (Non vérifié.)

### 3. Mettre les clés
- **Serveur (Render › Environment)** : `GARMIN_CLIENT_ID`, `GARMIN_CLIENT_SECRET`. Le serveur Mova doit être **en ligne**.
- **App** : dans `.env`, `EXPO_PUBLIC_GARMIN_CLIENT_ID=<même Client ID>`. Jamais le secret ici.
- Republier : `node scripts/deploy-install-site.mjs`.

### 4. Vérifier la Training API (important)
Les adresses `.../training-api/workout` et `.../training-api/schedule` et le format de séance envoyé viennent du code existant et **n'ont pas pu être vérifiés** (la spec n'est donnée qu'aux développeurs approuvés ; une source mentionne une « Training API V2 »). Quand tu reçois la spec :
1. Compare avec `src/engines/garminWorkout.ts` (format) et `backend/src/index.js` (adresses).
2. Si les adresses diffèrent, change-les **sans toucher au code** via les variables `GARMIN_TRAINING_WORKOUT_URL` et `GARMIN_TRAINING_SCHEDULE_URL` sur Render.

### 5. Tester
1. Connecte-toi avec un compte Mova (le mode local ne peut pas lier Garmin).
2. Réglages › Appareils › Mode d'emploi Garmin › « Lier Garmin Connect » › te connecter chez Garmin, laisser « Import de séances » coché, Autoriser.
3. Ouvre une séance › « Envoyer à Garmin » : message vert. Les séances des 7 prochains jours partent ensuite seules.
4. App Garmin Connect du téléphone › synchroniser la montre.
5. Réglages › Appareils › Garmin › déconnecter : vérifie que l'app Garmin Connect ne liste plus Mova (Paramètres › Compte › Applications connectées).

## Pour l'utilisateur (le mode d'emploi est aussi dans l'app)
1. **Lier (une fois)** : « Lier Garmin Connect » › te connecter chez Garmin › laisser « Import de séances » coché › Autoriser.
2. **C'est tout** : les séances partent seules. Pour la première, touche « Envoyer à Garmin ».
3. **Récupérer** : app Garmin Connect ouverte, montre proche, Bluetooth activé › synchroniser › Entraînement › Séances.

Sans liaison : sur téléphone « Copier la séance » puis la recréer dans Garmin Connect (Garmin n'importe pas de fichier de séance) ; sur ordinateur, fichier `.fit` dans `GARMIN › NewFiles` par câble USB.

### Problèmes fréquents
- **Fenêtre Garmin bloquée** : autoriser les pop-ups pour Mova.
- **« Import de séances » refusé** : relancer la liaison et laisser la case cochée.
- **« Connecte-toi avec ton compte Mova »** : la liaison nécessite un compte, pas le mode local.
- **La montre n'apparaît pas dans Garmin Connect** : l'appairer d'abord dans l'app Garmin Connect.

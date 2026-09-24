# Envoyer les séances sur une montre Garmin

## Comment ça marche

Mova ne parle **pas** à la montre en Bluetooth (Garmin ne l'autorise pas aux applications tierces).
Le trajet est :

1. Mova envoie la séance à ton compte **Garmin Connect** (API officielle « Training API »).
2. L'app **Garmin Connect** du téléphone la transfère à la montre en Bluetooth, à la synchro.

La liaison Garmin se fait avec une fenêtre de connexion Garmin : identique sur **téléphone, tablette et ordinateur** (pop-up sur le web).
Sans liaison, l'app propose un fichier `.fit` à copier sur la montre par câble USB.

## Pour toi (propriétaire) : activer la liaison, une seule fois

### 1. Demander l'accès à Garmin
1. Va sur https://developer.garmin.com/gc-developer-program/training-api/ et demande l'accès au **Garmin Connect Developer Program** (Training API).
2. Garmin valide ta demande (approbation manuelle, délai variable). Sans cette approbation, l'envoi automatique ne peut pas fonctionner.
3. Une fois accepté, tu reçois un **Client ID** et un **Client Secret**.

### 2. Déclarer les adresses de retour (redirect URI) dans le portail Garmin
Ajoute **toutes** celles-ci :

| Où | Adresse |
|---|---|
| Site / PWA en ligne | `https://TON-DOMAINE/oauth/garmin` |
| Test sur ton ordinateur | `http://localhost:8082/oauth/garmin` |
| App mobile native | `mova://oauth/garmin` |

Si Garmin refuse l'adresse `mova://…` (schéma non-https), garde seulement l'adresse https : la version web installée sur téléphone fonctionne alors pareil. (Non vérifié : à confirmer dans ton portail.)

### 3. Mettre les clés
- **Serveur (Render → Environment)** : `GARMIN_CLIENT_ID` et `GARMIN_CLIENT_SECRET`. Le serveur doit être **en ligne** (l'API Mova, `/integrations/garmin/exchange` et `/integrations/garmin/workout`).
- **App** : dans `.env`, `EXPO_PUBLIC_GARMIN_CLIENT_ID=<le même Client ID>` (jamais le secret ici).

### 4. Publier
```bash
node scripts/deploy-install-site.mjs
```

### 5. Tester
1. Connecte-toi avec un **compte Mova** (le mode local ne peut pas lier Garmin).
2. Réglages › Appareils › **Mode d'emploi Garmin** › « Lier Garmin Connect ».
3. Connecte-toi chez Garmin, Autoriser : l'écran affiche « Connecté ».
4. Ouvre une séance › « Envoyer à Garmin » : message vert.
5. Dans l'app Garmin Connect du téléphone, synchronise la montre.

## Pour l'utilisateur (le mode d'emploi est aussi dans l'app)

Réglages › Appareils › Mode d'emploi Garmin :

1. **Lier (une fois)** : « Lier Garmin Connect » › te connecter chez Garmin › Autoriser.
2. **Envoyer** : ouvrir une séance › « Envoyer à Garmin ».
3. **Récupérer** : app Garmin Connect ouverte, montre proche, Bluetooth activé › synchroniser › Entraînement › Séances.

### Problèmes fréquents
- **La fenêtre Garmin ne s'ouvre pas** : autoriser les pop-ups pour Mova dans le navigateur.
- **« Connecte-toi avec ton compte Mova »** : la liaison nécessite un compte, pas le mode local.
- **La montre n'apparaît pas dans Garmin Connect** : l'appairer d'abord dans l'app Garmin Connect.
- **« L'envoi automatique n'est pas encore activé »** : les clés Garmin ne sont pas encore configurées (étape 3) → utiliser le fichier USB.

## Autres montres
- **Apple Watch** : possible via WorkoutKit (iOS 17+), mais nécessite une vraie app iPhone avec module natif : pas disponible dans la version web. Non implémenté.
- **Autres marques** : fichier de séance à importer depuis l'app de la marque (voir l'écran Montre).

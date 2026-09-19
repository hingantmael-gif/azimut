# Azimut

Application de coaching multi-sport — **indépendante de BTP Pro**.

## Liens

| | URL |
|---|---|
| **Installer** (PC / téléphone) | https://hingantmael-gif.github.io/azimut/telecharger.html |
| **Application** | https://hingantmael-gif.github.io/azimut/ |

Sur **Chrome / Edge** : ouvrir **Installer** → **Installer l’application** → icône logo Azimut (menu Démarrer / écran d’accueil).  
Sur **iPhone** : Safari → Partager → Sur l’écran d’accueil.

## Développement local

```powershell
npm install
npm install --prefix backend   # dépendances de l’API
copy .env.example .env   # puis renseigner les variables nécessaires
npm run web              # app web sur http://localhost:8082
npm run api:dev          # API d’authentification sur http://localhost:8787 (autre terminal)
```

Autres commandes : `npm start` (Expo), `npm run android`, `npm run ios`.  
Les variables d’environnement sont documentées dans `.env.example` (ne jamais committer de secrets).

## Publier

```powershell
cd C:\Users\Utilisateur\Documents\azimut
npm run deploy:install-site
```

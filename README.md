# Azimut — coaching multi-sport (indépendant de BTP Pro)

Application Expo (web + mobile) **Azimut**.  
Dépôt et dossier **100 % séparés** de BTP Pro App.

## Lien public (après déploiement)

Voir le workflow GitHub Pages, ou Render — le lien à partager apparaît dans les Actions / le dashboard.

## Dev local

```powershell
cd C:\Users\Utilisateur\Documents\azimut
npm install
npm run web
```

Ouvre **http://localhost:8082** — page d’accueil / installation.

## Build web (PWA)

```powershell
npm run build:web
```

Sortie dans `dist/`.

## Page d’installation

Route : `/install`  
Marque Azimut + logo + bouton **Installer l’application** (PWA).

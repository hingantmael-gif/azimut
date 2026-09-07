# Azimut

Application Android **native** de coaching multi-sport — **100 % indépendante** (pas un site web).

## Ce que tu partages aux amis

| | URL |
|---|---|
| **Page Installer** (seule page web) | https://hingantmael-gif.github.io/azimut/ |
| **APK natif** (l’application) | https://github.com/hingantmael-gif/azimut/releases/latest/download/azimut.apk |
| Code source | https://github.com/hingantmael-gif/azimut |

### Architecture

1. **L’application** = fichier Android `azimut.apk` (comme une app Play Store : icône logo, écran d’accueil, pas de navigateur).
2. **La page web** = uniquement un bouton **Installer l’application** qui télécharge cet APK. Aucune version web de l’app n’est publiée.

Sur Android : ouvrir le lien → **Installer l’application** → ouvrir `azimut.apk` → Installer.

## Dossier local

```
C:\Users\Utilisateur\Documents\azimut
```

- Code de l’app native : projet Expo (build APK via GitHub Actions)
- Page web isolée : dossier `install-site/`

## Dev app (téléphone / émulateur)

```powershell
cd C:\Users\Utilisateur\Documents\azimut
npm install
npm start
```

## Publier la page Installer

```powershell
npm run deploy:install-site
```

## Build APK

Automatique sur push `main` (workflow **Build Android APK**), ou manuellement dans l’onglet Actions GitHub.  
L’APK est publié sur la release `android-latest`.

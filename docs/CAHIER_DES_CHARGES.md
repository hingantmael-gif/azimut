# Cahier des Charges & Spécifications Fonctionnelles Complètes

> Application conçue pour téléphone uniquement.
> Nom de marque : à définir ultérieurement.

## 1. Moteur d'Ingestion & Synchronisation APIs (Garmin & Strava)

### A. Récupération des données de santé & sommeil (Garmin Health API / HealthKit / Health Connect)

Description : Récupération automatique des métriques physiologiques nocturnes et quotidiennes au réveil de l'utilisateur.

Fonctionnement technique :

- Envoi automatique par Webhook serveur-à-serveur dès la synchronisation de la montre avec Garmin Connect.
- Méthode alternative/fallback : Lecture via HealthKit (iOS) ou Health Connect (Android) si l'utilisateur n'a pas lié directement son compte Garmin.

Données collectées :

- Sommeil : Durée totale, répartition des phases (léger, profond, REM/paradoxal), score de sommeil (0 à 100).
- Variabilité de la Fréquence Cardiaque (HRV / VRC) : Écart RMSSD nocturne comparé à la ligne de base (baseline) sur 7 jours.
- Fréquence cardiaque au repos (RHR) : Mesure nocturne ou au réveil.
- Niveau de fatigue / Charge corporelle : Indice de batterie corporelle (Body Battery) ou de stress quotidien.

### B. Export des séances prévues vers Garmin (Garmin Connect Training API)

Description : Envoi des séances d'entraînement structurées directement dans le calendrier natif de la montre Garmin de l'utilisateur.

Fonctionnement technique :

- Génération d'un objet de séance structuré (JSON) conforme au format Garmin API, puis envoi via la route POST /workout.
- La séance apparaît instantanément sur la montre Garmin lors de la synchronisation (Wi-Fi ou Bluetooth via l'application Garmin Connect).

Composition d'une séance exportée :

- Étapes (Steps) : Échauffement (Warm-up), Intervalle (Active), Récupération (Rest), Retour au calme (Cool-down).
- Conditions de fin d'étape (Durée ou Distance) : Ex. 10 minutes, 400 mètres, ou appui manuel sur le bouton "Lap".
- Cibles de performance (Targets) : Plages d'allure (ex. 4'00" - 4'10"/km), plages de fréquence cardiaque (ex. 165 - 175 bpm), ou plages de puissance (Watts).
- Rendu sur la montre : La montre active son écran de guidage natif : bips sonores/vibrations en cas de sortie de zone (trop vite / trop lent), compte à rebours de l'intervalle et affichage visuel du bloc en cours.

### C. Importation des séances réalisées via Strava (Strava V3 API)

Description : Récupération automatique des données d'activités réelles dès que l'utilisateur termine sa séance.

Fonctionnement technique :

- Authentification utilisateur via OAuth 2.0 (strava:read_all, activity:read_all).
- Réception d'un événement en temps réel via Strava Webhook (object_type: activity, aspect_type: create).
- Requête GET /activities/{id} et GET /activities/{id}/streams pour récupérer les séries temporelles détaillées.

Données brutes extraites :

- Distance totale, durée écoulée, durée en déplacement.
- Chronologie seconde par seconde (Streams) : Allure, fréquence cardiaque, altitude/dénivelé, cadence de foulée, puissance (Watts).
- Découpage automatique par tours (Laps automatiques ou manuels).

## 2. Module d'Analyse Poussée (Prévu vs Réalisé & RPE)

### A. Algorithme de comparaison "Prévu vs Réalisé"

Description : Évaluation mathématique de la précision de la séance exécutée par rapport aux consignes de l'application.

Fonctionnement :

- Matching par bloc : L'application isole les blocs de travail (ex. les fractions de 400m) dans le flux de données Strava.
- Score de conformité (0 à 100%) : Calculé sur trois critères :
  - Respect du volume : Écart entre la distance/durée prévue et réalisée.
  - Respect de l'intensité : Pourcentage du temps passé dans la plage cible (allure ou FC).
  - Régularité : Écart-type d'allure entre les séries d'un même bloc d'intervalles.

### B. Formulaire de Feedback Rapide Post-Séance (RPE & Sensations)

Description : Notification push déclenchée automatiquement dès la réception et l'analyse de la séance Strava.

Questions posées (Interface à 3 clics) :

- Rating of Perceived Exertion (RPE / Échelle de Borg) : Curseur de 1 (Tranquille) à 10 (Effort maximal / Épuisement).
- Sensations musculaires & Articulaires : Sélection par icônes : « Aucune gêne », « Courbatures normales », « Douleur ciblée (tendon/articulation) ».
- Plaisir & Énergie mentale : Sélection : « Excellent », « Neutre », « Épuisé/Pénible ».

### C. Moteur d'Ajustement Dynamique & Réadaptation de Plan

Description : Re-planification automatique des séances futures basée sur l'analyse croisée du Prévu/Réalisé, du RPE, et de la donnée de sommeil Garmin.

Scénarios de décision algorithmique :

- Cas 1 : Forme optimale (Sommeil Garmin > 80, RPE < Prévu, Conformité > 95%) — Action : Augmentation progressive des cibles d'allure (+1% à +2%) sur la séance de qualité suivante.
- Cas 2 : Fatigue ou Dette de sommeil (Sommeil Garmin < 50 ou HRV en baisse, RPE élevé > 8/10) — Action : Réduction automatique du volume de la séance du lendemain (-20% à -30%) ou bascule en footing de récupération très doux.
- Cas 3 : Signal de douleur (Ressenti musculaire = "Douleur ciblée") — Action : Remplacement de la séance suivante par du repos complet ou une session de mobilité/renforcement, accompagnée d'un message de prévention.
- Cas 4 : Séance manquée ou incomplète (Conformité < 50%) — Action : Recalcul de la charge hebdomadaire sans déplacer brutalement la séance manquée au lendemain (évite le sur-entraînement).

## 3. Synthèse des Fonctionnalités des Grandes Applications du Marché

### A. Algorithme, Profilage & Planification

- Test de niveau initial & VMA : Évaluation automatique de la VMA (Vitesse Maximale Aérobie) et de la FC Max via un test de terrain guidé (ex. Demi-Cooper) ou l'analyse des meilleures performances passées.
- Prise en compte des objectifs : Choix d'un objectif de course (5 km, 10 km, Semi-Marathon, Marathon, Trail avec D+) ou d'un objectif de remise en forme/perte de poids.
- Modularité de l'emploi du temps : Définition des jours disponibles par semaine, des jours de sortie longue privilégiés, et mise à jour dynamique en cas de contrainte imprévue.
- Gestion de la charge d'entraînement (Modèle Banister / Fitness-Fatigue) : Visualisation graphique de la forme (Fitness), de la fatigue (Fatigue) et du niveau de performance théorique (Form/TSB).

### B. Préparation Physique & Séances Annexes

- Micro-séances de PPG & Renforcement : Séances de préparation physique générale (gainage, renforcement musculaire, mobilité) intégrées dans le calendrier avec vidéos démonstratives d'exécution des mouvements.
- Gestion du matériel : Suivi de l'usure des paires de chaussures de running (alerte kilométrique à l'approche des 600-800 km).

### C. Modèle Économique & Monétisation

Structure Freemium :

- Gratuit : Synchronisation Strava/Garmin, suivi basique des activités, calendrier limité à 7 jours.
- Abonnement Premium B2C (7 € - 15 € / mois) : Accès au plan personnalisé à long terme, export automatisé des séances vers Garmin, algorithme adaptatif dynamique (RPE + Sommeil), analyses statistiques poussées.
- Option B2B / Coach : Dashboard centralisé permettant à un entraîneur humain de superviser le plan généré par l'IA et de modifier à la main les valeurs des athlètes.

## 4. Gamification : Système de Classé (Ranked) & Progression en Expérience (XP)

### A. Moteur de calcul d'Expérience (XP Engine)

Description : Chaque action positive sur l'application attribue des points d'expérience (XP) calculés selon la précision et l'effort, et non uniquement sur la performance pure.

Attribution des points XP :

- Validation de séance (Base) : Points attribués selon la durée et le volume réalisé.
- Bonus de conformité (Précision) : Multiplicateur d'XP basé sur le score de respect des allures/zones cible (+20% à +50% d'XP si la séance est parfaitement exécutée).
- Bonus de régularité (Streak) : Multiplicateur progressif si l'utilisateur valide toutes ses séances de la semaine.
- Validation du Feedback : +50 XP bonus pour avoir rempli le questionnaire RPE après la séance.

### B. Système de Niveaux & Rangs Classés (Ranked System)

Description : Progression à travers des échelons (Ladders) matérialisés par des rangs visibles sur le profil de l'utilisateur.

Structure des Rangs :

- Bronze (Niveaux 1 à 10)
- Argent (Niveaux 11 à 20)
- Or (Niveaux 21 à 30)
- Platine (Niveaux 31 à 40)
- Diamant (Niveaux 41 à 50)
- Élite / Master (Top % des utilisateurs les plus réguliers)

Mécanique de Saison : Remise à zéro partielle du rang classé tous les 3 ou 6 mois pour relancer l'intérêt et proposer des "Saisons d'entraînement" à thème.

### C. Personnalisation & Amélioration du Profil

Éléments débloquables :

- Badges d'exploits (Achievements) : « Premier 10 km », « Régularité de fer (4 semaines sans rater une séance) », « Oiseau de nuit (séance faite avant 7h) ».
- Bordures de photo de profil & Titres : Cadres évolutifs dorés/diamant autour de l'avatar et titres attribués (« Marathonien en herbe », « Métronome des allures »).
- Thèmes graphiques & Cartes de statistiques : Déblocage de visuels personnalisés pour exporter et partager ses séances sur Instagram / Strava.

## 5. Système de Notifications & Rappels Intelligents

### A. Notifications programmées et comportementales

Types de rappels :

- Rappel d'avant-séance (H-2 / H-1) : Envoi d'un message rappelant le contenu de la séance prévue.
- Relance de fin de journée (J-0 à 19h) : Si aucune séance Strava n'a été reçue pour la journée alors qu'une séance était planifiée.
- Alerte Réveil & Sommeil (J-0 à 08h) : Notification synthétisant l'analyse du sommeil Garmin et confirmant si la séance du jour est maintenue ou réadaptée.
- Relance d'inactivité (J+3) : Alerte bienveillante en cas de rupture de rythme.
- Gestion des contraintes (Smart Scheduling) : Plages horaires préférentielles et heures de silence (Mode "Ne pas déranger").

## 6. Moteur d'IA & Génération Auto-Adaptive des Programmes (Running & Endurance)

Description : Génération algorithmique complète de programmes personnalisés du 5 km au marathon et au trail.

Fonctionnement & Paramétrage :

- Périodisation intelligente : Développement général, Travail spécifique, Affûtage/Tapering, Récupération post-course.
- Calcul automatique des allures : Footing, Seuil, VMA, Allure Spécifique.
- Flexibilité du calendrier : Déplacer des séances tout en conservant la cohérence de la charge globale de la semaine.

## 7. Hub Multi-Sport (Triathlon / Ironman) & Gestion de la Récupération

### A. Programmation Multi-Sport (Natation & Vélo / Cyclisme)

- Natation : Séances structurées par lignes de nages, export SWOLF / temps au 100m.
- Vélo / Cyclisme : Zones de Puissance (Watts / FTP) ou FC ; export Garmin Edge, Wahoo, Zwift, Rouvy, .zwo.
- Séances Combinées (Brick Work) : Vélo suivi d'un footing à allure course.

### B. Module Santé : Repos Intelligents, Étirements & Mobilité

- Séances de Récupération Active : Étirements, mobilité, foam rolling.
- Vidéos & Chronomètre Intégré : Routines 5 à 15 minutes.
- Jours de Repos Assimilatif : Verrouillage "Repos Strict" si métriques Garmin critiques.

## 8. Module Social, Confidentialité & Bilan de Progression

### A. Recherche d'utilisateurs & Moteur d'Abonnement

- Recherche avancée : pseudo, nom/prénom, contacts téléphone / amis Facebook.
- Follow/Unfollow, kudos/likes, commentaires.

### B. Gestion fine de la Confidentialité (Privacy Settings)

- Profil : Public, Privé, Masqué.
- Privacy Zones : périmètre géographique flouté (ex. 500m domicile/travail).
- Masquage des données de santé (FC, poids, calories).

### C. Historique & Bilan de Progression Long Terme

- Courbe multi-annuelle (VMA, FTP, allure 10 km, volume).
- Bilan depuis l'installation.
- Year in Review.

## 9. Fonctionnalités Avancées Complémentaires (Analyse & Rétention)

### A. Prédiction de Temps de Course & Calculateur d'Allures (Race Time Predictor)
### B. Carnet de Nutrition & Hydratation de Séance
### C. Live Tracking & Alerte de Sécurité (Safety & Emergency)
### D. Exportation & Partage Graphique d'Éléments Visuels (Social Sharing)

## 10. Module Paramètres, Gestion du Compte & Support

### A. Gestion du Profil & Identité Visuelle
### B. Paramètres de Compte & Sécurité (2FA, RGPD)
### C. Centre de Confidentialité & Autorisations
### D. Gestion des Connexions Tierces & Intégrations
### E. Préférences d'Application & Notifications
### F. Gestion de l'Abonnement & Facturation
### G. Centre d'Aide, Support & Légal

## 11. Expérience Utilisateur (UX) Unique & Modèle de Simplicité

### A. Philosophie "Zero-Friction"
- Tableau de bord "1 Clic" : séance du jour, score de récupération, jauge XP/Ranked.
- Complexité masquée dans l'onglet Analyse.
- Automatisations invisibles en arrière-plan.

### B. Fonctionnalités "Signature"
- Widgets écran verrouillé & Dynamic Island.
- Assistant Vocal/IA Intégré ("Coach Vokal").

## 12. Inscription, Sécurité (2FA) & Onboarding Dynamique

### A. Création de Compte & Sécurité 2FA obligatoire (code e-mail 6 chiffres)
### B. Questionnaire d'Onboarding (5 Questions Clés)

1. Profil athlétique : Débutant / Intermédiaire / Confirmé
2. Objectif principal : Course / Triathlon / Forme / VMA
3. Disponibilités hebdomadaires + jour sortie longue
4. Repères actuels (optionnel) : temps / VMA / FC Max
5. Connexion du matériel : Garmin Connect + Strava

/** Domain types — CDC sections 1–12 */

export type AthleticLevel = 'debutant' | 'intermediaire' | 'confirme';
export type GoalType =
  | '5k'
  | '10k'
  | 'semi'
  | 'marathon'
  | 'trail'
  | 'triathlon_sprint'
  | 'triathlon_olympique'
  | 'ironman_70_3'
  | 'ironman'
  | 'forme'
  | 'vma';

export type SubscriptionPlan = 'free' | 'premium_monthly' | 'premium_yearly';
export type ProfileVisibility = 'public' | 'private' | 'masked' | 'followers_only';
export type ThemeMode = 'light' | 'dark' | 'system';
export type UnitsSystem = 'metric' | 'imperial';

export type MuscleSensation = 'aucune_gene' | 'courbatures' | 'douleur_ciblee';
export type MentalEnergy = 'excellent' | 'neutre' | 'epuise';

export type WorkoutStepType = 'warmup' | 'active' | 'rest' | 'cooldown';
export type StepEndCondition = 'duration' | 'distance' | 'lap_button';
export type TargetType = 'pace' | 'hr' | 'power';

export type RankTier =
  | 'bronze'
  | 'argent'
  | 'or'
  | 'diamant'
  | 'platine'
  | 'elite'
  | 'champion'
  /** @deprecated — aliasé vers champion */
  | 'master';

export type PeriodizationBlock =
  | 'developpement_general'
  | 'travail_specifique'
  | 'affutage'
  | 'recuperation_post_course';

export type SportDiscipline =
  | 'run'
  | 'swim'
  | 'bike'
  | 'brick'
  | 'strength'
  | 'ppg'
  | 'mobility'
  | 'rest';

/** Top montres connectées capables d’un suivi sommeil précis */
export type WatchBrandId =
  | 'apple'
  | 'garmin'
  | 'samsung'
  | 'google_fitbit'
  | 'huawei';

export interface WatchPreference {
  brandId: WatchBrandId;
  selectedAt: string;
}

export interface SleepMetrics {
  /** 0 si durée non saisie */
  totalMinutes: number;
  lightMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  /** Score brut tel qu’affiché sur la montre (0–100) */
  score: number;
  /**
   * Score normalisé échelle coach (type Garmin/Fitbit).
   * Un 72 Apple ≠ un 72 Garmin pour l’adaptation des séances.
   */
  normalizedScore?: number;
  date: string;
  /** Marque dont le score est issu */
  source?: WatchBrandId;
  /** manual = saisie à la main */
  entryMode?: 'manual' | 'import';
}

export interface HrvMetrics {
  rmssdNight: number;
  baseline7d: number;
  deltaPct: number;
  date: string;
}

export interface RestingHrMetrics {
  bpm: number;
  source: 'night' | 'wake';
  date: string;
}

export interface BodyLoadMetrics {
  bodyBattery?: number;
  stressDaily?: number;
  date: string;
}

export interface HealthSnapshot {
  sleep?: SleepMetrics;
  /** Historique des nuits importées (calendrier sommeil) */
  sleepHistory?: SleepMetrics[];
  hrv?: HrvMetrics;
  rhr?: RestingHrMetrics;
  bodyLoad?: BodyLoadMetrics;
}

export interface PaceTarget {
  type: 'pace';
  minSecPerKm: number;
  maxSecPerKm: number;
}

export interface HrTarget {
  type: 'hr';
  minBpm: number;
  maxBpm: number;
}

export interface PowerTarget {
  type: 'power';
  minWatts: number;
  maxWatts: number;
}

export type PerformanceTarget = PaceTarget | HrTarget | PowerTarget;

export interface WorkoutStep {
  id: string;
  type: WorkoutStepType;
  /** Libellé affiché (ex. « 5 × 1 km VMA », « Squats bulgares ») */
  label?: string;
  endCondition: StepEndCondition;
  durationSec?: number;
  distanceMeters?: number;
  target?: PerformanceTarget;
  repeat?: number;
}

export interface PlannedWorkout {
  id: string;
  title: string;
  date: string;
  discipline: SportDiscipline;
  steps: WorkoutStep[];
  plannedDistanceM?: number;
  plannedDurationSec?: number;
  expectedRpe?: number;
  periodization?: PeriodizationBlock;
  exportedToGarmin?: boolean;
  exportedToStrava?: boolean;
  lockedRest?: boolean;
  /** Note coach — adaptation auto (séance imprévue, décalage, etc.) */
  coachNote?: string;
  /** Adaptation liée au score sommeil (repos crédité ≠ oubli) */
  sleepAdaptation?: {
    reason: 'poor_sleep';
    score: number;
    originalTitle: string;
    originalDiscipline: SportDiscipline;
    /** true = compte comme séance faite (repos imposé) */
    creditedComplete: boolean;
  };
  /** Programme parent (plusieurs programmes actifs en parallèle) */
  programId?: string;
}

export interface ActivityStream {
  time: number[];
  /** [lat, lng][] — tracé GPS (style Strava) */
  latlng?: [number, number][];
  velocitySmooth?: number[];
  heartrate?: number[];
  altitude?: number[];
  cadence?: number[];
  watts?: number[];
}

export interface ActivityLap {
  index: number;
  distanceM: number;
  elapsedSec: number;
  avgPaceSecPerKm?: number;
  avgHr?: number;
}

export interface StravaActivity {
  id: string;
  name: string;
  distanceM: number;
  elapsedSec: number;
  movingSec: number;
  startDate: string;
  streams?: ActivityStream;
  laps?: ActivityLap[];
  avgHr?: number;
  maxHr?: number;
  avgPaceSecPerKm?: number;
  /** Sport détecté / déclaré (import GPX, plan, heuristiques) */
  sport?: 'run' | 'bike' | 'swim' | 'strength' | 'other';
}

export interface ComplianceBreakdown {
  volumeScore: number;
  intensityScore: number;
  regularityScore: number;
  total: number;
}

export interface SessionAnalysis {
  plannedWorkoutId: string;
  activityId: string;
  compliance: ComplianceBreakdown;
  matchedBlocks: number;
}

export interface RpeFeedback {
  sessionId: string;
  rpe: number; // 1–10
  muscle: MuscleSensation;
  mental: MentalEnergy;
  submittedAt: string;
}

export type AdaptiveAction =
  | { case: 1; type: 'increase_pace'; pct: number }
  | { case: 2; type: 'reduce_volume'; pct: number }
  | {
      case: 2;
      type: 'reduce_intensity';
      pct: number;
      /** Ralentissement allure (ex. +60–120 s/km) */
      paceSecPerKmAdd?: number;
      message: string;
    }
  | { case: 2; type: 'easy_recovery' }
  | {
      case: 3;
      type: 'replace_rest_or_mobility';
      message: string;
      reason?: 'sleep' | 'injury';
    }
  | { case: 4; type: 'recalc_weekly_load_no_shift' };

export interface BanisterState {
  fitness: number;
  fatigue: number;
  formTsb: number;
  date: string;
}

export interface ShoePair {
  id: string;
  name: string;
  km: number;
  alertFromKm: number; // 600–800
}

export type XpEvent = {
  type: 'session_base' | 'compliance_bonus' | 'streak_bonus' | 'rpe_feedback' | 'program_like';
  amount: number;
  at: string;
};

export interface RankedProgress {
  xp: number;
  level: number; // 1–50+
  /** Rang compétitif (ligue) — évolue chaque semaine via le ladder */
  tier: RankTier;
  /** Division 3→1 ; null = Champion */
  division?: 1 | 2 | 3 | null;
  seasonId: string;
  streakWeeks: number;
  /** XP gagnés cette semaine de ladder (classement dans la division) */
  weekXp?: number;
  /** Clé ISO de la semaine de ladder (ex. 2026-W35) */
  ladderWeekKey?: string;
  lastLadderOutcome?: 'promoted' | 'relegated' | 'held' | 'shielded';
  lastLadderPlace?: number;
  /**
   * Boucliers Premium anti-rétrogradation restants (max 3).
   * En zone de descente : 1 bouclier consommé → on reste ; à 0 → descente réelle.
   */
  relegationShieldsLeft?: number;
  /**
   * Paliers Odyssée déjà crédités par discipline.
   * (1 palier = ODYSSEY_KM_PER_LEVEL[sport] → +40 XP)
   */
  kmOdysseyPaid?: { run?: number; bike?: number; swim?: number };
  /** @deprecated — miroir de kmOdysseyPaid.run */
  kmOdysseyLevelsPaid?: number;
  /**
   * Dernier niveau pour lequel l’animation a été montrée sur Classement.
   * Si tu gravis 1→7 hors écran, on n’anime que le niveau 7 à la prochaine visite.
   */
  lastCelebratedLevel?: number;
  /** Date ISO (YYYY-MM-DD) du dernier bonus « présence » quotidien */
  lastPresenceXpDate?: string;
  /** Couronnes #1 déjà réclamées (id + semaine) */
  rankingRewardsClaimed?: {
    id: string;
    claimedAt: string;
    weekKey: string;
  }[];
}

export interface Achievement {
  id: string;
  title: string;
  unlockedAt?: string;
  /** Description courte pour l’UI */
  description?: string;
}

export type SocialNotificationKind =
  | 'follow_request'
  | 'follow_accepted'
  | 'new_follower'
  | 'program_like';

export interface SocialNotification {
  id: string;
  kind: SocialNotificationKind;
  fromUsername: string;
  fromDisplayName: string;
  createdAt: string;
  read: boolean;
  programTitle?: string;
  /** Pour les demandes d’abonnement reçues */
  requestStatus?: 'pending' | 'accepted' | 'declined';
}

export interface NotificationPrefs {
  preSession: boolean;
  eveningReminder: boolean;
  morningSleep: boolean;
  inactivity: boolean;
  social: boolean;
  rpe: boolean;
  announcements: boolean;
  preferredSlots: Array<'matin' | 'midi' | 'soir'>;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface PrivacyZone {
  id: string;
  label: string;
  lat: number;
  lng: number;
  radiusM: number; // 200–1000
}

export interface PrivacySettings {
  visibility: ProfileVisibility;
  hideHr: boolean;
  hideWeight: boolean;
  hideCalories: boolean;
  /** Masquer programmes & séances (sauf soi) */
  hidePrograms?: boolean;
  /** Masquer évolution / temps (sauf soi) */
  hideProgress?: boolean;
  /** Masquer stats compétitives XP / forme (sauf soi) */
  hideStats?: boolean;
  zones: PrivacyZone[];
}

export interface IntegrationStatus {
  provider: 'garmin' | 'apple_health' | 'health_connect';
  connected: boolean;
  lastSyncAt?: string;
}

export interface OnboardingAnswers {
  level: AthleticLevel;
  goal: GoalType;
  trainingDays: number[]; // 0=dim … 6=sam
  longRunDay: number;
  /** Volume hebdo moyen récent (km) — déduit le niveau */
  weeklyKmAvg?: number;
  /** Volume natation hebdo (m) — natation */
  weeklySwimMeters?: number;
  /** Distance cible du programme (km) — plafonne sorties longues */
  targetDistanceKm?: number;
  recentTimeSec?: number;
  recentDistanceKm?: number;
  /**
   * Chronos de référence (secondes) pour personnaliser l’algo :
   * 5 km, 10 km, 20 km, semi, marathon (course à pied).
   */
  raceTimesSec?: Partial<{
    '5k': number;
    '10k': number;
    '20k': number;
    semi: number;
    marathon: number;
  }>;
  /**
   * Chronos multi-disciplines (secondes) — natation, vélo, splits triathlon.
   * Clés : voir `sportDistances.ts` (ex. swim `100m`, bike `40k`, tri `olympic-swim`).
   */
  sportTimesSec?: {
    swim?: Partial<Record<string, number>>;
    bike?: Partial<Record<string, number>>;
    triathlon?: Partial<Record<string, number>>;
  };
  /** FTP vélo (watts) — capacité cycliste */
  ftpWatts?: number;
  vmaKmh?: number;
  fcMax?: number;
  /** Séances PPG / renforcement activées */
  includePpg?: boolean;
  /** Discipline du programme actif (run, bike, swim…) */
  sportCategory?: string;
  /**
   * Musculation — matériel dispo (sélection multiple) :
   * gym | home_dumbbells | home_machines | bodyweight | bands
   */
  strengthEquipment?: string[];
  /**
   * Musculation — objectif :
   * fitness | hypertrophy | power
   */
  strengthGoal?: string;
  /**
   * Musculation — zones ciblées :
   * upper | lower | full
   */
  strengthBodyFocus?: string;
  connectGarmin?: boolean;
  connectStrava?: boolean;
  /** Intention course (parcours premier compte) */
  runIntent?:
    | 'race_road'
    | 'race_trail'
    | 'start'
    | 'progress'
    | 'return_injury';
  /** Route vs trail */
  terrainFocus?: 'route' | 'trail';
  /** Type d'entraînement (côte / plat) */
  trainingTerrain?: 'hills' | 'mixed' | 'flat';
  /** Ancienneté course */
  runningExperience?: 'lt1' | '1_3' | '3_5' | '5plus';
  /** Blessure 12 derniers mois */
  injuredLast12Months?: boolean;
  /** Bande de volume habituel */
  usualVolumeBand?: '0_20' | '15_35' | '30_50' | '40_60' | '60plus';
  /** Nombre de séances / semaine cible */
  weeklySessionsTarget?: 3 | 4 | 5 | 6 | 7;
}

export interface ActiveProgram {
  id: string;
  title: string;
  subtitle: string;
  /** Id catalogue (prog-10k, prog-strength-tri…) */
  catalogId?: string;
  startedAt: string;
  weeks: number;
  /** Musculation sans date de fin — calendrier renouvelé */
  ongoing?: boolean;
  targetDistanceKm?: number;
  sportCategory: string;
  /** Date de course / test (AAAA-MM-JJ) si choisie */
  raceDateIso?: string;
  /** Archivé quand un nouveau programme démarre */
  completedAt?: string;
  /** Temps de référence au démarrage (ex. chrono 5 km) */
  baselineTimeSec?: number;
  baselineDistanceKm?: number;
  /** Meilleur temps équivalent pendant / après le programme */
  currentBestTimeSec?: number;
  currentBestAt?: string;
  /** Séances importées rattachées à ce programme */
  activityIds?: string[];
  /** Bilan optionnel après programme terminé */
  reviewFeeling?: ProgramReviewFeeling;
  reviewComment?: string;
  reviewedAt?: string;
}

/** Ressenti bilan programme — pouce vert / rouge */
export type ProgramReviewFeeling = 'up' | 'down';

export interface AthleteProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  bio?: string;
  birthDate?: string;
  gender?: string;
  bodyGender?: 'homme' | 'femme';
  followers?: number;
  following?: number;
  /** Comptes que je suis */
  followingUsernames?: string[];
  /** Comptes qui me suivent (acceptés) */
  followerUsernames?: string[];
  /** Demandes d’abonnement que j’ai envoyées (en attente) */
  outgoingFollowRequests?: string[];
  /** Fil d’activité sociale (cloche) */
  socialNotifications?: SocialNotification[];
  heightCm?: number;
  weightKg?: number;
  city?: string;
  country?: string;
  /** Pays figé après détection device (anti-fraude classement national) */
  countryLocked?: boolean;
  avatarUri?: string;
  coverUri?: string;
  /** Fond de bannière profil (catalogue animé) */
  profileCoverId?: string;
  title?: string;
  borderStyle?: string;
  units: UnitsSystem;
  theme: ThemeMode;
  language: string;
  plan: SubscriptionPlan;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  onboardingCompleted: boolean;
  onboarding?: OnboardingAnswers;
  activeProgram?: ActiveProgram;
  /** Programmes actifs en parallèle (multi-sports) */
  activePrograms?: ActiveProgram[];
  /** Anciens programmes (terminés ou remplacés) */
  programHistory?: ActiveProgram[];
  /**
   * Template catalogue actuellement compté dans le classement d’usage
   * (+1 au lancement, −1 à la suppression / fin).
   */
  programUsageCountedId?: string | null;
  /**
   * Programmes déjà likés (clé `ownerUsername:programId`) —
   * 1 like = 1 gain d’XP, pas de double.
   */
  likedProgramKeys?: string[];
  /** Likes envoyés sur séances d’autres athlètes (`owner:sessionId`) */
  likedSessionKeys?: string[];
  /** Programme terminé en attente de bilan satisfaction (pouces) */
  pendingProgramReviewId?: string | null;
  ranked: RankedProgress;
  achievements: Achievement[];
  privacy: PrivacySettings;
  notifications: NotificationPrefs;
  /**
   * true une fois que l’app a proposé d’autoriser les notifications
   * (création de compte ou reconnexion).
   */
  pushPermissionAsked?: boolean;
  /** Permission système accordée (iOS/Android). */
  pushEnabled?: boolean;
  integrations: IntegrationStatus[];
  /** Montre choisie pour l’import sommeil (questionnaire 1ʳᵉ fois) */
  watch?: WatchPreference | null;
  shoes: ShoePair[];
  createdAt: string;
}

export interface LifetimeStats {
  totalKm: number;
  totalElevationM: number;
  totalSessions: number;
  totalHours: number;
  /** Cumuls Odyssée par discipline (km) */
  runKm?: number;
  bikeKm?: number;
  swimKm?: number;
}

export interface RacePrediction {
  distanceLabel: string;
  predictedSec: number;
  paceSecPerKm: number;
}

export interface NutritionPlan {
  waterMl: number;
  carbsGPerHour: number;
  reminderEveryMin: number;
  tips: string[];
}

export interface ProgressPoint {
  date: string;
  vmaKmh?: number;
  ftpWatts?: number;
  pace10kSecPerKm?: number;
  weeklyKm?: number;
  monthlyHours?: number;
}

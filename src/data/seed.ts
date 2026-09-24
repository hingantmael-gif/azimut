import type {
  AthleteProfile,
  BanisterState,
  Club,
  HealthSnapshot,
  LifetimeStats,
  PlannedWorkout,
  ProgressPoint,
  RpeFeedback,
  SessionAnalysis,
  SocialNotification,
  StravaActivity,
} from '../types/domain';
import type { ScheduledReminder } from '../engines/notifications';
import { defaultAchievementsFromCatalog } from '../engines/achievements';

const today = new Date();

function buildDemoSocialNotifications(): SocialNotification[] {
  return [];
}

export const defaultProfile: AthleteProfile = {
  id: 'athlete-1',
  email: '',
  firstName: '',
  lastName: '',
  username: '',
  units: 'metric',
  theme: 'light',
  language: 'fr',
  plan: 'free',
  emailVerified: false,
  twoFactorEnabled: true,
  onboardingCompleted: false,
  ranked: {
    xp: 0,
    level: 1,
    tier: 'bronze',
    division: 3,
    seasonId: 'saison-1',
    streakWeeks: 0,
    weekXp: 0,
    ladderWeekKey: '',
  },
  achievements: defaultAchievementsFromCatalog(),
  privacy: {
    visibility: 'private',
    hideHr: false,
    hideWeight: true,
    hideCalories: false,
    hidePrograms: false,
    hideProgress: false,
    hideStats: false,
    zones: [],
  },
  followingUsernames: [],
  followerUsernames: [],
  outgoingFollowRequests: [],
  socialNotifications: buildDemoSocialNotifications(),
  country: 'France',
  profileCoverId: 'free-teal',
  notifications: {
    preSession: true,
    eveningReminder: true,
    morningSleep: true,
    inactivity: true,
    social: true,
    rpe: true,
    announcements: false,
    preferredSlots: ['soir'],
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  },
  pushPermissionAsked: false,
  pushEnabled: false,
  integrations: [
    { provider: 'garmin', connected: false },
    { provider: 'apple_health', connected: false },
    { provider: 'health_connect', connected: false },
  ],
  shoes: [
    { id: 'shoe-1', name: 'Paire principale', km: 0, alertFromKm: 700 },
  ],
  bodyGender: 'homme',
  followers: 0,
  following: 0,
  createdAt: new Date().toISOString(),
};

export const emptyHealth: HealthSnapshot = {};

export function buildInitialPlan(): PlannedWorkout[] {
  return [];
}

export const emptyBanister: BanisterState = {
  date: today.toISOString().slice(0, 10),
  fitness: 0,
  fatigue: 0,
  formTsb: 0,
};

/** @deprecated — préférer emptyBanister */
export const demoBanister = emptyBanister;

/** @deprecated — préférer emptyHealth */
export const demoHealth = emptyHealth;

export const demoLifetime: LifetimeStats = {
  totalKm: 0,
  totalElevationM: 0,
  totalSessions: 0,
  totalHours: 0,
};

export const demoProgress: ProgressPoint[] = [];

export type AppState = {
  profile: AthleteProfile;
  pending2faCode: string | null;
  pendingRpeActivityId: string | null;
  health: HealthSnapshot;
  plan: PlannedWorkout[];
  activities: StravaActivity[];
  analyses: SessionAnalysis[];
  feedbacks: RpeFeedback[];
  banister: BanisterState;
  lifetime: LifetimeStats;
  progress: ProgressPoint[];
  authToken: string | null;
  reminders: ScheduledReminder[];
  /** Clubs / groupes rejoints ou créés (local) */
  clubs: Club[];
  /** Messages coach récents (adaptations auto) */
  coachAdaptations?: string[];
  /** RPE prédit pour la séance en attente de feedback (boucle fermée V2) */
  pendingPredictedRpe?: number | null;
};
export function buildFreshAccountState(
  authToken: string,
  profile: Partial<AthleteProfile> & { emailVerified?: boolean; onboardingCompleted?: boolean },
): AppState {
  return {
    profile: {
      ...defaultProfile,
      id: profile.id ?? `athlete-${Date.now()}`,
      emailVerified: profile.emailVerified ?? true,
      twoFactorEnabled: false,
      onboardingCompleted: profile.onboardingCompleted ?? true,
      followers: 0,
      following: 0,
      ranked: {
        xp: 0,
        level: 1,
        tier: 'bronze',
        division: 3,
        seasonId: 'saison-1',
        streakWeeks: 0,
        weekXp: 0,
        ladderWeekKey: '',
      },
      shoes: [{ id: 'shoe-1', name: 'Paire principale', km: 0, alertFromKm: 700 }],
      integrations: defaultProfile.integrations.map((i) => ({ ...i, connected: false })),
      ...profile,
    },
    pending2faCode: null,
    pendingRpeActivityId: null,
    health: emptyHealth,
    plan: [],
    activities: [],
    analyses: [],
    feedbacks: [],
    banister: emptyBanister,
    lifetime: demoLifetime,
    progress: [],
    authToken,
    reminders: [],
    clubs: [],
  };
}

/** Compte essai 1/1 — données vides, onboarding Campus obligatoire au premier passage. */
export function buildDemoAccountState(): AppState {
  return buildFreshAccountState('demo-ones-token', {
    id: 'demo-1',
    firstName: '1',
    lastName: '1',
    email: '1@demo.local',
    username: '1',
    bodyGender: 'homme',
    gender: 'homme',
    onboardingCompleted: false,
  });
}

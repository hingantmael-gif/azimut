import type {
  AthleteProfile,
  BanisterState,
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
import { DEMO_DIRECTORY } from './demoDirectory';
import { trimSocialNotifications } from '../engines/socialNotifications';
import { defaultAchievementsFromCatalog } from '../engines/achievements';

const today = new Date();

function buildDemoSocialNotifications(): SocialNotification[] {
  const core: SocialNotification[] = [
    {
      id: 'n-like-1',
      kind: 'program_like',
      fromUsername: 'leamartin',
      fromDisplayName: 'Léa Martin',
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
      read: false,
      programTitle: 'Programme 5 km',
    },
    {
      id: 'n-req-1',
      kind: 'follow_request',
      fromUsername: 'nathanbertrand',
      fromDisplayName: 'Nathan Bertrand',
      createdAt: new Date(Date.now() - 7200_000).toISOString(),
      read: false,
      requestStatus: 'pending',
    },
    {
      id: 'n-req-2',
      kind: 'follow_request',
      fromUsername: 'ninarossi',
      fromDisplayName: 'Nina Rossi',
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      read: false,
      requestStatus: 'pending',
    },
  ];

  const extras: SocialNotification[] = DEMO_DIRECTORY.slice(0, 24).map((m, i) => {
    const hoursAgo = 3 + i * 5;
    if (i % 4 === 0) {
      return {
        id: `n-follow-${m.username}`,
        kind: 'new_follower' as const,
        fromUsername: m.username,
        fromDisplayName: m.name,
        createdAt: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
        read: i > 4,
      };
    }
    return {
      id: `n-like-${m.username}`,
      kind: 'program_like' as const,
      fromUsername: m.username,
      fromDisplayName: m.name,
      createdAt: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
      read: i > 3,
      programTitle: `Programme ${m.sport}`,
    };
  });

  return trimSocialNotifications([...core, ...extras]);
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
  /** Messages coach récents (adaptations auto) */
  coachAdaptations?: string[];
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

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type {
  Achievement,
  AthleteProfile,
  Club,
  ClubPost,
  ClubVisibility,
  HealthSnapshot,
  OnboardingAnswers,
  PlannedWorkout,
  ProgramReviewFeeling,
  RankedProgress,
  RpeFeedback,
  SleepMetrics,
  SocialNotification,
  StravaActivity,
  WatchBrandId,
} from '../types/domain';
import { catalogClubToClub, CATALOG_CLUBS } from '../constants/catalogClubs';
import {
  applyAdaptiveToWorkout,
  applyXp,
  banisterLoadFromSession,
  computeAcwr,
  computeCompliance,
  computeSessionXp,
  decideAdaptiveAction,
  PROGRAM_LIKE_XP,
  SESSION_LIKE_XP,
  RPE_SUBMIT_XP,
  claimDailyPresenceXp,
  todayIsoDate,
} from '../engines/core';
import {
  defaultDigitalTwin,
  learnFromSession,
  type AthleteDigitalTwin,
} from '../engines/athleteDigitalTwin';
import {
  eccentricLoadFactor,
  projectBanister,
  updateBanisterPlus,
} from '../engines/banisterPlus';
import { predictSessionRpe } from '../engines/sessionPrediction';
import { sportKeyFrom } from '../theme/sportTints';
import { isCalisthenicsWorkout } from '../engines/calisthenicsProgramming';
import { upsertSleepNight, removeSleepNight, computeSleepStreak, sleepNightsLogged, toLocalDateIso } from '../engines/sleepCalendar';
import {
  applySleepAdaptiveToWorkout,
  decideSleepAdaptiveAction,
  findWorkoutToAdaptForSleep,
} from '../engines/sleepAdaptation';
import { programLikeKey } from '../data/demoDirectory';
import {
  prependSocialNotification,
  trimSocialNotifications,
} from '../engines/socialNotifications';
import { addShoeKm, defaultAchievementsFromCatalog, unlockAchievements } from '../engines/achievements';
import { claimAllKmOdysseyLevels } from '../engines/kmOdyssey';
import { buildProgramPlan, type ProgramBuildInput } from '../engines/programBuilder';
import { applySleepStartupRamp } from '../engines/sleepProgramRamp';
import { applyIntentStartupRamp } from '../engines/intentStartupRamp';
import {
  adaptPlanFromAthleteLoad,
  applyAthleteLoadStartupRamp,
  computeAthleteLoadSnapshot,
} from '../engines/athleteLoadBridge';
import {
  createProgramInstanceId,
  mergeProgramPlans,
  removeFutureProgramSessions,
  resolveActivePrograms,
  syncActiveProgramInProfile,
  tagPlanForProgram,
} from '../engines/multiProgramPlan';
import { findPlannedForFreeActivity, pickProgramForActivity } from '../engines/programSessions';
import {
  applyConcurrentDaySoftening,
  rebalanceIncomingAgainstPlan,
  spreadIncomingSessions,
} from '../engines/concurrentSessions';
import { buildDailyReminders } from '../engines/notifications';
import { toStravaCreateActivityPayload } from '../engines/stravaExport';
import { normalizeIntegrations } from '../services/integrationLinks';
import { isRemoteAuthToken, apiFetchIntegrations } from '../services/integrationsApi';
import { isPremium, withPremiumXpBonus } from '../engines/subscription';
import {
  applyOwnerPremiumPolicy,
  forceOwnerChampionRank,
  isOwnerGooglePremiumGrant,
  isOwnerPremiumEmail,
  isPaidPremiumSource,
  ownerPremiumPlan,
  type AuthProviderId,
  type PremiumSource,
} from '../engines/ownerAccess';
import { localeFromCountry } from '../i18n/locales';
import {
  ladderWeekKey,
  normalizeRankedLadder,
  settleMissedLadderWeeks,
  PREMIUM_RELEGATION_SHIELDS,
} from '../engines/rankedSeason';
import { resolveGiftedPremiumStatus } from '../storage/ownerPremiumGifts';
import {
  canStackAnotherProgram,
  hasPremiumAccess,
  shouldEnforceFreeLimits,
} from '../premium/entitlement';
import { resolveLockedCountry } from '../engines/countryLock';
import { applyActivityToProgramProgress } from '../engines/programProgress';
import { promoteChronoToOnboarding } from '../engines/athleteProfile';
import {
  calendarDayKey,
  isRankableProgramId,
  normalizeCountedTemplateIds,
} from '../engines/programPopularity';
import { findDuplicateActivity } from '../engines/activityDuplicate';
import {
  adaptPlanAfterUnplannedActivity,
  completedWorkoutIdsFromAnalyses,
  fillPlanGaps,
  rebuildFutureWorkoutPacing,
  reschedulePlanToNewDays,
} from '../engines/planAdaptation';
import {
  AppState,
  buildDemoAccountState,
  buildFreshAccountState,
  defaultProfile,
  demoLifetime,
  demoProgress,
  emptyBanister,
  emptyHealth,
} from '../data/seed';
import { deviceLabel, getOrCreateRsid } from '../storage/deviceSession';
import { clearAllSocialInbox } from '../storage/socialInbox';
import {
  clearSession,
  flushPendingSessionSave,
  isSessionValidForDevice,
  loadSession,
  saveSession,
  saveSessionImmediate,
  type PersistedAppState,
} from '../storage/sessionPersistence';
import { profileToRegistryUser, upsertRegistryUser } from '../storage/userRegistry';
import { persistAvatarUri } from '../utils/persistAvatar';
import { markOnboardingCompleted } from '../storage/onboardingPersistence';
import { fanOutSocialSideEffect } from '../engines/socialFanOut';

export type SessionMeta = {
  rsid: string;
  deviceLabel: string;
  lastSavedAt?: string;
};

type Action =
  | { type: 'REGISTER'; payload: Partial<AthleteProfile> & { email: string; password: string } }
  | { type: 'VERIFY_2FA'; code: string }
  | { type: 'MARK_EMAIL_VERIFIED' }
  | { type: 'RESEND_2FA' }
  | { type: 'FINALIZE_ACCOUNT'; password: string }
  | {
      type: 'ENTER_DEMO';
      payload?: Partial<AthleteProfile> & { email?: string; password?: string };
    }
  | { type: 'LOGIN'; payload: { emailOrUsername: string; password: string; onboardingCompleted?: boolean } }
  | {
      type: 'AUTH_WITH_PROVIDER';
      payload: {
        token: string;
        email: string;
        firstName?: string;
        lastName?: string;
        username?: string;
        onboardingCompleted?: boolean;
        /** google | email | apple | local | trial */
        provider?: AuthProviderId;
        plan?: AthleteProfile['plan'];
        country?: string;
        language?: string;
        countryLocked?: boolean;
        /** gift | paid — appliqué hors compte owner */
        premiumSource?: PremiumSource | null;
        giftedPremium?: boolean;
      };
    }
  | { type: 'LOGOUT' }
  | { type: 'DELETE_ACCOUNT' }
  | { type: 'APPLY_REMOTE_SYNC'; patch: Partial<AppState> }
  | { type: 'REFRESH_TOKEN'; authToken: string }
  | { type: 'RESTORE_SESSION'; state: PersistedAppState }
  | { type: 'SYNC_PREMIUM_ENTITLEMENT'; gifted: boolean; confirmed?: boolean }
  | {
      type: 'APPLY_SUBSCRIPTION';
      subscription: NonNullable<AthleteProfile['subscription']>;
      plan: AthleteProfile['plan'];
    }
  | { type: 'COMPLETE_ONBOARDING'; answers: OnboardingAnswers }
  | { type: 'UPDATE_ONBOARDING'; patch: Partial<OnboardingAnswers> }
  | { type: 'RESCHEDULE_TRAINING_DAYS'; trainingDays: number[]; longRunDay: number }
  | {
      type: 'ADJUST_ACTIVE_PROGRAM';
      patch: Partial<OnboardingAnswers>;
    }
  | {
      type: 'CREATE_PROGRAM';
      input: ProgramBuildInput;
      /** stack = superposer · replace = remplacer l’actif · spread = autres jours (legacy) */
      scheduleMode?: 'stack' | 'spread' | 'replace';
    }
  | { type: 'CANCEL_PROGRAM'; programId?: string }
  | { type: 'PRUNE_FINISHED_PROGRAM' }
  | { type: 'SYNC_PROGRAM_USAGE' }
  | { type: 'UPDATE_PROFILE'; patch: Partial<AthleteProfile> }
  | { type: 'CONNECT_PROVIDER'; provider: AthleteProfile['integrations'][number]['provider'] }
  | { type: 'SET_INTEGRATIONS'; integrations: AthleteProfile['integrations'] }
  | { type: 'MARK_GARMIN_EXPORTED'; workoutId: string }
  | { type: 'EXPORT_GARMIN'; workoutId: string }
  | { type: 'EXPORT_STRAVA'; workoutId: string }
  | {
      type: 'INGEST_STRAVA';
      activity: StravaActivity;
      plannedId?: string;
      /** false = ne pas rattacher au plan (séance libre) */
      linkPlan?: boolean;
    }
  | {
      type: 'RECORD_PROGRAM_TEST_TIME';
      timeSec: number;
      distanceKm?: number;
    }
  | {
      type: 'SAVE_PROGRAM_REVIEW';
      programId: string;
      completedAt?: string;
      startedAt: string;
      feeling: ProgramReviewFeeling;
      comment: string;
    }
  | { type: 'INGEST_HEALTH'; health: HealthSnapshot }
  | { type: 'UPSERT_SLEEP'; night: SleepMetrics }
  | { type: 'CLEAR_SLEEP'; date: string }
  | { type: 'WITHDRAW_HEALTH_CONSENT' }
  | { type: 'SET_WATCH'; brandId: WatchBrandId | null }
  | { type: 'SIMULATE_STRAVA_SYNC' }
  | { type: 'SUBMIT_RPE'; feedback: RpeFeedback }
  | { type: 'COMPLETE_SESSION_DONE'; sessionId: string }
  | { type: 'DISMISS_RPE' }
  | { type: 'MOVE_WORKOUT'; id: string; newDate: string }
  | { type: 'REMOVE_WORKOUT'; id: string }
  /** Séance ajoutée à la main (bibliothèque / séance rapide) : à faire tout de suite ou un autre jour. */
  | { type: 'ADD_WORKOUT'; workout: PlannedWorkout }
  | { type: 'UPDATE_WORKOUT'; id: string; patch: Partial<PlannedWorkout> }
  | { type: 'SET_PLAN'; plan: PlannedWorkout[] }
  | { type: 'REFRESH_REMINDERS' }
  | { type: 'FOLLOW_USER'; username: string; requiresApproval?: boolean }
  | { type: 'UNFOLLOW_USER'; username: string }
  | { type: 'CANCEL_FOLLOW_REQUEST'; username: string }
  | { type: 'ACCEPT_FOLLOW_REQUEST'; notificationId: string }
  | { type: 'DECLINE_FOLLOW_REQUEST'; notificationId: string }
  | { type: 'MARK_SOCIAL_READ'; notificationId?: string }
  | {
      type: 'LIKE_PROGRAM';
      ownerUsername: string;
      programId: string;
      programTitle: string;
    }
  | {
      type: 'LIKE_SESSION';
      ownerUsername: string;
      sessionId: string;
      sessionTitle: string;
    }
  | { type: 'DISMISS_PROGRAM_REVIEW_PROMPT' }
  | {
      type: 'PUSH_SOCIAL_NOTIFICATION';
      notification: SocialNotification;
    }
  | { type: 'SETTLE_LADDER_WEEK'; place: number }
  | { type: 'CELEBRATE_LEVEL'; level: number }
  | { type: 'CLAIM_DAILY_PRESENCE_XP' }
  | { type: 'LOCK_COMPETITIVE_COUNTRY' }
  | { type: 'SYNC_PLAN_TO_LOAD' }
  | {
      type: 'CLAIM_RANKING_REWARD';
      rewardId: string;
      xp: number;
      profileTitle?: string;
      shieldBonus?: number;
      weekKey: string;
    }
  | {
      type: 'CREATE_CLUB';
      id?: string;
      name: string;
      description: string;
      city?: string;
      sportLabel?: string;
      visibility?: ClubVisibility;
    }
  | { type: 'JOIN_CATALOG_CLUB'; catalogId: string }
  | { type: 'LEAVE_CLUB'; clubId: string }
  | { type: 'DELETE_CLUB'; clubId: string }
  | { type: 'POST_CLUB_MESSAGE'; clubId: string; text: string }
  | {
      type: 'SHARE_ACTIVITY_TO_CLUB';
      clubId: string;
      activityId: string;
      note?: string;
    }
  | {
      type: 'SHARE_PROGRAM_TO_CLUB';
      clubId: string;
      programId: string;
      programTitle: string;
      note?: string;
    };

function syncPlanToAthleteLoad(state: AppState): AppState {
  if (resolveActivePrograms(state.profile).length === 0) return state;
  if (state.plan.length === 0) return state;
  const twin = resolveDigitalTwin(state);
  const snap = computeAthleteLoadSnapshot({
    formTsb: banisterFormNow(state),
    health: state.health,
    activities: state.activities,
    feedbacks: state.feedbacks,
    plan: state.plan,
    onboarding: state.profile.onboarding,
    twin,
  });
  if (state.profile.lastLoadPlanSyncKey === snap.syncKey) return state;
  const adapted = adaptPlanFromAthleteLoad(state.plan, snap, {
    fromDateIso: new Date().toISOString().slice(0, 10),
    completedWorkoutIds: completedWorkoutIdsFromAnalyses(state.analyses),
  });
  if (!adapted.changed) {
    return {
      ...state,
      profile: {
        ...state.profile,
        lastLoadPlanSyncKey: snap.syncKey,
      },
    };
  }
  return {
    ...state,
    plan: adapted.plan,
    profile: {
      ...state.profile,
      lastLoadPlanSyncKey: snap.syncKey,
    },
    coachAdaptations: [adapted.message, ...(state.coachAdaptations ?? [])]
      .filter(Boolean)
      .slice(0, 12) as string[],
  };
}

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Jumeau numérique : profil stocké ou défaut depuis l’onboarding. */
export function resolveDigitalTwin(state: {
  profile: AthleteProfile;
}): AthleteDigitalTwin {
  return (
    state.profile.digitalTwin ??
    defaultDigitalTwin({
      birthDate: state.profile.birthDate,
      level: state.profile.onboarding?.level,
    })
  );
}

function activityElevationLossM(activity: StravaActivity): number | undefined {
  const alt = activity.streams?.altitude;
  if (!alt || alt.length < 2) return undefined;
  let loss = 0;
  for (let i = 1; i < alt.length; i++) {
    const d = alt[i - 1]! - alt[i]!;
    if (d > 0) loss += d;
  }
  return loss > 0 ? Math.round(loss) : undefined;
}

function activityAvgCadence(activity: StravaActivity): number | undefined {
  const c = activity.streams?.cadence;
  if (!c || c.length < 5) return undefined;
  const sum = c.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  return sum / c.length;
}

/**
 * Forme (TSB) à aujourd'hui : le state stocké date de la dernière charge, donc on
 * applique la décroissance des jours de repos avant toute décision / affichage.
 */
function banisterFormNow(state: AppState): number {
  return projectBanister(state.banister, todayIsoDate(), resolveDigitalTwin(state).response).formTsb;
}

function applyBanisterLoad(
  state: AppState,
  baseLoad: number,
  date: string,
  activity?: StravaActivity,
  prev = state.banister,
) {
  let load = Math.max(0, baseLoad);
  if (activity) {
    const elevLoss = activityElevationLossM(activity);
    if (elevLoss != null || activity.sport === 'run') {
      const factor = eccentricLoadFactor({
        elevationLossM: elevLoss,
        discipline: activity.sport,
        cadence: activityAvgCadence(activity),
      });
      load = Math.round(load * factor * 10) / 10;
    }
  }
  const twin = resolveDigitalTwin(state);
  return updateBanisterPlus(prev, load, date, twin.response);
}

function emptyState(): AppState {
  return {
    profile: defaultProfile,
    pending2faCode: null,
    pendingRpeActivityId: null,
    health: emptyHealth,
    plan: [],
    activities: [],
    analyses: [],
    feedbacks: [],
    banister: emptyBanister,
    lifetime: demoLifetime,
    progress: demoProgress,
    authToken: null,
    reminders: [],
    clubs: [],
  };
}

function withReminders(state: AppState): AppState {
  const today = new Date().toISOString().slice(0, 10);
  const workout = state.plan.find((w) => w.date === today);
  const sessionDone = state.activities.some((a) => a.startDate.slice(0, 10) === today);
  const hasSession = Boolean(workout && workout.discipline !== 'rest');
  return {
    ...state,
    reminders: buildDailyReminders(
      state.profile.notifications,
      hasSession,
      sessionDone,
      state.health.sleep?.score,
      {
        sessionTitle: workout?.title,
        formTsb: banisterFormNow(state),
        todayWorkout: workout,
      },
    ),
  };
}

function patchClubPost(
  state: AppState,
  clubId: string,
  partial: Omit<ClubPost, 'id' | 'authorUsername' | 'authorDisplayName' | 'createdAt'>,
): AppState {
  const clubs = state.clubs ?? [];
  const club = clubs.find((c) => c.id === clubId);
  if (!club) return state;
  const me = state.profile.username.trim().toLowerCase();
  if (!club.members.some((m) => m.username === me)) return state;
  const display =
    [state.profile.firstName, state.profile.lastName].filter(Boolean).join(' ') || me;
  const post: ClubPost = {
    id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    authorUsername: me,
    authorDisplayName: display,
    createdAt: new Date().toISOString(),
    ...partial,
  };
  return {
    ...state,
    clubs: clubs.map((c) =>
      c.id !== clubId ? c : { ...c, posts: [post, ...c.posts].slice(0, 80) },
    ),
  };
}

function demoLoginState(overrides: Partial<AthleteProfile> = {}): AppState {
  const base = buildDemoAccountState();
  return withReminders({
    ...base,
    profile: { ...base.profile, ...overrides },
  });
}

function badgeUnlockInput(
  state: AppState,
  ranked: RankedProgress,
  sessionHour?: number,
) {
  const likedPrograms = (state.profile.likedProgramKeys ?? []).length;
  const likedSessions = (state.profile.likedSessionKeys ?? []).length;
  const sleepHistory = state.health.sleepHistory;
  const programsLaunched = resolveProgramsLaunchedCount(state.profile);
  return {
    achievements: state.profile.achievements,
    lifetime: state.lifetime,
    feedbacks: state.feedbacks,
    sessionHour,
    ranked,
    likedPrograms,
    likedSessions,
    likesGiven: likedPrograms + likedSessions,
    following: (state.profile.followingUsernames ?? []).length,
    followers: (state.profile.followerUsernames ?? []).length,
    hasActiveProgram: resolveActivePrograms(state.profile).length > 0,
    programHistoryCount: (state.profile.programHistory ?? []).filter(
      (p) => !p.abandoned && Boolean(p.completedAt),
    ).length,
    programsLaunched,
    sleepNights: sleepNightsLogged(sleepHistory),
    sleepStreak: computeSleepStreak(sleepHistory),
  };
}

/** Compteur programmes lancés (monotone) — backfill depuis l’historique si besoin. */
function resolveProgramsLaunchedCount(profile: AthleteProfile): number {
  const stored = profile.programsLaunchedCount ?? 0;
  const inferred =
    (profile.programHistory?.length ?? 0) +
    resolveActivePrograms(profile).length;
  return Math.max(stored, inferred);
}

function resolveUsageCountedIds(profile: AthleteProfile): string[] {
  return normalizeCountedTemplateIds(
    profile.programUsageCountedIds ?? profile.programUsageCountedId,
  );
}

function resolveUsageFinishedIds(profile: AthleteProfile): string[] {
  return normalizeCountedTemplateIds(profile.programUsageFinishedIds);
}

function withUsageIds(
  profile: AthleteProfile,
  countedIds: string[],
  finishedIds?: string[],
): AthleteProfile {
  const counted = normalizeCountedTemplateIds(countedIds);
  const finished = normalizeCountedTemplateIds(
    finishedIds ?? profile.programUsageFinishedIds,
  );
  return {
    ...profile,
    programUsageCountedIds: counted,
    programUsageFinishedIds: finished,
    programUsageCountedId: counted[counted.length - 1] ?? null,
  };
}

/** Débloque badges + crédite l’XP selon difficulté (1 re-passe si XP débloque d’autres). */
function applyBadgeUnlocks(
  state: AppState,
  ranked: RankedProgress,
  sessionHour?: number,
  opts?: { awardXp?: boolean },
): { achievements: Achievement[]; ranked: RankedProgress; badgeXpAwarded: number } {
  const awardXp = opts?.awardXp !== false;
  const premium = isPremium(state.profile.plan);
  let nextRanked = ranked;
  let workingState = state;
  let totalBadgeXp = 0;

  for (let pass = 0; pass < 2; pass++) {
    const result = unlockAchievements(
      badgeUnlockInput(workingState, nextRanked, sessionHour),
    );
    const badgeXp = result.newlyUnlocked.reduce((s, b) => s + b.xpReward, 0);
    workingState = {
      ...workingState,
      profile: {
        ...workingState.profile,
        achievements: result.achievements,
        ranked: nextRanked,
      },
    };
    if (badgeXp <= 0) {
      return {
        achievements: result.achievements,
        ranked: nextRanked,
        badgeXpAwarded: totalBadgeXp,
      };
    }
    if (awardXp) {
      totalBadgeXp += badgeXp;
      nextRanked = applyXp(nextRanked, withPremiumXpBonus(badgeXp, premium));
      workingState = {
        ...workingState,
        profile: { ...workingState.profile, ranked: nextRanked },
      };
    } else {
      // Badges débloqués sans XP (création déjà XP aujourd’hui, ou abandon programme)
      return {
        achievements: result.achievements,
        ranked: nextRanked,
        badgeXpAwarded: 0,
      };
    }
    if (pass === 1) {
      return {
        achievements: result.achievements,
        ranked: nextRanked,
        badgeXpAwarded: totalBadgeXp,
      };
    }
  }
  return {
    achievements: workingState.profile.achievements,
    ranked: nextRanked,
    badgeXpAwarded: totalBadgeXp,
  };
}

/** Odyssées km : course 10 km · vélo 25 km · natation 1 km → +40 XP / palier */
function applyKmOdysseyXp(
  ranked: RankedProgress,
  distances: { runKm: number; bikeKm: number; swimKm: number },
  premium: boolean,
): RankedProgress {
  const claimed = claimAllKmOdysseyLevels(ranked, distances);
  if (claimed.baseXp <= 0) return claimed.ranked;
  return applyXp(claimed.ranked, withPremiumXpBonus(claimed.baseXp, premium));
}

function lifetimeDistances(lifetime: AppState['lifetime']) {
  const runKm = lifetime.runKm ?? lifetime.totalKm ?? 0;
  const bikeKm = lifetime.bikeKm ?? 0;
  const swimKm = lifetime.swimKm ?? 0;
  return { runKm, bikeKm, swimKm };
}

/** Compte ultra-sécurisé : Premium + Champion après chaque action. */
function ensureOwnerAccountInvariants(state: AppState): AppState {
  if (!isOwnerPremiumEmail(state.profile.email)) return state;
  const profile = applyOwnerPremiumPolicy(state.profile);
  if (profile === state.profile) return state;
  if (
    profile.plan === state.profile.plan &&
    profile.premiumSource === state.profile.premiumSource &&
    profile.authProvider === state.profile.authProvider &&
    profile.ranked.xp === state.profile.ranked.xp &&
    profile.ranked.level === state.profile.ranked.level &&
    profile.ranked.tier === state.profile.ranked.tier &&
    profile.ranked.division === state.profile.ranked.division
  ) {
    return state;
  }
  return { ...state, profile };
}

export function reduceAppState(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'REGISTER': {
      const code = genCode();
      return {
        ...state,
        pending2faCode: code,
        authToken: null,
        profile: {
          ...state.profile,
          id: `athlete-${Date.now()}`,
          email: action.payload.email,
          firstName: action.payload.firstName ?? '',
          lastName: action.payload.lastName ?? '',
          username: '',
          emailVerified: false,
          twoFactorEnabled: true,
        },
      };
    }
    case 'RESEND_2FA':
      return { ...state, pending2faCode: genCode() };
    case 'VERIFY_2FA': {
      if (!state.pending2faCode || action.code !== state.pending2faCode) return state;
      return {
        ...state,
        pending2faCode: null,
        profile: { ...state.profile, emailVerified: true },
      };
    }
    case 'MARK_EMAIL_VERIFIED':
      return {
        ...state,
        pending2faCode: null,
        profile: { ...state.profile, emailVerified: true },
      };
    case 'FINALIZE_ACCOUNT': {
      if (!state.profile.emailVerified) return state;
      const profile = {
        ...state.profile,
        id: state.profile.id || `athlete-${Date.now()}`,
        createdAt: state.profile.createdAt || new Date().toISOString(),
      };
      return {
        ...state,
        authToken: 'local-demo-token',
        profile,
        plan: [],
        activities: [],
        analyses: [],
        feedbacks: [],
        banister: emptyBanister,
        lifetime: demoLifetime,
        progress: [],
      };
    }
    case 'ENTER_DEMO': {
      const p = action.payload ?? {};
      return demoLoginState({
        firstName: p.firstName || '1',
        lastName: p.lastName || '1',
        email: p.email || '1@demo.local',
        username: p.username || '1',
      });
    }
    case 'LOGIN': {
      const id = action.payload.emailOrUsername.trim();
      const pwd = action.payload.password.trim();
      if (id === '1' && pwd === '1') {
        // Reconnexion : onboarding seulement si jamais terminé (flag passé par l’écran login).
        return demoLoginState({
          onboardingCompleted: action.payload.onboardingCompleted === true,
        });
      }
      if (
        (id === state.profile.email || id === state.profile.username) &&
        state.profile.emailVerified
      ) {
        return {
          ...state,
          authToken: 'local-demo-token',
          profile: {
            ...state.profile,
            onboardingCompleted:
              action.payload.onboardingCompleted === true
                ? true
                : state.profile.onboardingCompleted,
          },
        };
      }
      return state;
    }
    case 'LOGOUT':
      return emptyState();
    case 'DELETE_ACCOUNT':
      return emptyState();
    case 'APPLY_REMOTE_SYNC': {
      // Données venues d'un autre appareil : jamais le jeton, ni l'état d'écran en cours.
      const { authToken: _t, pending2faCode: _p, pendingRpeActivityId: _r, profile, ...rest } = action.patch;
      return {
        ...state,
        ...rest,
        profile: profile ? { ...state.profile, ...profile } : state.profile,
      };
    }
    case 'REFRESH_TOKEN':
      return state.authToken ? { ...state, authToken: action.authToken } : state;
    case 'RESTORE_SESSION': {
      const incoming = action.state.profile;
      const waitlistCalis = Boolean(incoming.waitlistCalisthenics);
      const productNotifs: SocialNotification[] = waitlistCalis
        ? [
            {
              id: `product-calis-${Date.now()}`,
              kind: 'product',
              fromUsername: 'mova',
              fromDisplayName: 'Mova',
              createdAt: new Date().toISOString(),
              read: false,
              programTitle:
                'La callisthénie est disponible — Programmes → Arbre callisthénie',
            },
          ]
        : [];
      const token = action.state.authToken ?? '';
      const inferredProvider: AuthProviderId | undefined =
        (incoming.authProvider as AuthProviderId | undefined) ||
        (token.startsWith('google_') ? 'google' : undefined);
      let profile = applyOwnerPremiumPolicy({
        ...defaultProfile,
        ...incoming,
        authProvider: inferredProvider ?? incoming.authProvider,
        followingUsernames: incoming.followingUsernames ?? [],
        followerUsernames: incoming.followerUsernames ?? [],
        outgoingFollowRequests: incoming.outgoingFollowRequests ?? [],
        // Purge notifs démo/test — seules les vraies (inbox/API) + produit waitlist
        socialNotifications: productNotifs,
        waitlistCalisthenics: false,
        ranked: normalizeRankedLadder(incoming.ranked ?? defaultProfile.ranked),
        integrations: normalizeIntegrations(
          incoming.integrations ?? defaultProfile.integrations,
        ),
      });
      if (isOwnerPremiumEmail(profile.email)) {
        profile = {
          ...profile,
          plan: ownerPremiumPlan(),
          premiumSource: 'owner',
          ranked: forceOwnerChampionRank(profile.ranked),
        };
      } else if (isPaidPremiumSource(profile.premiumSource)) {
        // Abonnement payant : ne pas toucher
      } else if (profile.premiumSource === 'gift' && isPremium(profile.plan)) {
        // Cadeau déjà sur le profil — conservé jusqu’à SYNC_PREMIUM_ENTITLEMENT
      }
      if (isPremium(profile.plan) && profile.ranked.relegationShieldsLeft == null) {
        profile = {
          ...profile,
          ranked: {
            ...profile.ranked,
            relegationShieldsLeft: PREMIUM_RELEGATION_SHIELDS,
          },
        };
      }
      return withReminders({
        ...emptyState(),
        ...action.state,
        clubs: action.state.clubs ?? [],
        profile,
        pending2faCode: null,
      });
    }
    case 'SYNC_PREMIUM_ENTITLEMENT': {
      if (isOwnerPremiumEmail(state.profile.email)) {
        return withReminders({
          ...state,
          profile: {
            ...state.profile,
            plan: ownerPremiumPlan(),
            premiumSource: 'owner',
            ranked: forceOwnerChampionRank(state.profile.ranked),
          },
        });
      }
      // Payant : l’owner ne peut rien retirer
      if (isPaidPremiumSource(state.profile.premiumSource)) {
        return state;
      }
      if (action.gifted) {
        return withReminders({
          ...state,
          profile: {
            ...state.profile,
            plan: ownerPremiumPlan(),
            premiumSource: 'gift',
            ranked: {
              ...state.profile.ranked,
              relegationShieldsLeft:
                state.profile.ranked.relegationShieldsLeft ?? PREMIUM_RELEGATION_SHIELDS,
            },
          },
        });
      }
      // Révoque uniquement si l’absence de cadeau est confirmée (API), pas si l’API est down
      if (action.confirmed !== false && state.profile.premiumSource === 'gift') {
        return withReminders({
          ...state,
          profile: {
            ...state.profile,
            plan: 'free',
            premiumSource: null,
            ranked: { ...state.profile.ranked, relegationShieldsLeft: 0 },
          },
        });
      }
      return state;
    }
    case 'APPLY_SUBSCRIPTION': {
      if (isOwnerPremiumEmail(state.profile.email)) {
        return withReminders({
          ...state,
          profile: {
            ...state.profile,
            plan: ownerPremiumPlan(),
            premiumSource: 'owner',
            subscription: {
              ...action.subscription,
              entitlement: 'premium',
              status: 'active',
            },
            ranked: forceOwnerChampionRank(state.profile.ranked),
          },
        });
      }
      // Ne pas écraser un gift actif par un sync « expired » sans paid
      if (
        state.profile.premiumSource === 'gift' &&
        action.subscription.entitlement !== 'premium'
      ) {
        return {
          ...state,
          profile: {
            ...state.profile,
            subscription: action.subscription,
          },
        };
      }
      const paid = action.subscription.entitlement === 'premium';
      return withReminders({
        ...state,
        profile: {
          ...state.profile,
          plan: action.plan,
          premiumSource: paid ? 'paid' : state.profile.premiumSource === 'gift' ? 'gift' : null,
          subscription: action.subscription,
          ranked: {
            ...state.profile.ranked,
            relegationShieldsLeft: paid
              ? state.profile.ranked.relegationShieldsLeft ?? PREMIUM_RELEGATION_SHIELDS
              : 0,
          },
        },
      });
    }
    case 'AUTH_WITH_PROVIDER': {
      const p = action.payload;
      const emailLocal = p.email.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'athlete';
      const provider: AuthProviderId =
        p.provider ||
        (p.token.startsWith('google_') ? 'google' : 'email');
      const grantOwner = isOwnerGooglePremiumGrant(p.email, provider);
      if (isOwnerPremiumEmail(p.email) && !grantOwner) {
        return emptyState();
      }
      const paid = p.premiumSource === 'paid';
      const gifted = Boolean(p.giftedPremium) && !paid;
      const plan = grantOwner || gifted || paid ? ownerPremiumPlan() : 'free';
      const premiumSource: PremiumSource | null = grantOwner
        ? 'owner'
        : paid
          ? 'paid'
          : gifted
            ? 'gift'
            : null;
      let ranked = {
        ...defaultProfile.ranked,
        ...(grantOwner || gifted || paid
          ? { relegationShieldsLeft: PREMIUM_RELEGATION_SHIELDS }
          : {}),
      };
      if (grantOwner) {
        ranked = forceOwnerChampionRank(ranked);
      }
      const fresh = buildFreshAccountState(p.token, {
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        email: p.email,
        username: p.username || emailLocal.slice(0, 20),
        emailVerified: true,
        onboardingCompleted: p.onboardingCompleted ?? false,
        authProvider: provider,
        plan,
        premiumSource,
        ranked,
        ...(p.country
          ? {
              country: p.country,
              countryLocked: p.countryLocked !== false,
            }
          : {}),
        ...(p.language ? { language: p.language } : {}),
      });
      return withReminders(
        grantOwner
          ? {
              ...fresh,
              profile: applyOwnerPremiumPolicy(fresh.profile),
            }
          : fresh,
      );
    }
    case 'COMPLETE_ONBOARDING': {
      const answers = action.answers;
      const digitalTwin =
        state.profile.digitalTwin ??
        defaultDigitalTwin({
          birthDate: state.profile.birthDate,
          level: answers.level,
        });
      return withReminders({
        ...state,
        plan: [],
        activities: [],
        analyses: [],
        feedbacks: [],
        profile: {
          ...state.profile,
          onboardingCompleted: true,
          onboarding: answers,
          digitalTwin,
        },
      });
    }
    case 'UPDATE_ONBOARDING': {
      const prev = state.profile.onboarding ?? {
        level: 'intermediaire' as const,
        goal: '10k' as const,
        trainingDays: [1, 3, 5],
        longRunDay: 6,
      };
      return {
        ...state,
        profile: {
          ...state.profile,
          onboarding: { ...prev, ...action.patch },
        },
      };
    }
    case 'RESCHEDULE_TRAINING_DAYS': {
      const today = new Date().toISOString().slice(0, 10);
      const onboarding = {
        ...(state.profile.onboarding ?? {
          level: 'intermediaire' as const,
          goal: '10k' as const,
          weeklyKmAvg: 25,
        }),
        trainingDays: [...action.trainingDays].sort((a, b) => a - b),
        longRunDay: action.longRunDay,
      };
      const completed = completedWorkoutIdsFromAnalyses(state.analyses);
      let plan = reschedulePlanToNewDays({
        plan: state.plan,
        fromDateIso: today,
        trainingDays: onboarding.trainingDays,
        longRunDay: onboarding.longRunDay,
        completedWorkoutIds: completed,
      });
      const gapFill = fillPlanGaps({
        plan,
        fromDateIso: today,
        onboarding,
        completedWorkoutIds: completed,
      });
      plan = gapFill.plan;
      const messages = [
        `Jours d'entraînement mis à jour — séances futures décalées.`,
        gapFill.message,
      ].filter(Boolean) as string[];
      return withReminders({
        ...state,
        plan,
        profile: { ...state.profile, onboarding },
        coachAdaptations: [...messages, ...(state.coachAdaptations ?? [])].slice(0, 12),
      });
    }
    case 'ADJUST_ACTIVE_PROGRAM': {
      const today = new Date().toISOString().slice(0, 10);
      const prevOb = state.profile.onboarding ?? {
        level: 'intermediaire' as const,
        goal: '10k' as const,
        trainingDays: [1, 3, 5],
        longRunDay: 6,
      };
      const onboarding = { ...prevOb, ...action.patch };
      if (action.patch.trainingDays) {
        onboarding.trainingDays = [...action.patch.trainingDays].sort(
          (a, b) => a - b,
        );
      }
      const completed = completedWorkoutIdsFromAnalyses(state.analyses);
      const messages: string[] = [];

      const daysChanged =
        action.patch.trainingDays != null || action.patch.longRunDay != null;
      const paceChanged =
        action.patch.recentTimeSec != null ||
        action.patch.vmaKmh != null ||
        action.patch.raceTimesSec != null ||
        action.patch.recentDistanceKm != null;

      let plan = state.plan;
      if (paceChanged) {
        const paced = rebuildFutureWorkoutPacing({
          plan,
          fromDateIso: today,
          completedWorkoutIds: completed,
          oldOnboarding: prevOb,
          newOnboarding: onboarding,
          activities: state.activities,
        });
        plan = paced.plan;
        if (paced.changed > 0) {
          messages.push(
            `Allures recalées sur ${paced.changed} séance${paced.changed > 1 ? 's' : ''} à venir.`,
          );
        } else {
          messages.push('Profil allure mis à jour.');
        }
      }
      if (daysChanged && onboarding.trainingDays?.length) {
        plan = reschedulePlanToNewDays({
          plan,
          fromDateIso: today,
          trainingDays: onboarding.trainingDays,
          longRunDay: onboarding.longRunDay ?? 6,
          completedWorkoutIds: completed,
        });
        const gapFill = fillPlanGaps({
          plan,
          fromDateIso: today,
          onboarding,
          completedWorkoutIds: completed,
        });
        plan = gapFill.plan;
        messages.push(`Jours mis à jour — séances futures décalées.`);
        if (gapFill.message) messages.push(gapFill.message);
      }

      return withReminders({
        ...state,
        plan,
        profile: { ...state.profile, onboarding },
        coachAdaptations: [...messages, ...(state.coachAdaptations ?? [])].slice(
          0,
          12,
        ),
      });
    }
    case 'CREATE_PROGRAM': {
      const { plan: newPlan, meta, answers } = buildProgramPlan(action.input);
      const catalogId = meta.catalogId ?? meta.id;
      const instanceId = createProgramInstanceId(catalogId);
      const programMeta = { ...meta, catalogId, id: instanceId };
      const tagged = tagPlanForProgram(newPlan, instanceId);
      const intentRamp = applyIntentStartupRamp(
        tagged,
        action.input.runIntent ??
          state.profile.onboarding?.runIntent ??
          answers.runIntent,
        { programId: instanceId },
      );
      const sleepRamp = applySleepStartupRamp(intentRamp.plan, state.health.sleepHistory, {
        brand: state.profile.watch?.brandId,
        startDateIso: programMeta.startedAt,
        programId: instanceId,
      });
      const twinForLoad =
        state.profile.digitalTwin ??
        defaultDigitalTwin({
          birthDate: state.profile.birthDate,
          level: answers.level ?? state.profile.onboarding?.level,
        });
      const loadSnap = computeAthleteLoadSnapshot({
        formTsb: banisterFormNow(state),
        health: state.health,
        activities: state.activities,
        feedbacks: state.feedbacks,
        plan: sleepRamp.plan,
        onboarding: { ...(state.profile.onboarding ?? {}), ...answers },
        twin: twinForLoad,
      });
      const loadRamp = applyAthleteLoadStartupRamp(sleepRamp.plan, loadSnap, {
        startDateIso: programMeta.startedAt.slice(0, 10),
        programId: instanceId,
      });
      const scheduleMode = action.scheduleMode ?? 'stack';
      const todayIso = new Date().toISOString().slice(0, 10);
      const prevActiveRaw = resolveActivePrograms(state.profile);
      const premiumUser = hasPremiumAccess({
        plan: state.profile.plan,
        subscription: state.profile.subscription,
        premiumSource: state.profile.premiumSource,
      });
      // Gratuit : un seul programme actif — refuse « stack » si déjà un plan
      if (
        shouldEnforceFreeLimits({
          plan: state.profile.plan,
          subscription: state.profile.subscription,
          premiumSource: state.profile.premiumSource,
        }) &&
        scheduleMode === 'stack' &&
        !canStackAnotherProgram(prevActiveRaw.length, premiumUser)
      ) {
        return state;
      }

      // Remplacer : abandonne les programmes actifs et retire leurs séances futures
      let basePlan = state.plan;
      let prevActive = prevActiveRaw;
      let historySeed = [...(state.profile.programHistory ?? [])];
      if (scheduleMode === 'replace' && prevActiveRaw.length > 0) {
        for (const cancelled of prevActiveRaw) {
          historySeed.unshift({
            ...cancelled,
            abandoned: true,
            abandonedAt: new Date().toISOString(),
            completedAt: undefined,
          });
          basePlan = removeFutureProgramSessions(basePlan, cancelled.id, todayIso);
        }
        prevActive = [];
        historySeed = historySeed.slice(0, 20);
      }

      let incoming = loadRamp.plan;
      if (scheduleMode === 'spread' && prevActive.length > 0) {
        incoming = spreadIncomingSessions(
          basePlan,
          incoming,
          action.input.trainingDays,
        );
      } else if (scheduleMode === 'stack' && prevActive.length > 0) {
        // Superposer : on garde les jours, mais on décale si 2 qualités / renfos collent
        incoming = rebalanceIncomingAgainstPlan(
          basePlan,
          incoming,
          action.input.trainingDays,
        );
      }
      const mergedPlan = applyConcurrentDaySoftening(
        mergeProgramPlans(basePlan, incoming),
      );

      const activePrograms = [...prevActive, programMeta];
      const usageId = isRankableProgramId(catalogId) ? catalogId : null;
      const scheduleNote =
        scheduleMode === 'replace' && prevActiveRaw.length > 0
          ? 'Nouveau programme : l’ancien a été remplacé.'
          : scheduleMode === 'spread' && prevActive.length > 0
            ? 'Nouveau programme : séances sur d’autres jours, avec repos entre les qualités et les renfos.'
            : scheduleMode === 'stack' && prevActive.length > 0
              ? 'Nouveau programme : superposé aux jours existants (séances allégées si besoin).'
              : null;
      const coachAdaptations = [
        scheduleNote,
        intentRamp.message,
        sleepRamp.message,
        loadRamp.message,
        ...(state.coachAdaptations ?? []),
      ]
        .filter(Boolean)
        .slice(0, 12) as string[];

      return (() => {
        const todayKey = calendarDayKey();
        const alreadyXpToday = state.profile.lastProgramCreateXpDay === todayKey;
        const countedIds = resolveUsageCountedIds(state.profile);
        const nextCounted =
          usageId && !countedIds.includes(usageId)
            ? [...countedIds, usageId]
            : countedIds;
        let nextProfile = withUsageIds(
          {
            ...state.profile,
            onboardingCompleted: true,
            onboarding: {
              ...(state.profile.onboarding ?? {}),
              ...answers,
            },
            activeProgram: programMeta,
            activePrograms,
            programHistory:
              scheduleMode === 'replace' ? historySeed : state.profile.programHistory,
            programsLaunchedCount: resolveProgramsLaunchedCount(state.profile) + 1,
            lastLoadPlanSyncKey: loadSnap.syncKey,
            digitalTwin:
              state.profile.digitalTwin ??
              defaultDigitalTwin({
                birthDate: state.profile.birthDate,
                level: answers.level ?? state.profile.onboarding?.level,
              }),
          },
          nextCounted,
        );
        const unlocked = applyBadgeUnlocks(
          { ...state, plan: mergedPlan, profile: nextProfile },
          state.profile.ranked,
          undefined,
          { awardXp: !alreadyXpToday },
        );
        if (!alreadyXpToday && unlocked.badgeXpAwarded > 0) {
          nextProfile = {
            ...nextProfile,
            lastProgramCreateXpDay: todayKey,
          };
        }
        return withReminders({
          ...state,
          plan: mergedPlan,
          coachAdaptations,
          profile: {
            ...nextProfile,
            ranked: unlocked.ranked,
            achievements: unlocked.achievements,
          },
        });
      })();
    }
    case 'CANCEL_PROGRAM': {
      const today = new Date().toISOString().slice(0, 10);
      const activeList = resolveActivePrograms(state.profile);
      const targetId =
        action.programId ??
        state.profile.activeProgram?.id ??
        activeList[activeList.length - 1]?.id;
      if (!targetId) return state;

      const cancelled = activeList.find((p) => p.id === targetId);
      const remaining = activeList.filter((p) => p.id !== targetId);
      const history = [...(state.profile.programHistory ?? [])];
      if (cancelled) {
        history.unshift({
          ...cancelled,
          abandoned: true,
          abandonedAt: new Date().toISOString(),
          completedAt: undefined,
        });
      }

      const plan = removeFutureProgramSessions(state.plan, targetId, today);
      const nextActive = remaining[remaining.length - 1];
      const cancelledCatalog = cancelled
        ? cancelled.catalogId ?? cancelled.id
        : null;
      const finishedIds = resolveUsageFinishedIds(state.profile);
      let countedIds = resolveUsageCountedIds(state.profile);
      if (
        isRankableProgramId(cancelledCatalog) &&
        !finishedIds.includes(cancelledCatalog)
      ) {
        const stillActiveSame = remaining.some(
          (p) => (p.catalogId ?? p.id) === cancelledCatalog,
        );
        if (!stillActiveSame) {
          countedIds = countedIds.filter((id) => id !== cancelledCatalog);
        }
      }

      return (() => {
        const nextProfile = withUsageIds(
          {
            ...state.profile,
            activeProgram: nextActive,
            activePrograms: remaining.length ? remaining : undefined,
            programHistory: history.slice(0, 20),
          },
          countedIds,
          finishedIds,
        );
        const unlocked = applyBadgeUnlocks(
          { ...state, plan, profile: nextProfile },
          state.profile.ranked,
          undefined,
          { awardXp: false },
        );
        return withReminders({
          ...state,
          plan,
          profile: {
            ...nextProfile,
            ranked: unlocked.ranked,
            achievements: unlocked.achievements,
          },
        });
      })();
    }
    case 'PRUNE_FINISHED_PROGRAM': {
      if (state.plan.length === 0) return state;
      const today = new Date().toISOString().slice(0, 10);
      const activeList = resolveActivePrograms(state.profile);
      if (activeList.some((p) => p.ongoing)) return state;

      const futureSessions = state.plan.filter(
        (w) => w.date >= today && w.discipline !== 'rest',
      );
      if (futureSessions.length > 0) return state;

      const history = [...(state.profile.programHistory ?? [])];
      const newlyFinishedIds: string[] = [];
      let onboarding = state.profile.onboarding;
      for (const prev of activeList) {
        if (!prev.completedAt) {
          history.unshift({
            ...prev,
            completedAt: new Date().toISOString(),
          });
          newlyFinishedIds.push(prev.id);
        }
        const timeSec = prev.currentBestTimeSec ?? prev.baselineTimeSec;
        const distKm = prev.baselineDistanceKm ?? prev.targetDistanceKm;
        if (typeof timeSec === 'number' && timeSec > 0 && distKm && distKm > 0) {
          onboarding =
            promoteChronoToOnboarding(onboarding, {
              distanceKm: distKm,
              timeSec,
              sport: prev.sportCategory,
            }) ?? onboarding;
        }
      }
      return (() => {
        // Garde l’historique passé — ne vide plus tout le calendrier
        const keptPlan = state.plan.filter((w) => w.date < today);
        const countedIds = resolveUsageCountedIds(state.profile);
        const finishedIds = new Set(resolveUsageFinishedIds(state.profile));
        for (const prev of activeList) {
          const cid = prev.catalogId ?? prev.id;
          if (isRankableProgramId(cid)) finishedIds.add(cid);
        }
        const nextProfile = withUsageIds(
          {
            ...state.profile,
            onboarding,
            activeProgram: undefined,
            activePrograms: undefined,
            programHistory: history.slice(0, 20),
            pendingProgramReviewId:
              newlyFinishedIds[0] ?? state.profile.pendingProgramReviewId ?? null,
          },
          countedIds,
          [...finishedIds],
        );
        const unlocked = applyBadgeUnlocks(
          { ...state, plan: keptPlan, profile: nextProfile },
          state.profile.ranked,
        );
        return withReminders({
          ...state,
          plan: keptPlan,
          coachAdaptations: [
            'Programme terminé — ton chrono de référence est enregistré pour le prochain cycle.',
            ...(state.coachAdaptations ?? []),
          ].slice(0, 12),
          profile: {
            ...nextProfile,
            ranked: unlocked.ranked,
            achievements: unlocked.achievements,
          },
        });
      })();
    }
    case 'SYNC_PROGRAM_USAGE': {
      const actives = resolveActivePrograms(state.profile);
      const counted = new Set(resolveUsageCountedIds(state.profile));
      const finished = resolveUsageFinishedIds(state.profile);
      let changed = state.profile.programUsageCountedIds == null;
      for (const p of actives) {
        const cid = p.catalogId ?? p.id;
        if (isRankableProgramId(cid) && !counted.has(cid)) {
          counted.add(cid);
          changed = true;
        }
      }
      if (!changed && state.profile.programUsageCountedIds != null) return state;
      return {
        ...state,
        profile: withUsageIds(state.profile, [...counted], finished),
      };
    }
    case 'UPDATE_PROFILE': {
      let patch = { ...action.patch };
      // Pays verrouillé : impossible de le changer pour gruger le national
      if (state.profile.countryLocked) {
        delete patch.country;
        delete patch.countryLocked;
      }
      // Impossible de s’auto-attribuer le Premium (sauf compte Google propriétaire)
      if (patch.plan != null && isPremium(patch.plan)) {
        if (!isOwnerPremiumEmail(state.profile.email)) {
          delete patch.plan;
          delete patch.premiumSource;
        }
      }
      if (patch.authProvider != null) {
        delete patch.authProvider;
      }
      if (patch.premiumSource === 'owner' && !isOwnerPremiumEmail(state.profile.email)) {
        delete patch.premiumSource;
      }
      // Empêcher de forger un abonnement « paid » depuis le client (sauf owner)
      if (patch.premiumSource === 'paid' && !isOwnerPremiumEmail(state.profile.email)) {
        delete patch.premiumSource;
      }
      let profile = applyOwnerPremiumPolicy({ ...state.profile, ...patch });
      if (isOwnerPremiumEmail(profile.email)) {
        profile = {
          ...profile,
          ranked: forceOwnerChampionRank(profile.ranked),
          plan: ownerPremiumPlan(),
          premiumSource: 'owner',
        };
      }
      if (action.patch.plan != null && patch.plan != null) {
        if (isPremium(profile.plan)) {
          if (profile.ranked.relegationShieldsLeft == null) {
            profile = {
              ...profile,
              ranked: {
                ...profile.ranked,
                relegationShieldsLeft: PREMIUM_RELEGATION_SHIELDS,
              },
            };
          }
        } else {
          profile = {
            ...profile,
            ranked: { ...profile.ranked, relegationShieldsLeft: 0 },
          };
        }
      }
      return withReminders({ ...state, profile });
    }
    case 'CONNECT_PROVIDER': {
      const integrations = state.profile.integrations.map((i) =>
        i.provider === action.provider
          ? {
              ...i,
              connected: !i.connected,
              lastSyncAt: !i.connected ? new Date().toISOString() : undefined,
            }
          : i,
      );
      return { ...state, profile: { ...state.profile, integrations } };
    }
    case 'SET_INTEGRATIONS': {
      const remote = new Map(action.integrations.map((i) => [i.provider, i]));
      const integrations = state.profile.integrations.map((i) => {
        if (i.provider !== 'garmin') return i;
        const hit = remote.get('garmin');
        if (!hit) return { ...i, connected: false, lastSyncAt: undefined };
        return {
          ...i,
          connected: hit.connected,
          lastSyncAt: hit.lastSyncAt,
        };
      });
      return { ...state, profile: { ...state.profile, integrations } };
    }
    case 'MARK_GARMIN_EXPORTED': {
      const w = state.plan.find((x) => x.id === action.workoutId);
      if (!w || w.discipline === 'rest') return state;
      const plan = state.plan.map((x) =>
        x.id === action.workoutId ? { ...x, exportedToGarmin: true } : x,
      );
      const integrations = state.profile.integrations.map((i) =>
        i.provider === 'garmin'
          ? { ...i, connected: true, lastSyncAt: new Date().toISOString() }
          : i,
      );
      return {
        ...state,
        plan,
        profile: { ...state.profile, integrations },
      };
    }
    case 'EXPORT_GARMIN': {
      // Conservé pour compatibilité — l’UI appelle exportWorkoutToGarmin + MARK_GARMIN_EXPORTED.
      return reducer(state, { type: 'MARK_GARMIN_EXPORTED', workoutId: action.workoutId });
    }
    case 'EXPORT_STRAVA': {
      const plan = state.plan.map((x) =>
        x.id === action.workoutId ? { ...x, exportedToStrava: true } : x,
      );
      return {
        ...state,
        plan,
      };
    }
    case 'INGEST_HEALTH': {
      // Consentement santé retiré : aucune nouvelle donnée n’est stockée tant qu’il n’est pas redonné.
      if (state.profile.healthDataConsent === false) return state;
      let health = action.health;
      if (health.sleep) {
        health = upsertSleepNight(
          { ...health, sleepHistory: health.sleepHistory ?? state.health.sleepHistory },
          health.sleep,
        );
      }
      return withReminders({ ...state, health });
    }
    case 'UPSERT_SLEEP': {
      if (state.profile.healthDataConsent === false) return state;
      const health = upsertSleepNight(state.health, action.night);
      const todayIso = action.night.date || new Date().toISOString().slice(0, 10);
      const target = findWorkoutToAdaptForSleep(state.plan, todayIso);
      const brand =
        action.night.source ?? state.profile.watch?.brandId ?? null;
      const sleepAction = decideSleepAdaptiveAction(action.night.score, brand);
      let plan = state.plan;
      let coachAdaptations = state.coachAdaptations;
      if (target && sleepAction.case !== 4) {
        const adapted = applySleepAdaptiveToWorkout(target, sleepAction, action.night.score);
        plan = state.plan.map((w) => (w.id === target.id ? adapted : w));
        const note = adapted.coachNote;
        if (note) {
          coachAdaptations = [note, ...(coachAdaptations ?? [])].slice(0, 12);
        }
      }
      const mid = withReminders({
        ...state,
        health,
        plan,
        coachAdaptations,
      });
      const unlocked = applyBadgeUnlocks(mid, mid.profile.ranked);
      return {
        ...mid,
        profile: {
          ...mid.profile,
          ranked: unlocked.ranked,
          achievements: unlocked.achievements,
        },
      };
    }
    case 'CLEAR_SLEEP': {
      const health = removeSleepNight(state.health, action.date);
      return withReminders({ ...state, health });
    }
    case 'WITHDRAW_HEALTH_CONSENT': {
      // RGPD — retrait du consentement santé : purge sommeil / HRV / FC repos / charge,
      // sans conséquence sur le reste de l’app (programme, activités, progrès conservés).
      return withReminders({ ...state, health: emptyHealth });
    }
    case 'SET_WATCH': {
      if (action.brandId == null) {
        return {
          ...state,
          profile: { ...state.profile, watch: null },
        };
      }
      return {
        ...state,
        profile: {
          ...state.profile,
          watch: { brandId: action.brandId, selectedAt: new Date().toISOString() },
        },
      };
    }
    case 'SIMULATE_STRAVA_SYNC': {
      const today = new Date().toISOString().slice(0, 10);
      const planned = state.plan.find((p) => p.date === today && p.discipline !== 'rest');
      const activity: StravaActivity = {
        id: `sim-${Date.now()}`,
        name: planned?.title ?? 'Séance libre',
        distanceM: planned?.plannedDistanceM ?? 8000,
        elapsedSec: planned?.plannedDurationSec ?? 3600,
        movingSec: (planned?.plannedDurationSec ?? 3600) - 120,
        startDate: new Date().toISOString(),
      };
      return reducer(state, { type: 'INGEST_STRAVA', activity, plannedId: planned?.id });
    }
    case 'INGEST_STRAVA': {
      if (findDuplicateActivity(action.activity, state.activities)) {
        return state;
      }
      const activityDay = action.activity.startDate.slice(0, 10);
      const linkedIds = new Set(state.analyses.map((a) => a.plannedWorkoutId));
      const skipPlan = action.linkPlan === false;
      const planned = skipPlan
        ? undefined
        : state.plan.find((p) => p.id === action.plannedId) ??
          // Même jour ET même sport, séance pas encore réalisée : la plus fiable.
          findPlannedForFreeActivity(state.plan, linkedIds, action.activity) ??
          state.plan.find((p) => p.date === activityDay && p.discipline !== 'rest') ??
          // Rattrapage : séance d’hier non encore liée
          (() => {
            const y = new Date(`${activityDay}T12:00:00`);
            y.setDate(y.getDate() - 1);
            const yIso = y.toISOString().slice(0, 10);
            return state.plan.find(
              (p) =>
                p.date === yIso &&
                p.discipline !== 'rest' &&
                !linkedIds.has(p.id),
            );
          })();
      let analyses = state.analyses;
      let plan = state.plan;
      let ranked = state.profile.ranked;
      let banister = state.banister;
      let lifetime = {
        totalKm: state.lifetime.totalKm + action.activity.distanceM / 1000,
        totalElevationM: state.lifetime.totalElevationM,
        totalSessions: state.lifetime.totalSessions + 1,
        totalHours: state.lifetime.totalHours + action.activity.movingSec / 3600,
        runKm: state.lifetime.runKm ?? state.lifetime.totalKm ?? 0,
        bikeKm: state.lifetime.bikeKm ?? 0,
        swimKm: state.lifetime.swimKm ?? 0,
      };
      const dKm = action.activity.distanceM / 1000;
      const sport = action.activity.sport;
      if (sport === 'bike') lifetime.bikeKm += dKm;
      else if (sport === 'swim') lifetime.swimKm += dKm;
      else if (sport !== 'strength') lifetime.runKm += dKm;
      let shoes = state.profile.shoes;
      let achievements = state.profile.achievements;
      let coachAdaptations = state.coachAdaptations;

      if (planned) {
        const compliance = computeCompliance(planned, action.activity);
        analyses = [
          ...analyses,
          {
            plannedWorkoutId: planned.id,
            activityId: action.activity.id,
            compliance,
            matchedBlocks: planned.steps.filter((s) => s.type === 'active').length,
          },
        ];
        const activityDay = action.activity.startDate.slice(0, 10);
        const isFirstSessionOfDay = !state.activities.some(
          (a) => a.id !== action.activity.id && a.startDate.slice(0, 10) === activityDay,
        );
        const xp = computeSessionXp({
          durationSec: action.activity.movingSec,
          distanceM: action.activity.distanceM,
          compliance: compliance.total,
          streakMultiplier: 1 + ranked.streakWeeks * 0.05,
          rpeSubmitted: false,
          isFirstSessionOfDay,
        });
        const sessionGain =
          xp.base + xp.complianceBonus + xp.streakBonus + xp.firstSessionBonus;
        ranked = applyXp(
          ranked,
          withPremiumXpBonus(sessionGain, isPremium(state.profile.plan)),
        );
        banister = applyBanisterLoad(
          state,
          banisterLoadFromSession(
            action.activity.movingSec,
            planned.expectedRpe ?? 6,
          ),
          action.activity.startDate.slice(0, 10),
          action.activity,
        );
        if (shoes[0]) {
          shoes = addShoeKm(shoes, shoes[0].id, action.activity.distanceM / 1000);
        }

        const loadHistory = [
          ...state.activities.map((a) => ({
            date: a.startDate.slice(0, 10),
            load: banisterLoadFromSession(a.movingSec, 6),
          })),
          {
            date: action.activity.startDate.slice(0, 10),
            load: banisterLoadFromSession(
              action.activity.movingSec,
              planned.expectedRpe ?? 6,
            ),
          },
        ];
        const acwr = computeAcwr(loadHistory, action.activity.startDate.slice(0, 10));

        const adaptive = decideAdaptiveAction({
          sleepScore: state.health.sleep?.score,
          sleepBrand: state.health.sleep?.source ?? state.profile.watch?.brandId,
          hrvDeltaPct: state.health.hrv?.deltaPct,
          compliance: compliance.total,
          expectedRpe: planned.expectedRpe,
          acwrForceRest: acwr.forceRest,
        });
        const tomorrowIdx = plan.findIndex((p) => p.date > planned.date);
        if (tomorrowIdx >= 0) {
          plan = plan.map((p, i) =>
            i === tomorrowIdx ? applyAdaptiveToWorkout(p, adaptive, state.health) : p,
          );
        }
      } else {
        banister = applyBanisterLoad(
          state,
          banisterLoadFromSession(action.activity.movingSec, 5),
          action.activity.startDate.slice(0, 10),
          action.activity,
        );
        const activityDay = action.activity.startDate.slice(0, 10);
        const isFirstSessionOfDay = !state.activities.some(
          (a) => a.id !== action.activity.id && a.startDate.slice(0, 10) === activityDay,
        );
        const xp = computeSessionXp({
          durationSec: action.activity.movingSec,
          distanceM: action.activity.distanceM,
          compliance: 70,
          streakMultiplier: 1 + ranked.streakWeeks * 0.05,
          rpeSubmitted: false,
          isFirstSessionOfDay,
        });
        const sessionGain = Math.round(xp.base * 0.85) + xp.firstSessionBonus;
        ranked = applyXp(
          ranked,
          withPremiumXpBonus(sessionGain, isPremium(state.profile.plan)),
        );
        if (shoes[0]) {
          shoes = addShoeKm(shoes, shoes[0].id, action.activity.distanceM / 1000);
        }

        const adaptation = adaptPlanAfterUnplannedActivity({
          plan,
          activity: action.activity,
          onboarding: state.profile.onboarding,
          completedWorkoutIds: completedWorkoutIdsFromAnalyses(analyses),
        });
        plan = adaptation.plan;
        coachAdaptations = adaptation.message
          ? [adaptation.message, ...(coachAdaptations ?? [])].slice(0, 12)
          : coachAdaptations;
      }

      const sessionHour = new Date(action.activity.startDate).getHours();
      ranked = applyKmOdysseyXp(
        ranked,
        lifetimeDistances(lifetime),
        isPremium(state.profile.plan),
      );
      const unlocked = applyBadgeUnlocks(
        { ...state, lifetime, feedbacks: state.feedbacks },
        ranked,
        sessionHour,
      );
      achievements = unlocked.achievements;
      ranked = unlocked.ranked;

      // Programme concerné : celui de la séance liée, sinon celui du même sport (multi-programmes).
      let activeProgram = pickProgramForActivity(
        resolveActivePrograms(state.profile),
        state.profile.activeProgram,
        planned,
        action.activity,
      );
      const prevBest = activeProgram?.currentBestTimeSec;
      let onboarding = state.profile.onboarding;
      if (activeProgram) {
        activeProgram = applyActivityToProgramProgress(activeProgram, action.activity);
        const ids = activeProgram.activityIds ?? [];
        if (!ids.includes(action.activity.id)) {
          activeProgram = {
            ...activeProgram,
            activityIds: [action.activity.id, ...ids].slice(0, 200),
          };
        }
        const nextBest = activeProgram.currentBestTimeSec;
        if (
          typeof nextBest === 'number' &&
          nextBest > 0 &&
          nextBest !== prevBest
        ) {
          const trackKm =
            activeProgram.baselineDistanceKm ?? activeProgram.targetDistanceKm;
          if (trackKm && trackKm > 0) {
            onboarding =
              promoteChronoToOnboarding(onboarding, {
                distanceKm: trackKm,
                timeSec: nextBest,
                sport: activeProgram.sportCategory,
              }) ?? onboarding;
          }
        }
      }

      const profileBase = {
        ...state.profile,
        ranked,
        shoes,
        achievements,
        onboarding,
        digitalTwin: state.profile.digitalTwin ?? resolveDigitalTwin(state),
      };
      const profile = activeProgram
        ? syncActiveProgramInProfile(profileBase, activeProgram)
        : profileBase;

      const twinForPred = profile.digitalTwin ?? resolveDigitalTwin({ profile });
      const sleepScore = state.health.sleep?.score;
      const readinessApprox =
        sleepScore != null
          ? Math.round((sleepScore + Math.max(0, Math.min(100, 50 + banisterFormNow(state)))) / 2)
          : Math.max(40, Math.min(90, 55 + banisterFormNow(state)));
      const pendingPredictedRpe = planned
        ? predictSessionRpe(planned, readinessApprox, twinForPred.response.rpeBias)
        : null;

      return withReminders({
        ...state,
        activities: [action.activity, ...state.activities],
        analyses,
        plan,
        banister,
        lifetime,
        pendingRpeActivityId: action.activity.id,
        pendingPredictedRpe,
        coachAdaptations,
        profile,
      });
    }
    case 'RECORD_PROGRAM_TEST_TIME': {
      const prog = state.profile.activeProgram;
      if (!prog) return state;
      const dist = action.distanceKm ?? prog.targetDistanceKm ?? prog.baselineDistanceKm ?? 5;
      const timeSec = Math.round(action.timeSec);
      if (timeSec < 60) return state;

      const next = { ...prog };
      if (!next.baselineTimeSec) {
        next.baselineTimeSec = timeSec;
        next.baselineDistanceKm = dist;
        next.currentBestTimeSec = timeSec;
        next.currentBestAt = new Date().toISOString();
      } else {
        const prev = next.currentBestTimeSec;
        if (prev == null || timeSec < prev) {
          next.currentBestTimeSec = timeSec;
          next.currentBestAt = new Date().toISOString();
        }
        if (!next.baselineDistanceKm) next.baselineDistanceKm = dist;
      }

      const onboarding =
        promoteChronoToOnboarding(state.profile.onboarding, {
          distanceKm: dist,
          timeSec,
          sport: next.sportCategory,
        }) ?? state.profile.onboarding;

      return withReminders({
        ...state,
        profile: {
          ...syncActiveProgramInProfile(state.profile, next),
          onboarding,
        },
      });
    }
    case 'SAVE_PROGRAM_REVIEW': {
      const history = [...(state.profile.programHistory ?? [])];
      const idx = history.findIndex(
        (p) =>
          p.id === action.programId &&
          p.startedAt === action.startedAt &&
          (!action.completedAt ||
            p.completedAt === action.completedAt),
      );
      if (idx < 0) return state;
      history[idx] = {
        ...history[idx],
        reviewFeeling: action.feeling,
        reviewComment: action.comment || undefined,
        reviewedAt: new Date().toISOString(),
      };
      const pending =
        state.profile.pendingProgramReviewId === action.programId
          ? null
          : state.profile.pendingProgramReviewId;
      return {
        ...state,
        profile: {
          ...state.profile,
          programHistory: history,
          pendingProgramReviewId: pending,
        },
      };
    }
    case 'SUBMIT_RPE': {
      const sid = action.feedback.sessionId;
      const already = state.feedbacks.some((f) => f.sessionId === sid);
      if (already) {
        return { ...state, pendingRpeActivityId: null, pendingPredictedRpe: null };
      }
      const ranked = applyXp(
        state.profile.ranked,
        withPremiumXpBonus(RPE_SUBMIT_XP, isPremium(state.profile.plan)),
      );
      const analysis = state.analyses.find(
        (a) =>
          a.plannedWorkoutId === action.feedback.sessionId ||
          a.activityId === action.feedback.sessionId,
      );
      const planned =
        state.plan.find((p) => p.id === sid) ??
        (analysis ? state.plan.find((p) => p.id === analysis.plannedWorkoutId) : undefined);

      const adaptive = decideAdaptiveAction({
        sleepScore: state.health.sleep?.score,
        sleepBrand: state.health.sleep?.source ?? state.profile.watch?.brandId,
        hrvDeltaPct: state.health.hrv?.deltaPct,
        rpe: action.feedback.rpe,
        expectedRpe: planned?.expectedRpe,
        // Sans analyse Strava : on reste neutre-positif pour laisser le RPE piloter
        compliance: analysis?.compliance.total ?? 100,
        muscle: action.feedback.muscle,
        acwrForceRest: (() => {
          const loads = state.activities.map((a) => ({
            date: a.startDate.slice(0, 10),
            load: banisterLoadFromSession(a.movingSec, action.feedback.rpe),
          }));
          return computeAcwr(loads, planned?.date ?? state.banister.date).forceRest;
        })(),
      });

      let plan = state.plan;
      const anchorDate = planned?.date;
      const nextIdx =
        anchorDate != null
          ? state.plan.findIndex(
              (p) => p.date > anchorDate && p.discipline !== 'rest' && !p.lockedRest,
            )
          : -1;
      let adaptationMsg: string | null = null;
      if (nextIdx >= 0) {
        const adapted = applyAdaptiveToWorkout(
          state.plan[nextIdx],
          adaptive,
          state.health,
        );
        plan = state.plan.map((p, i) => (i === nextIdx ? adapted : p));
        adaptationMsg =
          adapted.coachNote ??
          (adaptive.case !== 4
            ? 'Prochaine séance ajustée selon ton RPE.'
            : 'Feedback enregistré — plan maintenu pour l’instant.');
      }

      const twin = resolveDigitalTwin(state);
      const hrv = state.health.hrv;
      const observedHrvRatio =
        hrv && hrv.baseline7d > 0
          ? hrv.rmssdNight / hrv.baseline7d
          : hrv?.deltaPct != null
            ? 1 + hrv.deltaPct / 100
            : undefined;
      const predictedRpe =
        state.pendingPredictedRpe ??
        (planned
          ? predictSessionRpe(
              planned,
              state.health.sleep?.score ?? 65,
              twin.response.rpeBias,
            )
          : undefined);
      const learned = learnFromSession(twin, {
        predictedRpe,
        actualRpe: action.feedback.rpe,
        predictedFormTsb: banisterFormNow(state),
        observedHrvRatio,
        recoveryFeltVsExpected:
          action.feedback.mental === 'excellent'
            ? 0.5
            : action.feedback.mental === 'epuise'
              ? -0.6
              : 0,
      });
      const learnNote = learned.insight
        ? `Mova vient d’apprendre : ${learned.insight}`
        : null;

      const unlocked = applyBadgeUnlocks(
        {
          ...state,
          feedbacks: [...state.feedbacks, action.feedback],
        },
        ranked,
      );
      const coachAdaptations = [
        learnNote,
        adaptationMsg,
        ...(state.coachAdaptations ?? []),
      ]
        .filter(Boolean)
        .slice(0, 12) as string[];

      return withReminders(
        syncPlanToAthleteLoad({
          ...state,
          feedbacks: [...state.feedbacks, action.feedback],
          plan,
          coachAdaptations,
          pendingRpeActivityId: null,
          pendingPredictedRpe: null,
          profile: {
            ...state.profile,
            ranked: unlocked.ranked,
            achievements: unlocked.achievements,
            digitalTwin: learned.twin,
          },
        }),
      );
    }
    case 'COMPLETE_SESSION_DONE': {
      const sid = action.sessionId;
      const already = state.feedbacks.some((f) => f.sessionId === sid);
      if (already) return { ...state, pendingRpeActivityId: null };
      const ranked = applyXp(
        state.profile.ranked,
        withPremiumXpBonus(RPE_SUBMIT_XP, isPremium(state.profile.plan)),
      );
      const feedback: RpeFeedback = {
        sessionId: sid,
        rpe: 5,
        muscle: 'aucune_gene',
        mental: 'neutre',
        submittedAt: new Date().toISOString(),
      };
      const unlocked = applyBadgeUnlocks(
        {
          ...state,
          feedbacks: [...state.feedbacks, feedback],
        },
        ranked,
      );
      return withReminders({
        ...state,
        feedbacks: [...state.feedbacks, feedback],
        pendingRpeActivityId: null,
        coachAdaptations: [
          'Séance callisthénie validée — pas d’ajustement RPE.',
          ...(state.coachAdaptations ?? []),
        ].slice(0, 12),
        profile: {
          ...state.profile,
          ranked: unlocked.ranked,
          achievements: unlocked.achievements,
        },
      });
    }
    case 'DISMISS_RPE':
      return { ...state, pendingRpeActivityId: null, pendingPredictedRpe: null };
    case 'MOVE_WORKOUT':
      return {
        ...state,
        plan: state.plan.map((w) =>
          w.id === action.id ? { ...w, date: action.newDate } : w,
        ),
      };
    case 'ADD_WORKOUT': {
      if (state.plan.some((w) => w.id === action.workout.id)) return state;
      const plan = [...state.plan, action.workout].sort(
        (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
      );
      return { ...state, plan };
    }
    case 'REMOVE_WORKOUT':
      return {
        ...state,
        plan: state.plan.filter((w) => w.id !== action.id),
        coachAdaptations: [
          'Séance retirée du plan.',
          ...(state.coachAdaptations ?? []),
        ].slice(0, 12),
      };
    case 'UPDATE_WORKOUT':
      return {
        ...state,
        plan: state.plan.map((w) =>
          w.id === action.id ? { ...w, ...action.patch } : w,
        ),
      };
    case 'SET_PLAN':
      return { ...state, plan: action.plan };
    case 'REFRESH_REMINDERS':
      return withReminders(state);
    case 'FOLLOW_USER': {
      const u = action.username.trim().toLowerCase().replace(/^@/, '');
      if (!u || u === state.profile.username) return state;
      const following = state.profile.followingUsernames ?? [];
      if (following.includes(u)) return state;
      const outgoing = state.profile.outgoingFollowRequests ?? [];

      if (action.requiresApproval) {
        if (outgoing.includes(u)) return state;
        return {
          ...state,
          profile: {
            ...state.profile,
            outgoingFollowRequests: [...outgoing, u],
          },
        };
      }

      return (() => {
        const followingUsernames = [...following, u];
        const nextProfile = {
          ...state.profile,
          followingUsernames,
          following: (state.profile.following ?? 0) + 1,
          outgoingFollowRequests: outgoing.filter((x) => x !== u),
        };
        const unlocked = applyBadgeUnlocks(
          { ...state, profile: nextProfile },
          state.profile.ranked,
        );
        return {
          ...state,
          profile: {
            ...nextProfile,
            ranked: unlocked.ranked,
            achievements: unlocked.achievements,
          },
        };
      })();
    }
    case 'CANCEL_FOLLOW_REQUEST': {
      const u = action.username.trim().toLowerCase().replace(/^@/, '');
      const outgoing = state.profile.outgoingFollowRequests ?? [];
      return {
        ...state,
        profile: {
          ...state.profile,
          outgoingFollowRequests: outgoing.filter((x) => x !== u),
        },
      };
    }
    case 'UNFOLLOW_USER': {
      const u = action.username.trim().toLowerCase().replace(/^@/, '');
      const list = state.profile.followingUsernames ?? [];
      if (!list.includes(u)) return state;
      return {
        ...state,
        profile: {
          ...state.profile,
          followingUsernames: list.filter((x) => x !== u),
          following: Math.max(0, (state.profile.following ?? 0) - 1),
        },
      };
    }
    case 'LIKE_PROGRAM': {
      const owner = action.ownerUsername.trim().toLowerCase().replace(/^@/, '');
      const me = (state.profile.username ?? '').trim().toLowerCase();
      if (!owner || !action.programId || owner === me) return state;
      const key = programLikeKey(owner, action.programId);
      const liked = state.profile.likedProgramKeys ?? [];
      if (liked.includes(key)) return state;
      const ranked = applyXp(
        state.profile.ranked,
        withPremiumXpBonus(PROGRAM_LIKE_XP, isPremium(state.profile.plan)),
      );
      const likedProgramKeys = [...liked, key];
      const unlocked = applyBadgeUnlocks(
        {
          ...state,
          profile: { ...state.profile, ranked, likedProgramKeys },
        },
        ranked,
      );
      return {
        ...state,
        profile: {
          ...state.profile,
          ranked: unlocked.ranked,
          likedProgramKeys,
          achievements: unlocked.achievements,
        },
      };
    }
    case 'LIKE_SESSION': {
      const owner = action.ownerUsername.trim().toLowerCase().replace(/^@/, '');
      const me = (state.profile.username ?? '').trim().toLowerCase();
      if (!owner || !action.sessionId || owner === me) return state;
      const key = `sess:${owner}:${action.sessionId}`;
      const liked = state.profile.likedSessionKeys ?? [];
      if (liked.includes(key)) return state;
      const ranked = applyXp(
        state.profile.ranked,
        withPremiumXpBonus(SESSION_LIKE_XP, isPremium(state.profile.plan)),
      );
      const likedSessionKeys = [...liked, key];
      const unlocked = applyBadgeUnlocks(
        {
          ...state,
          profile: { ...state.profile, ranked, likedSessionKeys },
        },
        ranked,
      );
      return {
        ...state,
        profile: {
          ...state.profile,
          ranked: unlocked.ranked,
          likedSessionKeys,
          achievements: unlocked.achievements,
        },
      };
    }
    case 'DISMISS_PROGRAM_REVIEW_PROMPT':
      return {
        ...state,
        profile: { ...state.profile, pendingProgramReviewId: null },
      };
    case 'ACCEPT_FOLLOW_REQUEST': {
      const notifs = [...(state.profile.socialNotifications ?? [])];
      const idx = notifs.findIndex((n) => n.id === action.notificationId);
      if (idx < 0) return state;
      const n = notifs[idx];
      if (n.kind !== 'follow_request' || n.requestStatus !== 'pending') return state;
      notifs[idx] = { ...n, requestStatus: 'accepted', read: true };
      const followers = state.profile.followerUsernames ?? [];
      const nextFollowers = followers.includes(n.fromUsername)
        ? followers
        : [...followers, n.fromUsername];
      return (() => {
        const nextProfile = {
          ...state.profile,
          socialNotifications: notifs,
          followerUsernames: nextFollowers,
          followers: nextFollowers.length,
        };
        const unlocked = applyBadgeUnlocks(
          { ...state, profile: nextProfile },
          state.profile.ranked,
        );
        return {
          ...state,
          profile: {
            ...nextProfile,
            ranked: unlocked.ranked,
            achievements: unlocked.achievements,
          },
        };
      })();
    }
    case 'DECLINE_FOLLOW_REQUEST': {
      const notifs = [...(state.profile.socialNotifications ?? [])];
      const idx = notifs.findIndex((n) => n.id === action.notificationId);
      if (idx < 0) return state;
      const n = notifs[idx];
      notifs[idx] = { ...n, requestStatus: 'declined', read: true };
      return {
        ...state,
        profile: { ...state.profile, socialNotifications: notifs },
      };
    }
    case 'MARK_SOCIAL_READ': {
      const notifs = (state.profile.socialNotifications ?? []).map((n) => {
        if (action.notificationId && n.id !== action.notificationId) return n;
        if (!action.notificationId || n.id === action.notificationId) {
          return { ...n, read: true };
        }
        return n;
      });
      return {
        ...state,
        profile: { ...state.profile, socialNotifications: notifs },
      };
    }
    case 'PUSH_SOCIAL_NOTIFICATION': {
      return {
        ...state,
        profile: {
          ...state.profile,
          socialNotifications: prependSocialNotification(
            state.profile.socialNotifications ?? [],
            action.notification,
          ),
        },
      };
    }
    case 'SETTLE_LADDER_WEEK': {
      const prev = state.profile.ranked;
      let ranked = normalizeRankedLadder(prev);
      const current = ladderWeekKey();
      const premium = isPremium(state.profile.plan);
      let ladderTouched = false;
      if (!prev.ladderWeekKey) {
        ranked = {
          ...ranked,
          ladderWeekKey: current,
          relegationShieldsLeft: premium
            ? ranked.relegationShieldsLeft ?? PREMIUM_RELEGATION_SHIELDS
            : 0,
        };
        ladderTouched = true;
      } else if (ranked.ladderWeekKey !== current) {
        ranked = settleMissedLadderWeeks(ranked, action.place, { premium });
        ladderTouched = true;
      } else if (premium && ranked.relegationShieldsLeft == null) {
        ranked = { ...ranked, relegationShieldsLeft: PREMIUM_RELEGATION_SHIELDS };
        ladderTouched = true;
      }
      const withKm = applyKmOdysseyXp(ranked, lifetimeDistances(state.lifetime), premium);
      const kmTouched =
        (withKm.kmOdysseyLevelsPaid ?? 0) !== (prev.kmOdysseyLevelsPaid ?? 0) ||
        (withKm.kmOdysseyPaid?.bike ?? 0) !== (prev.kmOdysseyPaid?.bike ?? 0) ||
        (withKm.kmOdysseyPaid?.swim ?? 0) !== (prev.kmOdysseyPaid?.swim ?? 0) ||
        withKm.xp !== ranked.xp;
      const ownerChampion = isOwnerPremiumEmail(state.profile.email)
        ? forceOwnerChampionRank(withKm)
        : withKm;
      const championTouched =
        ownerChampion.tier !== withKm.tier ||
        ownerChampion.level !== withKm.level ||
        ownerChampion.division !== withKm.division;
      if (!ladderTouched && !kmTouched && !championTouched) {
        return state;
      }
      return {
        ...state,
        profile: { ...state.profile, ranked: ownerChampion },
      };
    }
    case 'CELEBRATE_LEVEL': {
      const lvl = Math.max(1, action.level);
      const prev = state.profile.ranked.lastCelebratedLevel ?? 0;
      if (lvl <= prev) return state;
      return {
        ...state,
        profile: {
          ...state.profile,
          ranked: {
            ...state.profile.ranked,
            lastCelebratedLevel: lvl,
          },
        },
      };
    }
    case 'CLAIM_DAILY_PRESENCE_XP': {
      if (!state.authToken || !state.profile.onboardingCompleted) return state;
      const { ranked, gained } = claimDailyPresenceXp(
        state.profile.ranked,
        todayIsoDate(),
      );
      if (gained <= 0) return state;
      return {
        ...state,
        profile: { ...state.profile, ranked },
      };
    }
    case 'LOCK_COMPETITIVE_COUNTRY': {
      const resolved = resolveLockedCountry({
        country: state.profile.country,
        countryLocked: state.profile.countryLocked,
      });
      if (!resolved.changed && state.profile.countryLocked) return state;
      const hadExplicitCountry = Boolean(state.profile.country?.trim());
      const nextLanguage =
        hadExplicitCountry && state.profile.language
          ? state.profile.language
          : localeFromCountry(resolved.country);
      return {
        ...state,
        profile: {
          ...state.profile,
          country: resolved.country,
          countryLocked: true,
          language: nextLanguage,
        },
      };
    }
    case 'SYNC_PLAN_TO_LOAD':
      return withReminders(syncPlanToAthleteLoad(state));
    case 'CLAIM_RANKING_REWARD': {
      const claimed = state.profile.ranked.rankingRewardsClaimed ?? [];
      if (claimed.some((c) => c.id === action.rewardId)) return state;
      let ranked = applyXp(
        state.profile.ranked,
        withPremiumXpBonus(action.xp, isPremium(state.profile.plan)),
      );
      if (action.shieldBonus && isPremium(state.profile.plan)) {
        const cur = ranked.relegationShieldsLeft ?? 0;
        ranked = {
          ...ranked,
          relegationShieldsLeft: Math.min(
            PREMIUM_RELEGATION_SHIELDS,
            cur + action.shieldBonus,
          ),
        };
      }
      ranked = {
        ...ranked,
        rankingRewardsClaimed: [
          ...claimed,
          {
            id: action.rewardId,
            claimedAt: new Date().toISOString(),
            weekKey: action.weekKey,
          },
        ].slice(-40),
      };
      return {
        ...state,
        profile: {
          ...state.profile,
          title: action.profileTitle ?? state.profile.title,
          ranked,
        },
      };
    }
    case 'CREATE_CLUB': {
      const name = action.name.trim();
      if (!name) return state;
      const me = state.profile.username.trim().toLowerCase();
      const display =
        [state.profile.firstName, state.profile.lastName].filter(Boolean).join(' ') ||
        me;
      const id =
        action.id?.trim() ||
        `club-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      if ((state.clubs ?? []).some((c) => c.id === id)) return state;
      const now = new Date().toISOString();
      const club: Club = {
        id,
        name,
        description: action.description.trim() || 'Groupe créé sur Mova.',
        city: action.city?.trim() || undefined,
        sportLabel: action.sportLabel?.trim() || undefined,
        visibility: action.visibility ?? 'public',
        createdAt: now,
        createdByUsername: me,
        members: [
          {
            username: me,
            displayName: display,
            role: 'owner',
            joinedAt: now,
          },
        ],
        posts: [
          {
            id: `${id}-welcome`,
            authorUsername: me,
            authorDisplayName: display,
            createdAt: now,
            kind: 'message',
            text: `Bienvenue dans ${name} — partagez séances, programmes et infos ici.`,
          },
        ],
      };
      return { ...state, clubs: [club, ...(state.clubs ?? [])] };
    }
    case 'JOIN_CATALOG_CLUB': {
      const catalog = CATALOG_CLUBS.find((c) => c.id === action.catalogId);
      if (!catalog) return state;
      const clubs = state.clubs ?? [];
      if (clubs.some((c) => c.id === catalog.id || c.catalogId === catalog.id)) {
        return state;
      }
      const me = state.profile.username.trim().toLowerCase();
      const display =
        [state.profile.firstName, state.profile.lastName].filter(Boolean).join(' ') ||
        me;
      const club = catalogClubToClub(catalog, { username: me, displayName: display });
      return { ...state, clubs: [club, ...clubs] };
    }
    case 'LEAVE_CLUB': {
      const clubs = state.clubs ?? [];
      const club = clubs.find((c) => c.id === action.clubId);
      if (!club) return state;
      const me = state.profile.username.trim().toLowerCase();
      if (!club.members.some((m) => m.username === me)) return state;
      // Local-first : quitter = retirer le club de mon appareil
      return { ...state, clubs: clubs.filter((c) => c.id !== action.clubId) };
    }
    case 'DELETE_CLUB': {
      const me = state.profile.username.trim().toLowerCase();
      const clubs = state.clubs ?? [];
      const club = clubs.find((c) => c.id === action.clubId);
      if (!club) return state;
      const isOwner = club.members.some((m) => m.username === me && m.role === 'owner');
      if (!isOwner && club.createdByUsername !== me) return state;
      return { ...state, clubs: clubs.filter((c) => c.id !== action.clubId) };
    }
    case 'POST_CLUB_MESSAGE': {
      const text = action.text.trim();
      if (!text) return state;
      return patchClubPost(state, action.clubId, {
        kind: 'message',
        text,
      });
    }
    case 'SHARE_ACTIVITY_TO_CLUB': {
      const activity = state.activities.find((a) => a.id === action.activityId);
      if (!activity) return state;
      const km = activity.distanceM
        ? Math.round((activity.distanceM / 1000) * 10) / 10
        : undefined;
      return patchClubPost(state, action.clubId, {
        kind: 'activity',
        text: action.note?.trim() || undefined,
        activityId: activity.id,
        activityTitle: activity.name,
        activityDistanceKm: km,
      });
    }
    case 'SHARE_PROGRAM_TO_CLUB': {
      if (!action.programId || !action.programTitle.trim()) return state;
      return patchClubPost(state, action.clubId, {
        kind: 'program',
        text: action.note?.trim() || undefined,
        programId: action.programId,
        programTitle: action.programTitle.trim(),
      });
    }
    default:
      return state;
  }
}

/** Discipline « ambiante » retenue après une action : la dernière discipline que l'utilisateur a choisie. */
export function lastSportAfter(next: AppState, action: Action): string | undefined {
  const key = (raw?: string | null, calis = false) => {
    if (!raw || raw === 'rest') return undefined;
    if (calis || raw === 'other') return 'calisthenics';
    return sportKeyFrom(raw);
  };
  switch (action.type) {
    case 'COMPLETE_ONBOARDING':
      return key(action.answers.sportCategory);
    case 'CREATE_PROGRAM':
      return key(next.profile.activeProgram?.sportCategory);
    case 'ADD_WORKOUT':
      return key(action.workout.discipline, isCalisthenicsWorkout(action.workout));
    default:
      return undefined;
  }
}

function reducer(state: AppState, action: Action): AppState {
  let next = reduceAppState(state, action);
  const sport = next === state ? undefined : lastSportAfter(next, action);
  if (sport && next.profile.lastSport !== sport) next = { ...next, profile: { ...next.profile, lastSport: sport } };
  return ensureOwnerAccountInvariants(next);
}

const initial: AppState = emptyState();

const Ctx = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
  sessionReady: boolean;
  sessionMeta: SessionMeta | null;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, initial);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta | null>(null);
  const hydrated = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const sessionMetaRef = useRef(sessionMeta);
  sessionMetaRef.current = sessionMeta;

  /** Dispatch + fan-out social ; flush immédiat sur mutations critiques. */
  const dispatch = useCallback((action: Action) => {
    const prev = stateRef.current;
    const next = reducer(prev, action);
    stateRef.current = next;
    rawDispatch(action);
    fanOutSocialSideEffect(action, prev);

    const critical =
      action.type === 'LOGOUT' ||
      action.type === 'INGEST_STRAVA' ||
      action.type === 'COMPLETE_SESSION_DONE' ||
      action.type === 'LOGIN' ||
      action.type === 'RESTORE_SESSION' ||
      action.type === 'ADJUST_ACTIVE_PROGRAM' ||
      action.type === 'RESCHEDULE_TRAINING_DAYS';
    if (!critical) return;
    const meta = sessionMetaRef.current;
    if (!meta?.rsid) return;
    if (!next.authToken) {
      void clearSession();
      return;
    }
    void saveSessionImmediate(meta.rsid, next, meta.deviceLabel);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const failSafe = setTimeout(() => {
      if (!cancelled) {
        hydrated.current = true;
        setSessionReady(true);
      }
    }, 4000);

    (async () => {
      try {
        const rsid = await getOrCreateRsid();
        const label = deviceLabel();
        const persisted = await loadSession();

        if (!cancelled && persisted && (await isSessionValidForDevice(persisted))) {
          await clearAllSocialInbox();
          dispatch({ type: 'RESTORE_SESSION', state: persisted.state });
          if (persisted.state.profile.onboardingCompleted) {
            void markOnboardingCompleted(
              persisted.state.profile.email,
              persisted.state.profile.username,
              persisted.state.profile.id,
            );
          }
          setSessionMeta({
            rsid,
            deviceLabel: persisted.deviceLabel,
            lastSavedAt: persisted.savedAt,
          });
        } else if (persisted) {
          await clearSession();
          if (!cancelled) {
            setSessionMeta({ rsid, deviceLabel: label });
          }
        } else if (!cancelled) {
          setSessionMeta({ rsid, deviceLabel: label });
        }
      } catch {
        // session locale indisponible → démarrer quand même (évite page blanche)
      }

      if (!cancelled) {
        hydrated.current = true;
        setSessionReady(true);
      }
      clearTimeout(failSafe);
    })();
    return () => {
      cancelled = true;
      clearTimeout(failSafe);
    };
  }, []);

  useEffect(() => {
    if (!sessionReady || !hydrated.current) return;
    dispatch({ type: 'PRUNE_FINISHED_PROGRAM' });
    dispatch({ type: 'SYNC_PROGRAM_USAGE' });
    dispatch({ type: 'SYNC_PLAN_TO_LOAD' });
  }, [sessionReady, dispatch]);

  /** Premium offert (liste owner) ↔ plan local — ne touche jamais un abonnement payant. */
  useEffect(() => {
    if (!sessionReady || !hydrated.current) return;
    if (!state.authToken || !state.profile.email) return;
    let cancelled = false;
    void (async () => {
      const status = await resolveGiftedPremiumStatus(
        state.profile.email,
        state.authToken,
      );
      if (!cancelled) {
        dispatch({
          type: 'SYNC_PREMIUM_ENTITLEMENT',
          gifted: status.gifted,
          confirmed: status.confirmed,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionReady, state.authToken, state.profile.email, dispatch]);

  /** Présence quotidienne → XP ligue (1× / jour). */
  useEffect(() => {
    if (!sessionReady || !hydrated.current) return;
    if (!state.authToken || !state.profile.onboardingCompleted) return;
    dispatch({ type: 'CLAIM_DAILY_PRESENCE_XP' });
  }, [
    sessionReady,
    state.authToken,
    state.profile.onboardingCompleted,
    state.profile.ranked.lastPresenceXpDate,
    dispatch,
  ]);

  /** Figé le pays compétitif (fuseau / locale) — une seule fois. */
  useEffect(() => {
    if (!sessionReady || !hydrated.current) return;
    if (!state.authToken || !state.profile.onboardingCompleted) return;
    dispatch({ type: 'LOCK_COMPETITIVE_COUNTRY' });
  }, [
    sessionReady,
    state.authToken,
    state.profile.onboardingCompleted,
    state.profile.countryLocked,
    dispatch,
  ]);

  /** Migre une URI temporaire (blob/cache) vers une data URI durable. */
  useEffect(() => {
    if (!sessionReady || !hydrated.current) return;
    const uri = state.profile.avatarUri;
    if (!uri || uri.startsWith('data:image/') || uri.startsWith('http')) return;
    let cancelled = false;
    void (async () => {
      try {
        const durable = await persistAvatarUri(uri);
        if (!cancelled && durable !== uri) {
          dispatch({ type: 'UPDATE_PROFILE', patch: { avatarUri: durable } });
        }
      } catch {
        if (!cancelled) {
          dispatch({ type: 'UPDATE_PROFILE', patch: { avatarUri: undefined } });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionReady, state.profile.avatarUri, dispatch]);

  useEffect(() => {
    if (!sessionReady || !isRemoteAuthToken(state.authToken)) return;
    void apiFetchIntegrations(state.authToken!).then((res) => {
      if (res.integrations) {
        dispatch({ type: 'SET_INTEGRATIONS', integrations: res.integrations });
      }
    });
  }, [sessionReady, state.authToken, dispatch]);

  useEffect(() => {
    if (!sessionReady || !hydrated.current || !sessionMeta?.rsid) return;

    if (state.authToken) {
      void saveSession(sessionMeta.rsid, state, sessionMeta.deviceLabel).then(() => {
        setSessionMeta((prev) =>
          prev ? { ...prev, lastSavedAt: new Date().toISOString() } : prev,
        );
      });
      if (state.profile.username) {
        void upsertRegistryUser(profileToRegistryUser(state.profile));
      }
    } else {
      void clearSession();
    }
  }, [state, sessionReady, sessionMeta?.rsid, sessionMeta?.deviceLabel]);

  useEffect(() => {
    return () => {
      void flushPendingSessionSave();
    };
  }, []);

  const value = useMemo(
    () => ({ state, dispatch, sessionReady, sessionMeta }),
    [state, sessionReady, sessionMeta],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function todayWorkout(plan: PlannedWorkout[]): PlannedWorkout | undefined {
  // Date LOCALE (et non UTC) : après minuit la « séance du jour » doit déjà être celle du nouveau jour.
  const d = toLocalDateIso(new Date());
  const today = plan.filter((w) => w.date === d);
  if (today.length === 0) return undefined;
  // Les séances rapides (adHoc) ne masquent jamais la séance prévue par le plan.
  return (
    today.find((w) => w.discipline !== 'rest' && !w.lockedRest && !w.adHoc) ??
    today.find((w) => !w.adHoc) ??
    today[0]
  );
}

/** Prochaine séance d’entraînement (aujourd’hui ou plus tard, hors repos) */
export function nextTrainingWorkout(
  plan: PlannedWorkout[],
  fromIso?: string,
): PlannedWorkout | undefined {
  const d = fromIso ?? toLocalDateIso(new Date());
  return (
    plan
      .filter((w) => w.date >= d && w.discipline !== 'rest' && !w.adHoc)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? undefined
  );
}

export function daysBetweenIso(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso + 'T12:00:00');
  const b = Date.parse(toIso + 'T12:00:00');
  return Math.round((b - a) / (24 * 3600 * 1000));
}

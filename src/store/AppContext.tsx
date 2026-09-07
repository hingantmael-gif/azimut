import React, {
  createContext,
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
  updateBanister,
} from '../engines/core';
import { upsertSleepNight, removeSleepNight, computeSleepStreak, sleepNightsLogged } from '../engines/sleepCalendar';
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
import {
  createProgramInstanceId,
  mergeProgramPlans,
  removeFutureProgramSessions,
  resolveActivePrograms,
  syncActiveProgramInProfile,
  tagPlanForProgram,
} from '../engines/multiProgramPlan';
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
  ladderWeekKey,
  normalizeRankedLadder,
  settleMissedLadderWeeks,
  PREMIUM_RELEGATION_SHIELDS,
} from '../engines/rankedSeason';
import { resolveLockedCountry } from '../engines/countryLock';
import { applyActivityToProgramProgress } from '../engines/programProgress';
import { isRankableProgramId } from '../engines/programPopularity';
import { findDuplicateActivity } from '../engines/activityDuplicate';
import {
  adaptPlanAfterUnplannedActivity,
  completedWorkoutIdsFromAnalyses,
  fillPlanGaps,
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
import {
  clearSession,
  isSessionValidForDevice,
  loadSession,
  saveSession,
  type PersistedAppState,
} from '../storage/sessionPersistence';
import { profileToRegistryUser, upsertRegistryUser } from '../storage/userRegistry';
import { persistAvatarUri } from '../utils/persistAvatar';
import { markOnboardingCompleted } from '../storage/onboardingPersistence';

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
      };
    }
  | { type: 'LOGOUT' }
  | { type: 'DELETE_ACCOUNT' }
  | { type: 'RESTORE_SESSION'; state: PersistedAppState }
  | { type: 'COMPLETE_ONBOARDING'; answers: OnboardingAnswers }
  | { type: 'UPDATE_ONBOARDING'; patch: Partial<OnboardingAnswers> }
  | { type: 'RESCHEDULE_TRAINING_DAYS'; trainingDays: number[]; longRunDay: number }
  | {
      type: 'CREATE_PROGRAM';
      input: ProgramBuildInput;
      /** stack = mêmes jours (allégés) · spread = répartir sur jours libres */
      scheduleMode?: 'stack' | 'spread';
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
  | { type: 'INGEST_STRAVA'; activity: StravaActivity; plannedId?: string }
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
  | { type: 'SET_WATCH'; brandId: WatchBrandId | null }
  | { type: 'SIMULATE_STRAVA_SYNC' }
  | { type: 'SUBMIT_RPE'; feedback: RpeFeedback }
  | { type: 'DISMISS_RPE' }
  | { type: 'MOVE_WORKOUT'; id: string; newDate: string }
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
  | {
      type: 'CLAIM_RANKING_REWARD';
      rewardId: string;
      xp: number;
      profileTitle?: string;
      shieldBonus?: number;
      weekKey: string;
    };

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
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
  };
}

function withReminders(state: AppState): AppState {
  const today = new Date().toISOString().slice(0, 10);
  const workout = state.plan.find((w) => w.date === today);
  const sessionDone = state.activities.some((a) => a.startDate.slice(0, 10) === today);
  return {
    ...state,
    reminders: buildDailyReminders(
      state.profile.notifications,
      Boolean(workout && workout.discipline !== 'rest'),
      sessionDone,
      state.health.sleep?.score,
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
    programHistoryCount: (state.profile.programHistory ?? []).length,
    sleepNights: sleepNightsLogged(sleepHistory),
    sleepStreak: computeSleepStreak(sleepHistory),
  };
}

/** Débloque badges + crédite l’XP selon difficulté (1 re-passe si XP débloque d’autres) */
function applyBadgeUnlocks(
  state: AppState,
  ranked: RankedProgress,
  sessionHour?: number,
): { achievements: Achievement[]; ranked: RankedProgress } {
  const premium = isPremium(state.profile.plan);
  let nextRanked = ranked;
  let workingState = state;

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
      return { achievements: result.achievements, ranked: nextRanked };
    }
    nextRanked = applyXp(nextRanked, withPremiumXpBonus(badgeXp, premium));
    workingState = {
      ...workingState,
      profile: { ...workingState.profile, ranked: nextRanked },
    };
    if (pass === 1) {
      return { achievements: result.achievements, ranked: nextRanked };
    }
  }
  return {
    achievements: workingState.profile.achievements,
    ranked: nextRanked,
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

function reducer(state: AppState, action: Action): AppState {
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
    case 'RESTORE_SESSION': {
      const incoming = action.state.profile;
      const profile = {
        ...defaultProfile,
        ...incoming,
        followingUsernames: incoming.followingUsernames ?? [],
        followerUsernames: incoming.followerUsernames ?? [],
        outgoingFollowRequests: incoming.outgoingFollowRequests ?? [],
        socialNotifications: trimSocialNotifications(
          incoming.socialNotifications && incoming.socialNotifications.length > 0
            ? incoming.socialNotifications
            : (defaultProfile.socialNotifications ?? []),
        ),
        ranked: normalizeRankedLadder(incoming.ranked ?? defaultProfile.ranked),
        integrations: normalizeIntegrations(
          incoming.integrations ?? defaultProfile.integrations,
        ),
      };
      return withReminders({
        ...emptyState(),
        ...action.state,
        profile,
        pending2faCode: null,
      });
    }
    case 'AUTH_WITH_PROVIDER': {
      const p = action.payload;
      const emailLocal = p.email.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'athlete';
      return withReminders(
        buildFreshAccountState(p.token, {
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          email: p.email,
          username: p.username || emailLocal.slice(0, 20),
          emailVerified: true,
          onboardingCompleted: p.onboardingCompleted ?? false,
        }),
      );
    }
    case 'COMPLETE_ONBOARDING': {
      return withReminders({
        ...state,
        plan: [],
        activities: [],
        analyses: [],
        feedbacks: [],
        profile: {
          ...state.profile,
          onboardingCompleted: true,
          onboarding: action.answers,
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
    case 'CREATE_PROGRAM': {
      const { plan: newPlan, meta, answers } = buildProgramPlan(action.input);
      const catalogId = meta.catalogId ?? meta.id;
      const instanceId = createProgramInstanceId(catalogId);
      const programMeta = { ...meta, catalogId, id: instanceId };
      const tagged = tagPlanForProgram(newPlan, instanceId);
      const sleepRamp = applySleepStartupRamp(tagged, state.health.sleepHistory, {
        brand: state.profile.watch?.brandId,
        startDateIso: programMeta.startedAt,
        programId: instanceId,
      });
      const scheduleMode = action.scheduleMode ?? 'stack';
      let incoming = sleepRamp.plan;
      if (scheduleMode === 'spread') {
        incoming = spreadIncomingSessions(
          state.plan,
          incoming,
          action.input.trainingDays,
        );
      } else if (resolveActivePrograms(state.profile).length > 0) {
        // Superposer : on garde les jours, mais on décale si 2 qualités / renfos collent
        incoming = rebalanceIncomingAgainstPlan(
          state.plan,
          incoming,
          action.input.trainingDays,
        );
      }
      const mergedPlan = applyConcurrentDaySoftening(
        mergeProgramPlans(state.plan, incoming),
      );

      const prevActive = resolveActivePrograms(state.profile);
      const activePrograms = [...prevActive, programMeta];
      const usageId = isRankableProgramId(catalogId) ? catalogId : null;
      const scheduleNote =
        scheduleMode === 'spread' && prevActive.length > 0
          ? 'Nouveau programme : séances sur d’autres jours, avec repos entre les qualités et les renfos.'
          : scheduleMode === 'stack' && prevActive.length > 0
            ? 'Nouveau programme : mêmes jours quand possible (allégés) ; qualités / renfos trop collés sont décalés.'
            : null;
      const coachAdaptations = [
        scheduleNote,
        sleepRamp.message,
        ...(state.coachAdaptations ?? []),
      ]
        .filter(Boolean)
        .slice(0, 12) as string[];

      return (() => {
        const nextProfile = {
          ...state.profile,
          onboardingCompleted: true,
          onboarding: {
            ...(state.profile.onboarding ?? {}),
            ...answers,
          },
          activeProgram: programMeta,
          activePrograms,
          programUsageCountedId: usageId,
        };
        const unlocked = applyBadgeUnlocks(
          { ...state, plan: mergedPlan, profile: nextProfile },
          state.profile.ranked,
        );
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
          completedAt: new Date().toISOString(),
        });
      }

      const plan = removeFutureProgramSessions(state.plan, targetId, today);
      const nextActive = remaining[remaining.length - 1];

      return (() => {
        const nextProfile = {
          ...state.profile,
          activeProgram: nextActive,
          activePrograms: remaining.length ? remaining : undefined,
          programHistory: history.slice(0, 20),
          programUsageCountedId: nextActive
            ? isRankableProgramId(nextActive.catalogId ?? nextActive.id)
              ? (nextActive.catalogId ?? nextActive.id)
              : null
            : null,
        };
        const unlocked = applyBadgeUnlocks(
          { ...state, plan, profile: nextProfile },
          state.profile.ranked,
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
      for (const prev of activeList) {
        if (!prev.completedAt) {
          history.unshift({
            ...prev,
            completedAt: new Date().toISOString(),
          });
          newlyFinishedIds.push(prev.id);
        }
      }
      return (() => {
        const nextProfile = {
          ...state.profile,
          activeProgram: undefined,
          activePrograms: undefined,
          programHistory: history.slice(0, 20),
          programUsageCountedId: null,
          pendingProgramReviewId:
            newlyFinishedIds[0] ?? state.profile.pendingProgramReviewId ?? null,
        };
        const unlocked = applyBadgeUnlocks(
          { ...state, plan: [], profile: nextProfile },
          state.profile.ranked,
        );
        return withReminders({
          ...state,
          plan: [],
          profile: {
            ...nextProfile,
            ranked: unlocked.ranked,
            achievements: unlocked.achievements,
          },
        });
      })();
    }
    case 'SYNC_PROGRAM_USAGE': {
      const active = state.profile.activeProgram;
      const current = state.profile.programUsageCountedId;
      if (current !== undefined) return state;
      if (!active || !isRankableProgramId(active.id)) {
        return {
          ...state,
          profile: { ...state.profile, programUsageCountedId: null },
        };
      }
      return {
        ...state,
        profile: { ...state.profile, programUsageCountedId: active.id },
      };
    }
    case 'UPDATE_PROFILE': {
      let patch = { ...action.patch };
      // Pays verrouillé : impossible de le changer pour gruger le national
      if (state.profile.countryLocked) {
        delete patch.country;
        delete patch.countryLocked;
      }
      let profile = { ...state.profile, ...patch };
      if (action.patch.plan != null) {
        if (isPremium(action.patch.plan)) {
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
      const planned =
        state.plan.find((p) => p.id === action.plannedId) ??
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
        banister = updateBanister(
          banister,
          banisterLoadFromSession(
            action.activity.movingSec,
            planned.expectedRpe ?? 6,
          ),
          action.activity.startDate.slice(0, 10),
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
        banister = updateBanister(
          banister,
          banisterLoadFromSession(action.activity.movingSec, 5),
          action.activity.startDate.slice(0, 10),
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

      let activeProgram = state.profile.activeProgram;
      if (activeProgram) {
        activeProgram = applyActivityToProgramProgress(activeProgram, action.activity);
        const ids = activeProgram.activityIds ?? [];
        if (!ids.includes(action.activity.id)) {
          activeProgram = {
            ...activeProgram,
            activityIds: [action.activity.id, ...ids].slice(0, 200),
          };
        }
      }

      const profileBase = { ...state.profile, ranked, shoes, achievements };
      const profile = activeProgram
        ? syncActiveProgramInProfile(profileBase, activeProgram)
        : profileBase;

      return withReminders({
        ...state,
        activities: [action.activity, ...state.activities],
        analyses,
        plan,
        banister,
        lifetime,
        pendingRpeActivityId: action.activity.id,
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

      return withReminders({
        ...state,
        profile: syncActiveProgramInProfile(state.profile, next),
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
        return { ...state, pendingRpeActivityId: null };
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
      let plan = state.plan;
      if (analysis) {
        const planned = state.plan.find((p) => p.id === analysis.plannedWorkoutId);
        const adaptive = decideAdaptiveAction({
          sleepScore: state.health.sleep?.score,
          sleepBrand: state.health.sleep?.source ?? state.profile.watch?.brandId,
          hrvDeltaPct: state.health.hrv?.deltaPct,
          rpe: action.feedback.rpe,
          expectedRpe: planned?.expectedRpe,
          compliance: analysis.compliance.total,
          muscle: action.feedback.muscle,
          acwrForceRest: (() => {
            const loads = state.activities.map((a) => ({
              date: a.startDate.slice(0, 10),
              load: banisterLoadFromSession(a.movingSec, action.feedback.rpe),
            }));
            return computeAcwr(loads, planned?.date ?? state.banister.date).forceRest;
          })(),
        });
        const nextIdx = state.plan.findIndex((p) => planned && p.date > planned.date);
        if (nextIdx >= 0) {
          plan = state.plan.map((p, i) =>
            i === nextIdx ? applyAdaptiveToWorkout(p, adaptive, state.health) : p,
          );
        }
      }
      const unlocked = applyBadgeUnlocks(
        {
          ...state,
          feedbacks: [...state.feedbacks, action.feedback],
        },
        ranked,
      );
      return withReminders({
        ...state,
        feedbacks: [...state.feedbacks, action.feedback],
        plan,
        pendingRpeActivityId: null,
        profile: {
          ...state.profile,
          ranked: unlocked.ranked,
          achievements: unlocked.achievements,
        },
      });
    }
    case 'DISMISS_RPE':
      return { ...state, pendingRpeActivityId: null };
    case 'MOVE_WORKOUT':
      return {
        ...state,
        plan: state.plan.map((w) =>
          w.id === action.id ? { ...w, date: action.newDate } : w,
        ),
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
      if (!ladderTouched && !kmTouched) {
        return state;
      }
      return {
        ...state,
        profile: { ...state.profile, ranked: withKm },
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
      return {
        ...state,
        profile: {
          ...state.profile,
          country: resolved.country,
          countryLocked: true,
        },
      };
    }
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
    default:
      return state;
  }
}

const initial: AppState = emptyState();

const Ctx = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
  sessionReady: boolean;
  sessionMeta: SessionMeta | null;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta | null>(null);
  const hydrated = useRef(false);

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
  }, [sessionReady, dispatch]);

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
  const d = new Date().toISOString().slice(0, 10);
  return plan.find((w) => w.date === d);
}

/** Prochaine séance d’entraînement (aujourd’hui ou plus tard, hors repos) */
export function nextTrainingWorkout(
  plan: PlannedWorkout[],
  fromIso?: string,
): PlannedWorkout | undefined {
  const d = fromIso ?? new Date().toISOString().slice(0, 10);
  return (
    plan
      .filter((w) => w.date >= d && w.discipline !== 'rest')
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? undefined
  );
}

export function daysBetweenIso(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso + 'T12:00:00');
  const b = Date.parse(toIso + 'T12:00:00');
  return Math.round((b - a) / (24 * 3600 * 1000));
}

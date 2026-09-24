import type { LivePaceStatus } from './liveWorkout';

/**
 * Coach vocal d'allure : décide QUAND parler, jamais trop (pas de bavardage) :
 * - trop rapide / trop lent depuis ≥ 5 s → « Ralentis » / « Accélère », répété toutes les 25 s si ça dure ;
 * - retour dans la zone après un écart → « Très bien, garde l'allure » ;
 * - dans la zone longtemps → un encouragement toutes les 90 s.
 */
export type PaceCoachState = {
  status: LivePaceStatus;
  since: number; // ms : depuis quand ce statut
  lastSpokeAt: number;
  wasOff: boolean; // on a dévié de la zone depuis le dernier « très bien »
};

export const initialPaceCoach = (now: number): PaceCoachState => ({ status: 'none', since: now, lastSpokeAt: -1e9, wasOff: false });

const OFF_DELAY_MS = 5_000;
const REPEAT_MS = 25_000;
const ENCOURAGE_MS = 90_000;

export function nextPaceCue(
  prev: PaceCoachState,
  status: LivePaceStatus,
  now: number,
): { state: PaceCoachState; say: string | null } {
  const state: PaceCoachState =
    status === prev.status ? { ...prev } : { ...prev, status, since: now };
  if (status === 'none') return { state, say: null };

  const held = now - state.since;
  const quiet = now - state.lastSpokeAt;

  if (status === 'too_fast' || status === 'too_slow') {
    state.wasOff = true;
    if (held >= OFF_DELAY_MS && quiet >= REPEAT_MS) {
      state.lastSpokeAt = now;
      return { state, say: status === 'too_fast' ? 'Ralentis' : 'Accélère' };
    }
    return { state, say: null };
  }

  // in_zone
  if (state.wasOff && held >= 2_000 && quiet >= 8_000) {
    state.wasOff = false;
    state.lastSpokeAt = now;
    return { state, say: 'Très bien, garde l’allure' };
  }
  if (held >= ENCOURAGE_MS && quiet >= ENCOURAGE_MS) {
    state.lastSpokeAt = now;
    return { state, say: 'Bien joué, continue comme ça' };
  }
  return { state, say: null };
}

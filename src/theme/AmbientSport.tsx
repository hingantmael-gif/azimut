import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useIsFocused } from 'expo-router';
import { todayWorkout, useApp } from '../store/AppContext';
import { sportKeyFrom, tintForSport, type SportTint } from './sportTints';

type Ctx = {
  sport: string;
  tint: SportTint;
  setOverride: (sport: string | null) => void;
};

/** Teinte fixe du fond de l'app. */
const BRAND_TINT: SportTint = tintForSport('run');

const AmbientContext = createContext<Ctx>({
  sport: 'run',
  tint: BRAND_TINT,
  setOverride: () => undefined,
});

/**
 * Sport « ambiant » : choisit le MOTIF du fond animé (la couleur, elle, ne change pas).
 * Par défaut = sport du programme actif (sinon séance du jour) ; un écran peut le remplacer
 * (assistant de programme, détail d'activité…) via `useAmbientSport`.
 */
export function AmbientSportProvider({ children }: { children: ReactNode }) {
  const { state } = useApp();
  const [override, setOverride] = useState<string | null>(null);

  const fallback = sportKeyFrom(
    state.profile.activeProgram?.sportCategory ?? todayWorkout(state.plan)?.discipline,
  );
  const sport = override ?? fallback;

  const value = useMemo<Ctx>(
    // La COULEUR du fond reste celle de la marque (jade / cyan) quel que soit le sport : seul le MOTIF change
    // (courbes, traînées, vagues, hexagones…). Un fond violet pour la muscu jurait avec le reste de l'app.
    () => ({ sport, tint: BRAND_TINT, setOverride }),
    [sport],
  );
  return <AmbientContext.Provider value={value}>{children}</AmbientContext.Provider>;
}

export function useAmbientTint(): SportTint {
  return useContext(AmbientContext).tint;
}

/** Clé du sport ambiant (choisit aussi la famille de motif du fond). */
export function useAmbientSportKey(): string {
  return useContext(AmbientContext).sport;
}

/** Impose le sport de l'écran affiché (pris en compte tant que l'écran est au premier plan). */
export function useAmbientSport(sport?: string | null) {
  const { setOverride } = useContext(AmbientContext);
  const focused = useIsFocused();
  const key = sport ? sportKeyFrom(sport) : null;
  useEffect(() => {
    if (!key || !focused) return;
    setOverride(key);
    return () => setOverride(null);
  }, [key, focused, setOverride]);
}

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

const AmbientContext = createContext<Ctx>({
  sport: 'run',
  tint: tintForSport('run'),
  setOverride: () => undefined,
});

/**
 * Sport « ambiant » : couleur, motif et animation du fond de toute l'app.
 * Par défaut = sport du programme actif (sinon séance du jour) ; un écran peut le remplacer
 * (assistant de programme, détail d'activité…) via `useAmbientSport`.
 */
export function AmbientSportProvider({ children }: { children: ReactNode }) {
  const { state } = useApp();
  const [override, setOverride] = useState<string | null>(null);

  // Fond « neutre » (jade + courbes) tant qu'aucun sport n'a été choisi ; ensuite : la DERNIÈRE discipline choisie
  // (inscription, programme créé, séance lancée) donne sa couleur, son motif et son animation à tous les écrans.
  const program = state.profile.activeProgram?.sportCategory;
  const sport =
    override ??
    state.profile.lastSport ??
    (program ? (program === 'other' ? 'calisthenics' : sportKeyFrom(program)) : 'run');

  const value = useMemo<Ctx>(
    () => ({ sport, tint: tintForSport(sport), setOverride }),
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
export function useAmbientSport(_sport?: string | null) {
  // Volontairement sans effet : le fond suit la DERNIÈRE discipline choisie, identique sur tous les écrans.
}
